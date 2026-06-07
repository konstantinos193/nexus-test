use anchor_lang::prelude::*;
use mpl_core::{
    instructions::{CreateCollectionV2CpiBuilder, CreateV2CpiBuilder, UpdateV2CpiBuilder},
    types::{FreezeDelegate, Plugin, PluginAuthority, PluginAuthorityPair, Royalty, RuleSet, Attributes},
    ID as MPL_CORE_ID,
};

use crate::{Collection, NexusError, METADATA_URI_MAX_LEN};

pub const COLLECTION_NAME_MAX_LEN: usize = 32;
pub const ASSET_NAME_MAX_LEN: usize = 32;
pub const ASSET_URI_MAX_LEN: usize = 128;

pub const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";

pub fn mint_authority_pda(collection: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[MINT_AUTHORITY_SEED, collection.as_ref()], program_id)
}

/// Create a Metaplex Core collection at `mint` using the program PDA as update authority.
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

    CreateCollectionV2CpiBuilder::new(mpl_core_program)
        .collection(mint)
        .update_authority(Some(mint_authority))
        .payer(payer)
        .system_program(system_program)
        .name(collection_name.to_string())
        .uri(metadata_uri.to_string())
        .invoke_signed(&[signer_seeds])?;
    Ok(())
}

/// Mint a Metaplex Core asset into an existing Core collection.
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

    let mut binding = CreateV2CpiBuilder::new(mpl_core_program);
    let mut builder = binding
        .asset(asset)
        .collection(Some(core_collection))
        .authority(Some(mint_authority))
        .payer(payer)
        .owner(Some(owner))
        .update_authority(Some(mint_authority))
        .system_program(system_program)
        .name(asset_name)
        .uri(asset_uri);

    if freeze {
        builder = builder.plugins(vec![PluginAuthorityPair {
            plugin: Plugin::FreezeDelegate(FreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::UpdateAuthority),
        }]);
    }

    builder.invoke_signed(&[signer_seeds])?;
    Ok(())
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

/// Enhanced Core collection creation with plugins
pub fn create_core_collection_with_plugins<'info>(
    collection_name: &str,
    metadata_uri: &str,
    mint: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    mpl_core_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
    royalty_basis_points: Option<u16>,
    rule_set: Option<Pubkey>,
) -> Result<()> {
    require!(collection_name.len() <= COLLECTION_NAME_MAX_LEN, NexusError::CollectionNameTooLong);
    require!(metadata_uri.len() <= METADATA_URI_MAX_LEN, NexusError::MetadataUriTooLong);
    require_keys_eq!(*mpl_core_program.key, MPL_CORE_ID, NexusError::InvalidMplCoreProgram);

    let signer_seeds: &[&[u8]] = &[MINT_AUTHORITY_SEED, mint.key.as_ref(), &[mint_authority_bump]];

    let mut builder = CreateCollectionV2CpiBuilder::new(mpl_core_program)
        .collection(mint)
        .update_authority(Some(mint_authority))
        .payer(payer)
        .system_program(system_program)
        .name(collection_name.to_string())
        .uri(metadata_uri.to_string());

    // Add royalty plugin if specified
    if let Some(bps) = royalty_basis_points {
        if bps > 0 {
            let royalty = Royalty {
                basis_points: bps,
                creators: vec![], // Will be updated later
                rule_set,
            };
            
            builder = builder.plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Royalty(royalty),
                authority: Some(PluginAuthority::UpdateAuthority),
            }]);
        }
    }

    builder.invoke_signed(&[signer_seeds])?;
    Ok(())
}

/// Enhanced Core asset minting with advanced plugins
pub fn mint_core_asset_with_plugins<'info>(
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
    attributes: Option<Vec<(String, String)>>,
    royalty_basis_points: Option<u16>,
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

    let mut builder = CreateV2CpiBuilder::new(mpl_core_program)
        .asset(asset)
        .collection(Some(core_collection))
        .authority(Some(mint_authority))
        .payer(payer)
        .owner(Some(owner))
        .update_authority(Some(mint_authority))
        .system_program(system_program)
        .name(asset_name)
        .uri(asset_uri);

    let mut plugins = Vec::new();

    // Add freeze delegate if requested
    if freeze {
        plugins.push(PluginAuthorityPair {
            plugin: Plugin::FreezeDelegate(FreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });
    }

    // Add attributes if provided
    if let Some(attrs) = attributes {
        let attribute_list = Attributes {
            attribute_list: attrs,
        };
        plugins.push(PluginAuthorityPair {
            plugin: Plugin::Attributes(attribute_list),
            authority: Some(PluginAuthority::UpdateAuthority),
        });
    }

    // Add royalty if specified
    if let Some(bps) = royalty_basis_points {
        if bps > 0 {
            let royalty = Royalty {
                basis_points: bps,
                creators: vec![], // Will be updated separately
                rule_set: None,
            };
            plugins.push(PluginAuthorityPair {
                plugin: Plugin::Royalty(royalty),
                authority: Some(PluginAuthority::UpdateAuthority),
            });
        }
    }

    if !plugins.is_empty() {
        builder = builder.plugins(plugins);
    }

    builder.invoke_signed(&[signer_seeds])?;
    Ok(())
}

/// Update Core asset plugins (for adding royalties after mint)
pub fn update_core_asset_royalties<'info>(
    asset: &AccountInfo<'info>,
    collection: &Collection,
    mint_authority: &AccountInfo<'info>,
    mpl_core_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
    royalty_basis_points: u16,
    creators: Vec<Pubkey>,
) -> Result<()> {
    require_keys_eq!(*mpl_core_program.key, MPL_CORE_ID, NexusError::InvalidMplCoreProgram);

    let signer_seeds: &[&[u8]] = &[
        MINT_AUTHORITY_SEED,
        collection.mint.as_ref(),
        &[mint_authority_bump],
    ];

    let royalty = Royalty {
        basis_points: royalty_basis_points,
        creators,
        rule_set: None,
    };

    UpdateV2CpiBuilder::new(mpl_core_program)
        .asset(asset)
        .authority(Some(mint_authority))
        .plugins(vec![PluginAuthorityPair {
            plugin: Plugin::Royalty(royalty),
            authority: Some(PluginAuthority::UpdateAuthority),
        }])
        .invoke_signed(&[signer_seeds])?;

    Ok(())
}

/// Batch freeze multiple Core assets
pub fn batch_freeze_core_assets<'info>(
    assets: &[AccountInfo<'info>],
    collection: &Collection,
    mint_authority: &AccountInfo<'info>,
    mpl_core_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
) -> Result<()> {
    require_keys_eq!(*mpl_core_program.key, MPL_CORE_ID, NexusError::InvalidMplCoreProgram);

    let signer_seeds: &[&[u8]] = &[
        MINT_AUTHORITY_SEED,
        collection.mint.as_ref(),
        &[mint_authority_bump],
    ];

    for asset in assets {
        UpdateV2CpiBuilder::new(mpl_core_program)
            .asset(asset)
            .authority(Some(mint_authority))
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::FreezeDelegate(FreezeDelegate { frozen: true }),
                authority: Some(PluginAuthority::UpdateAuthority),
            }])
            .invoke_signed(&[signer_seeds])?;
    }

    Ok(())
}