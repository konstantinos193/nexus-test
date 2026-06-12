use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_spl::token::spl_token;
use mpl_core::{
    instructions::{
        CreateCollectionV2, CreateCollectionV2InstructionArgs, CreateV2, CreateV2InstructionArgs,
    },
    types::{DataState, FreezeDelegate, Plugin, PluginAuthority, PluginAuthorityPair},
};

use crate::{Collection, NexusError, MPL_CORE_ID, METADATA_URI_MAX_LEN};

pub const COLLECTION_NAME_MAX_LEN: usize = 32;
pub const ASSET_NAME_MAX_LEN: usize = 32;
pub const ASSET_URI_MAX_LEN: usize = 128;

pub const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";

pub fn mint_authority_pda(collection: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[MINT_AUTHORITY_SEED, collection.as_ref()], program_id)
}

/// Create a Metaplex Core collection at `mint` using the program PDA as update authority.
///
/// NOTE: mpl-core's CpiBuilder hardcodes the instruction `program_id` to its compiled-in
/// `crate::MPL_CORE_ID` (the canonical CoREEN... address). On networks that host MPL Core at a
/// different address (see the `localnet` feature), that CPI would target an undeployed program.
/// So we build the instruction via the non-CPI builder, override `program_id` to our configured
/// `MPL_CORE_ID`, and `invoke_signed` it directly.
pub fn create_core_collection<'info>(
    collection_name: &str,
    metadata_uri: &str,
    mint: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    mpl_core_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
) -> Result<()> {
    require!(collection_name.len() <= COLLECTION_NAME_MAX_LEN, NexusError::CollectionNameTooLong);
    require!(metadata_uri.len() <= METADATA_URI_MAX_LEN, NexusError::MetadataUriTooLong);
    require_keys_eq!(*mpl_core_program.key, MPL_CORE_ID, NexusError::InvalidMplCoreProgram);

    let signer_seeds: &[&[u8]] = &[MINT_AUTHORITY_SEED, mint.key.as_ref(), &[mint_authority_bump]];

    let mut ix = CreateCollectionV2 {
        collection: *mint.key,
        update_authority: Some(*mint_authority.key),
        payer: *payer.key,
        system_program: *system_program.key,
    }
    .instruction(CreateCollectionV2InstructionArgs {
        name: collection_name.to_string(),
        uri: metadata_uri.to_string(),
        plugins: None,
        external_plugin_adapters: None,
    });
    ix.program_id = MPL_CORE_ID;

    invoke_signed(
        &ix,
        &[
            mint.clone(),
            mint_authority.clone(),
            payer.clone(),
            system_program.clone(),
            mpl_core_program.clone(),
        ],
        &[signer_seeds],
    )?;
    Ok(())
}

/// Mint a Metaplex Core asset into an existing Core collection.
///
/// Built manually (rather than via the mpl-core CpiBuilder) so the CPI targets the configured
/// `MPL_CORE_ID` instead of mpl-core's hardcoded canonical address — see create_core_collection.
pub fn mint_core_asset<'info>(
    collection: &Collection,
    asset_index: u64,
    asset: &AccountInfo<'info>,
    core_collection: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    mpl_core_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
    freeze: bool,
) -> Result<()> {
    require_keys_eq!(core_collection.key(), collection.mint, NexusError::Unauthorized);
    require_keys_eq!(mint_authority.key(), collection.mint_authority, NexusError::Unauthorized);
    require_keys_eq!(*mpl_core_program.key, MPL_CORE_ID, NexusError::InvalidMplCoreProgram);

    let asset_name = build_asset_name(asset_index)?;
    let asset_uri = build_asset_uri(&collection.metadata_uri, asset_index)?;

    let signer_seeds: &[&[u8]] = &[
        MINT_AUTHORITY_SEED,
        core_collection.key.as_ref(),
        &[mint_authority_bump],
    ];

    let plugins = if freeze {
        Some(vec![PluginAuthorityPair {
            plugin: Plugin::FreezeDelegate(FreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::UpdateAuthority),
        }])
    } else {
        None
    };

    let mut ix = CreateV2 {
        asset: *asset.key,
        collection: Some(*core_collection.key),
        authority: Some(*mint_authority.key),
        payer: *payer.key,
        owner: Some(*owner.key),
        update_authority: Some(*mint_authority.key),
        system_program: *system_program.key,
        log_wrapper: None,
    }
    .instruction(CreateV2InstructionArgs {
        data_state: DataState::AccountState,
        name: asset_name,
        uri: asset_uri,
        plugins,
        external_plugin_adapters: None,
    });
    ix.program_id = MPL_CORE_ID;

    invoke_signed(
        &ix,
        &[
            asset.clone(),
            core_collection.clone(),
            mint_authority.clone(),
            payer.clone(),
            owner.clone(),
            system_program.clone(),
            mpl_core_program.clone(),
        ],
        &[signer_seeds],
    )?;
    Ok(())
}

// Token Metadata program ID — same on mainnet, devnet, and testnet.
pub const TOKEN_METADATA_ID: Pubkey =
    Pubkey::from_str_const("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/// Mint a Legacy (Token Metadata) NFT:
///   create SPL mint → initialize → mint 1 → create metadata → create master edition → revoke mint authority
///
/// `buyer_ata` must be pre-created by the caller; pass an idempotent ATA creation
/// as a pre-instruction in the same transaction.
pub fn mint_legacy_asset<'info>(
    collection: &Collection,
    asset_index: u64,
    mint_account: &AccountInfo<'info>,
    metadata_account: &AccountInfo<'info>,
    master_edition_account: &AccountInfo<'info>,
    buyer_ata: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    buyer: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    token_metadata_program: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
) -> Result<()> {
    let signer_seeds: &[&[u8]] = &[
        MINT_AUTHORITY_SEED,
        collection.mint.as_ref(),
        &[mint_authority_bump],
    ];

    // 1. Allocate SPL Token mint account (82 bytes, rent-exempt).
    // spl_token::state::Mint::LEN = 82 — a stable constant; hardcoded to avoid Pack trait import.
    const SPL_MINT_LEN: u64 = 82;
    let mint_rent = Rent::get()?.minimum_balance(SPL_MINT_LEN as usize);
    invoke(
        &anchor_lang::solana_program::system_instruction::create_account(
            buyer.key,
            mint_account.key,
            mint_rent,
            SPL_MINT_LEN,
            &spl_token::ID,
        ),
        &[buyer.clone(), mint_account.clone(), system_program.clone()],
    )?;

    // 2. Initialize the mint: 0 decimals, PDA as mint authority, no freeze.
    invoke(
        &spl_token::instruction::initialize_mint2(
            &spl_token::ID,
            mint_account.key,
            mint_authority.key,
            None,
            0,
        )
        .map_err(|_| NexusError::NftMintNotImplemented)?,
        &[mint_account.clone(), token_program.clone()],
    )?;

    // 3. Mint exactly 1 token to the buyer's pre-created ATA.
    invoke_signed(
        &spl_token::instruction::mint_to(
            &spl_token::ID,
            mint_account.key,
            buyer_ata.key,
            mint_authority.key,
            &[],
            1,
        )
        .map_err(|_| NexusError::NftMintNotImplemented)?,
        &[
            mint_account.clone(),
            buyer_ata.clone(),
            mint_authority.clone(),
            token_program.clone(),
        ],
        &[signer_seeds],
    )?;

    // 4. Create Token Metadata account.
    let asset_name = build_asset_name(asset_index)?;
    let asset_uri = build_asset_uri(&collection.metadata_uri, asset_index)?;
    invoke_signed(
        &build_create_metadata_v3_ix(
            *metadata_account.key,
            *mint_account.key,
            *mint_authority.key,
            *buyer.key,
            asset_name,
            asset_uri,
            collection.creator_wallet,
        ),
        &[
            metadata_account.clone(),
            mint_account.clone(),
            mint_authority.clone(),
            buyer.clone(),
            mint_authority.clone(), // update_authority = same PDA
            system_program.clone(),
            token_metadata_program.clone(),
        ],
        &[signer_seeds],
    )?;

    // 5. Create Master Edition (max_supply = 0 → permanently 1-of-1).
    invoke_signed(
        &build_create_master_edition_v3_ix(
            *master_edition_account.key,
            *mint_account.key,
            *mint_authority.key,
            *buyer.key,
            *metadata_account.key,
        ),
        &[
            master_edition_account.clone(),
            mint_account.clone(),
            mint_authority.clone(), // update_authority
            mint_authority.clone(), // mint_authority
            buyer.clone(),
            metadata_account.clone(),
            token_program.clone(),
            system_program.clone(),
            token_metadata_program.clone(),
        ],
        &[signer_seeds],
    )?;

    // 6. Revoke mint authority so supply is permanently fixed at 1.
    invoke_signed(
        &spl_token::instruction::set_authority(
            &spl_token::ID,
            mint_account.key,
            None,
            spl_token::instruction::AuthorityType::MintTokens,
            mint_authority.key,
            &[],
        )
        .map_err(|_| NexusError::NftMintNotImplemented)?,
        &[mint_account.clone(), mint_authority.clone(), token_program.clone()],
        &[signer_seeds],
    )?;

    Ok(())
}

/// Builds a `CreateMetadataAccountsV3` instruction (discriminant 33).
/// update_authority is set to the same PDA as mint_authority.
fn build_create_metadata_v3_ix(
    metadata: Pubkey,
    mint: Pubkey,
    mint_authority: Pubkey,
    payer: Pubkey,
    name: String,
    uri: String,
    creator: Pubkey,
) -> Instruction {
    let mut data: Vec<u8> = Vec::with_capacity(256);
    data.push(33u8); // instruction discriminant

    // DataV2 (Borsh)
    push_borsh_string(&mut data, &name);
    push_borsh_string(&mut data, ""); // symbol — empty, updateable by creator
    push_borsh_string(&mut data, &uri);
    data.extend_from_slice(&0u16.to_le_bytes()); // seller_fee_basis_points
    // creators: Some(vec![Creator { address, verified: false, share: 100 }])
    data.push(1u8); // Some
    data.extend_from_slice(&1u32.to_le_bytes()); // vec len = 1
    data.extend_from_slice(creator.as_ref());
    data.push(0u8); // verified = false
    data.push(100u8); // share = 100%
    data.push(0u8); // collection: None
    data.push(0u8); // uses: None
    data.push(1u8); // is_mutable = true
    data.push(0u8); // collection_details: None

    Instruction {
        program_id: TOKEN_METADATA_ID,
        accounts: vec![
            AccountMeta::new(metadata, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new_readonly(mint_authority, true), // mint_authority signer
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(mint_authority, false), // update_authority
            AccountMeta::new_readonly(anchor_lang::solana_program::system_program::ID, false),
        ],
        data,
    }
}

/// Builds a `CreateMasterEditionV3` instruction (discriminant 17).
/// max_supply = Some(0) → 1-of-1 NFT.
fn build_create_master_edition_v3_ix(
    edition: Pubkey,
    mint: Pubkey,
    update_authority: Pubkey,
    payer: Pubkey,
    metadata: Pubkey,
) -> Instruction {
    let mut data: Vec<u8> = Vec::with_capacity(10);
    data.push(17u8); // instruction discriminant
    // max_supply: Some(0)
    data.push(1u8); // Some
    data.extend_from_slice(&0u64.to_le_bytes());

    Instruction {
        program_id: TOKEN_METADATA_ID,
        accounts: vec![
            AccountMeta::new(edition, false),
            AccountMeta::new(mint, false),
            AccountMeta::new_readonly(update_authority, true), // update_authority signer
            AccountMeta::new_readonly(update_authority, true), // mint_authority = same PDA
            AccountMeta::new(payer, true),
            AccountMeta::new(metadata, false),
            AccountMeta::new_readonly(spl_token::ID, false), // token_program
            AccountMeta::new_readonly(
                anchor_lang::solana_program::system_program::ID,
                false,
            ),
        ],
        data,
    }
}

#[inline]
fn push_borsh_string(buf: &mut Vec<u8>, s: &str) {
    let b = s.as_bytes();
    buf.extend_from_slice(&(b.len() as u32).to_le_bytes());
    buf.extend_from_slice(b);
}

#[inline]
fn build_asset_name(index: u64) -> Result<String> {
    // Pre-allocate with reasonable capacity to avoid reallocations
    let mut name = String::with_capacity(12); // Max: "#4294967295" (11 chars + 1 for #)
    name.push('#');
    name.push_str(&itoa::Buffer::new().format(index));
    require!(name.len() <= ASSET_NAME_MAX_LEN, NexusError::AssetNameTooLong);
    Ok(name)
}

#[inline]
fn build_asset_uri(base_uri: &str, index: u64) -> Result<String> {
    // Pre-allocate with reasonable capacity to avoid reallocations
    let mut uri = String::with_capacity(base_uri.len() + 20); // base + "/" + index + ".json"

    if base_uri.is_empty() {
        uri.push_str(&itoa::Buffer::new().format(index));
        uri.push_str(".json");
    } else if base_uri.ends_with('/') {
        uri.push_str(base_uri);
        uri.push_str(&itoa::Buffer::new().format(index));
        uri.push_str(".json");
    } else {
        uri.push_str(base_uri);
        uri.push('/');
        uri.push_str(&itoa::Buffer::new().format(index));
        uri.push_str(".json");
    };
    require!(uri.len() <= ASSET_URI_MAX_LEN, NexusError::AssetUriTooLong);
    Ok(uri)
}
