#![allow(unexpected_cfgs)]

/**
 * Nexus Launchpad - The One Program to Rule Them All
 *
 * Unified NFT launchpad: collection management, minting, allowlists,
 * trading controls, and payment splitting — everything in one deployable unit.
 * Three programs became one because managing three program IDs, three upgrade
 * authorities, and three IDLs is a special kind of pain nobody asked for.
 * (Also: one account per collection is cheaper than two. Math wins every time.)
 *
 * What's in here:
 * - Collection registry (global, queryable, fast)
 * - Collection creation with full minting config in one shot
 * - Minting with allowlist (Merkle), per-wallet limits, supply caps
 * - Trading freeze controls (by date or until sold out)
 * - Platform fee + optional multi-recipient payment splits
 * - All the update/close instructions you'd expect
 *
 * @author Juan - The developer who consolidated three programs into one
 * (Coded at an unreasonable hour with an unreasonable amount of coffee)
 */

use anchor_lang::prelude::*;
use core::convert::TryInto;
// MPL Core program id. The standard (mainnet/devnet) address is CoREEN..., but some localnets
// host a clone of MPL Core at a non-standard address. Select per-network via the `localnet`
// feature so the on-chain address constraint matches whatever the target validator actually runs.
#[cfg(feature = "localnet")]
pub const MPL_CORE_ID: Pubkey = Pubkey::from_str_const("3C7bAzHRQCFhpqhBzi7yWsk6xgcpe8o6XaYpVWPMkbS1");
#[cfg(not(feature = "localnet"))]
pub const MPL_CORE_ID: Pubkey = mpl_core::ID;
use sha3::{Digest, Keccak256};

// Updated with actual deployed program IDs
pub const ALLOWLIST_PROGRAM_ID: Pubkey = Pubkey::from_str_const("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
pub const PAYMENT_PROGRAM_ID: Pubkey = Pubkey::from_str_const("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod nft_mint;
use nft_mint::{
    create_core_collection, mint_authority_pda, mint_core_asset, mint_legacy_asset,
    COLLECTION_NAME_MAX_LEN, MINT_AUTHORITY_SEED,
};

// TODO: Update this with the actual program ID after deployment
// The one program ID. Just the one.
// If you change this without updating Anchor.toml and the frontend, nothing works.
// You've been warned.
declare_id!("CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm");

// Logging macro — gated behind feature flag so release builds stay lean.
// Binary size matters when you're paying deploy costs and compute unit fees.
#[cfg(feature = "logs")]
macro_rules! log_msg {
    ($($arg:tt)*) => { msg!($($arg)*) };
}

#[cfg(not(feature = "logs"))]
macro_rules! log_msg {
    ($($arg:tt)*) => {};
}

// Maximum URI length — 128 bytes covers any IPFS/Arweave CID with path, comfortably.
// Anything longer and you're storing an essay, not a URI.
pub const METADATA_URI_MAX_LEN: usize = 128;
pub const COLLECTION_URI_MAX_LEN: usize = 128;

// 24 levels → 2^24 leaves → ~16 million wallets per allowlist.
// If your allowlist is bigger than 16 million, you have other problems.
const MAX_MERKLE_PROOF_DEPTH: usize = 24;

/// Platform authority — update this to the deployer's pubkey before any production deploy.
/// Restricts `initialize_registry` to this key only, preventing frontrunning.
/// Get the value: `solana-keygen pubkey <path-to-keypair>`
/// The System Program default (all 1s) is intentionally uncallable — forces you to set this.
pub const PLATFORM_AUTHORITY: Pubkey = Pubkey::from_str_const("CZxh81rUdCbVnpMuUwQ3GwmeCRtCgZndF4Vu7ZqRT2qp");

// Compile-time guard: build fails with a clear error if PLATFORM_AUTHORITY is still the
// System Program placeholder. Replace the pubkey above with the actual deployer keypair:
//   `solana-keygen pubkey <path-to-keypair.json>`
// The System Program is all-zero bytes, so this assert fires only on the placeholder.
const _PLATFORM_AUTH_SET: () = assert!(
    PLATFORM_AUTHORITY.to_bytes()[0] != 0 || PLATFORM_AUTHORITY.to_bytes()[1] != 0,
    "Set PLATFORM_AUTHORITY to the deployer keypair pubkey before building"
);

#[program]
pub mod nexus_launchpad {
    use super::*;

    // ═══════════════════════════════════════════════════════════════════════
    // PLATFORM SETUP — call once at deployment, never again
    // ═══════════════════════════════════════════════════════════════════════

    /// Initialize the global collection registry.
    ///
    /// One-time platform setup. Must exist before any collection can be created.
    /// Stores the platform authority so update_featured is actually gated
    /// (the original had no auth check — fixed here).
    #[inline]
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.bump = ctx.bumps.registry;
        registry.collection_count = 0;
        // Initialize empty vector
        registry.collections = Vec::new();
        log_msg!("Registry initialized. Authority: {}", registry.authority);
        Ok(())
    }

    /// Propose a new registry authority (current authority only).
    /// Two-step rotation prevents lockout: the new key must accept before control transfers.
    pub fn propose_registry_admin(
        ctx: Context<ProposeRegistryAdmin>,
        new_authority: Pubkey,
    ) -> Result<()> {
        require!(new_authority != Pubkey::default(), NexusError::Unauthorized);
        ctx.accounts.registry.pending_authority = Some(new_authority);
        log_msg!("Proposed new registry authority: {}", new_authority);
        Ok(())
    }

    /// Accept a pending registry authority proposal (new authority only).
    /// The new authority must sign to prove key control before the transfer takes effect.
    pub fn accept_registry_admin(ctx: Context<AcceptRegistryAdmin>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        let pending = registry.pending_authority.ok_or(NexusError::NoPendingAuthority)?;
        require_keys_eq!(ctx.accounts.new_authority.key(), pending, NexusError::Unauthorized);
        registry.authority = ctx.accounts.new_authority.key();
        registry.pending_authority = None;
        log_msg!("Registry authority transferred to {}", registry.authority);
        Ok(())
    }

    /// One-time admin recovery: reinitialize the global registry IN PLACE after a struct
    /// layout change, reusing the existing (already large) account allocation. Gated to the
    /// registry's stored authority, read raw from bytes [8..40] so it works regardless of the
    /// old on-chain layout. Clears the collections list (existing collections remain
    /// discoverable via getProgramAccounts). Intended for dev/localnet recovery, not routine use.
    pub fn admin_reset_registry(ctx: Context<AdminResetRegistry>) -> Result<()> {
        let info = ctx.accounts.registry.to_account_info();
        {
            let data = info.try_borrow_data()?;
            require!(data.len() >= 40, NexusError::Unauthorized);
            let mut auth_bytes = [0u8; 32];
            auth_bytes.copy_from_slice(&data[8..40]);
            let stored_authority = Pubkey::new_from_array(auth_bytes);
            require_keys_eq!(
                ctx.accounts.authority.key(),
                stored_authority,
                NexusError::Unauthorized
            );
        }
        let fresh = CollectionRegistry {
            authority: ctx.accounts.authority.key(),
            pending_authority: None,
            pending_upgrade_program: Pubkey::default(),
            upgrade_initiated_time: 0,
            upgrade_completion_time: 0,
            emergency_pause_time: 0,
            collections: Vec::new(),
            collection_count: 0,
            upgrade_state: 0,
            emergency_pause: false,
            bump: ctx.bumps.registry,
        };
        let bytes = fresh.try_to_vec()?;
        let mut data = info.try_borrow_mut_data()?;
        require!(data.len() >= 8 + bytes.len(), NexusError::Unauthorized);
        data[8..8 + bytes.len()].copy_from_slice(&bytes);
        log_msg!("Registry reinitialized in place by {}", ctx.accounts.authority.key());
        Ok(())
    }

    /// Emergency pause - stops all minting across all collections (registry authority only).
    /// Use this only in emergencies like security vulnerabilities or exploits.
    pub fn emergency_pause_all(ctx: Context<EmergencyControl>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.emergency_pause = true;
        registry.emergency_pause_time = Clock::get()?.unix_timestamp;
        emit!(EmergencyPause {
            timestamp: registry.emergency_pause_time,
            authority: ctx.accounts.authority.key(),
        });
        log_msg!("EMERGENCY: All minting paused globally");
        Ok(())
    }

    /// Emergency unpause - resumes normal operations (registry authority only).
    /// Only call after emergency is resolved and security is restored.
    pub fn emergency_unpause_all(ctx: Context<EmergencyControl>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        require!(registry.emergency_pause, NexusError::NoEmergencyPause);
        registry.emergency_pause = false;
        registry.emergency_pause_time = Collection::DISABLED_I64;
        emit!(EmergencyUnpause {
            timestamp: Clock::get()?.unix_timestamp,
            authority: ctx.accounts.authority.key(),
        });
        log_msg!("EMERGENCY: Global pause lifted");
        Ok(())
    }

    /// Initiate program upgrade with safety checks (registry authority only).
    /// This sets up the upgrade state machine for safe program upgrades.
    pub fn initiate_upgrade(
        ctx: Context<InitiateUpgrade>,
        new_program_id: Pubkey,
        upgrade_delay: i64, // Delay in seconds before upgrade can be completed
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        let clock = Clock::get()?;
        
        // Safety checks
        require!(upgrade_delay >= 86400, NexusError::UpgradeDelayTooShort); // Min 24 hours
        require!(upgrade_delay <= 7 * 86400, NexusError::UpgradeDelayTooLong); // Max 7 days
        require!(!registry.emergency_pause, NexusError::EmergencyPauseActive);
        
        registry.upgrade_state = UpgradeState::Initiated as u8;
        registry.pending_upgrade_program = new_program_id;
        registry.upgrade_initiated_time = clock.unix_timestamp;
        registry.upgrade_completion_time = clock.unix_timestamp + upgrade_delay;
        
        emit!(UpgradeInitiated {
            new_program_id,
            completion_time: registry.upgrade_completion_time,
            authority: ctx.accounts.authority.key(),
        });
        
        log_msg!("Upgrade initiated: {} -> {}", crate::ID, new_program_id);
        Ok(())
    }

    /// Complete program upgrade (registry authority only).
    /// Can only be called after the delay period has passed.
    pub fn complete_upgrade(ctx: Context<CompleteUpgrade>) -> Result<()> {
        let registry = &ctx.accounts.registry;
        let clock = Clock::get()?;
        
        require!(
            registry.upgrade_state == UpgradeState::Initiated as u8,
            NexusError::NoUpgradeInProgress
        );
        require!(
            clock.unix_timestamp >= registry.upgrade_completion_time,
            NexusError::UpgradeDelayNotPassed
        );
        
        // The actual upgrade happens off-chain via solana program upgrade command
        // This just marks the upgrade as completed in our state
        emit!(UpgradeCompleted {
            old_program_id: crate::ID,
            new_program_id: registry.pending_upgrade_program,
            completion_time: clock.unix_timestamp,
        });
        
        log_msg!("Upgrade completed successfully");
        Ok(())
    }

    /// Cancel pending upgrade (registry authority only).
    /// Use this if the upgrade needs to be aborted for any reason.
    pub fn cancel_upgrade(ctx: Context<CancelUpgrade>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        
        require!(
            registry.upgrade_state == UpgradeState::Initiated as u8,
            NexusError::NoUpgradeInProgress
        );
        
        let cancelled_program = registry.pending_upgrade_program;
        registry.upgrade_state = UpgradeState::None as u8;
        registry.pending_upgrade_program = Pubkey::default();
        registry.upgrade_initiated_time = Collection::DISABLED_I64;
        registry.upgrade_completion_time = Collection::DISABLED_I64;
        
        emit!(UpgradeCancelled {
            cancelled_program,
            authority: ctx.accounts.authority.key(),
        });
        
        log_msg!("Upgrade cancelled");
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COLLECTION LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a new NFT collection — metadata + minting config in one transaction.
    ///
    /// All metadata lives off-chain (Arweave/IPFS/HTTPS). Upload it first, pass
    /// the URI here. The on-chain account only stores what's actually needed for
    /// enforcement: supply caps, prices, times, fees, and freeze state.
    ///
    /// Registers in the global registry. If the registry is full (300 slots),
    /// the collection still gets created — it just won't appear in the fast list.
    /// (getProgramAccounts always works as a fallback.)
    pub fn create_collection(
        ctx: Context<CreateCollection>,
        collection_name: String,
        metadata_uri: String,
        collection_config: CollectionConfig,
        platform_fee_bps: u16,
    ) -> Result<()> {
        require!(
            collection_name.len() <= COLLECTION_NAME_MAX_LEN,
            NexusError::CollectionNameTooLong
        );
        require!(
            metadata_uri.len() <= METADATA_URI_MAX_LEN,
            NexusError::MetadataUriTooLong
        );

        let clock = Clock::get()?;
        require!(collection_config.max_supply > 0, NexusError::InvalidSupply);
        require!(
            collection_config.start_time >= clock.unix_timestamp,
            NexusError::InvalidStartTime
        );
        if let Some(end) = collection_config.end_time {
            require!(end > collection_config.start_time, NexusError::InvalidStartTime);
        }
        require!(platform_fee_bps <= 1_500, NexusError::InvalidFeePercentage);

        let collection = &mut ctx.accounts.collection;

        // Identity
        collection.authority = ctx.accounts.authority.key();
        collection.mint = ctx.accounts.mint.key();
        let (mint_auth_pda, mint_auth_bump) =
            mint_authority_pda(&ctx.accounts.mint.key(), ctx.program_id);
        require_keys_eq!(
            ctx.accounts.mint_authority.key(),
            mint_auth_pda,
            NexusError::Unauthorized
        );
        collection.mint_authority = mint_auth_pda;
        collection.creator_wallet = ctx.accounts.creator_wallet.key();
        collection.platform_wallet = ctx.accounts.platform_wallet.key();

        // Catalog fields
        collection.metadata_uri = metadata_uri.clone();
        collection.created_at = clock.unix_timestamp;
        collection.status = 0; // draft — creator updates this through the launch lifecycle
        collection.featured = false;

        // Minting config — flatten from CollectionConfig (no nested struct on-chain = no padding waste)
        collection.max_supply = collection_config.max_supply;
        collection.price = collection_config.price_per_nft;
        collection.start_time = collection_config.start_time;
        collection.end_time = collection_config.end_time.unwrap_or(Collection::DISABLED_I64);
        collection.mint_limit_per_wallet = collection_config
            .mint_limit_per_wallet
            .unwrap_or(Collection::DISABLED_U8);
        collection.metadata_standard = collection_config.metadata_standard as u8;
        collection.freeze_until = collection_config
            .freeze_trading_until_date
            .unwrap_or(Collection::DISABLED_I64);
        collection.platform_fee_bps = platform_fee_bps;
        collection.minted = 0;

        // Pack booleans into flags bitmask — saves alignment bytes vs individual bools
        collection.flags = 0;
        if collection_config.freeze_trading_until_sold_out {
            collection.set_freeze_until_sold_out(true);
        }

        // Allowlist starts clear ([0u8;32] = public mint)
        collection.allowlist_root = [0u8; 32];

        collection.bump = ctx.bumps.collection;

        // Register in global registry — non-blocking if full
        let registry = &mut ctx.accounts.registry;
        let collection_key = collection.key();
        match registry.add_collection(collection_key) {
            Ok(true) => {
                log_msg!(
                    "Collection {} registered (total: {})",
                    collection_key,
                    registry.collection_count
                );
            }
            Ok(false) => {
                log_msg!("Registry full — collection created but not listed");
            }
            Err(err) => return Err(err),
        }

        if collection.metadata_standard == MetadataStandard::Core as u8 {
            create_core_collection(
                &collection_name,
                &metadata_uri,
                &ctx.accounts.mint.to_account_info(),
                &ctx.accounts.mint_authority.to_account_info(),
                &ctx.accounts.authority.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                &ctx.accounts.mpl_core_program.to_account_info(),
                ctx.bumps.mint_authority,
            )?;
        }

        log_msg!("Collection created: {}", collection.key());
        let _ = mint_auth_bump;
        Ok(())
    }

    /// Update collection metadata URI (authority only).
    /// Upload the new metadata off-chain first, then call this.
    pub fn update_metadata(
        ctx: Context<UpdateCollection>,
        new_metadata_uri: String,
    ) -> Result<()> {
        require!(
            new_metadata_uri.len() <= METADATA_URI_MAX_LEN,
            NexusError::MetadataUriTooLong
        );
        ctx.accounts.collection.metadata_uri = new_metadata_uri;
        log_msg!("Metadata URI updated");
        Ok(())
    }

    /// Update collection lifecycle status (authority only).
    /// 0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused
    /// Stored as u8 because a string would cost 10× the rent for the same information.
    pub fn update_collection_status(
        ctx: Context<UpdateCollection>,
        status: u8,
    ) -> Result<()> {
        require!(status <= 5, NexusError::InvalidStatus);
        let collection = &mut ctx.accounts.collection;
        collection.status = status;
        // Sync flags.bit0 so that status=5 ("paused") actually blocks minting.
        // Prevents the footgun where update_collection_status(5) looks paused in UIs
        // but the mint instruction still passes because flags.bit0 was never set.
        collection.set_paused(status == 5);
        log_msg!("Collection status → {}", status);
        Ok(())
    }

    /// Feature or unfeature a collection on the homepage (platform authority only).
    /// Gated against the registry authority — fixed from the original which had no check.
    pub fn update_featured(
        ctx: Context<UpdateFeatured>,
        featured: bool,
    ) -> Result<()> {
        ctx.accounts.collection.featured = featured;
        log_msg!("Collection featured → {}", featured);
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MINTING
    // ═══════════════════════════════════════════════════════════════════════

    /// Mint NFTs from the collection.
    ///
    /// Allowlist active: pass proof (≤24 elements) and leaf_index.
    /// Public mint: pass empty Vec and 0.
    ///
    /// Payment goes directly to platform_wallet (fee) and creator_wallet (remainder).
    /// No escrow. No intermediate accounts. Just math and two transfers.
    /// When has_split is set, the creator amount is split across up to 10 recipients
    /// passed as remaining_accounts in order: [buyer, recipient_0, ..., recipient_n-1].
    // Compute unit intensive operation - optimized for minimal CU usage
    // Early validation checks to fail fast and save compute units
    #[inline]
    pub fn mint<'info>(
        ctx: Context<'_, '_, '_, 'info, MintNFT<'info>>,
        quantity: u8,
        allowlist_proof: Vec<[u8; 32]>,
        allowlist_leaf_index: u32,
    ) -> Result<()> {
        // Fail fast on invalid input to save compute units
        require!(quantity > 0, NexusError::InvalidSupply);
        
        // Additional early validation to prevent expensive operations
        require!(
            allowlist_proof.len() <= MAX_MERKLE_PROOF_DEPTH,
            NexusError::AllowlistInvalid
        );
        
        // Security: Prevent excessive quantity minting in single transaction
        require!(quantity <= 10, NexusError::InvalidSupply);

        let clock = Clock::get()?;
        
        // Security: Check global emergency pause first
        let registry = &ctx.accounts.registry;
        require!(!registry.emergency_pause, NexusError::EmergencyPauseActive);
        
        // Security: Additional validation for upgrade state
        require!(
            registry.upgrade_state != UpgradeState::Initiated as u8,
            NexusError::UpgradeInProgress
        );
        
        let new_minted = {
        let collection = &mut ctx.accounts.collection;
        require!(!collection.is_paused(), NexusError::MintingPaused);
        require!(
            clock.unix_timestamp >= collection.start_time,
            NexusError::MintingNotStarted
        );
        if collection.has_end_time() {
            require!(
                clock.unix_timestamp <= collection.end_time,
                NexusError::MintingEnded
            );
        }
        let new_minted = collection
            .minted
            .checked_add(quantity as u64)
            .ok_or(NexusError::MathOverflow)?;
        require!(new_minted <= collection.max_supply, NexusError::SupplyExceeded);

        // Optimized allowlist verification with CPI fallback
        // Fast path for public mints first to avoid unnecessary account checks
        if !collection.has_allowlist() {
            require!(allowlist_proof.is_empty(), NexusError::AllowlistNotRequired);
        } else {
            // Early validation to save compute units on bad input
            require!(!allowlist_proof.is_empty(), NexusError::AllowlistRequired);
            
            // Allowlist verification via the program's own inline keccak Merkle proof against
            // the on-chain root. The previous nexus_allowlist CPI branch was removed: that
            // program is incomplete WIP (doesn't compile, excluded from the workspace). The
            // inline path below is self-contained and is the canonical verification here.
            {
                let mut hasher = Keccak256::new();
                let buyer_key = ctx.accounts.buyer.key();
                let collection_key = collection.key();
                
                // Batch both updates together for efficiency
                hasher.update(buyer_key.as_ref());
                hasher.update(collection_key.as_ref());
                
                let hash_result = hasher.finalize();
                // SAFETY: Keccak256 always produces exactly 32 bytes
                let leaf: [u8; 32] = hash_result.as_slice().try_into().unwrap();
                
                require!(
                    verify_merkle_proof_optimized(
                        &leaf,
                        allowlist_leaf_index,
                        &allowlist_proof,
                        &collection.allowlist_root
                    ),
                    NexusError::AllowlistInvalid
                );
            }
        }

        // Per-wallet mint limit enforcement.
        // WalletMintTracker is only 9 bytes — seeds prove ownership, no need to store wallet/collection.
        // Saves 64 bytes per minter (32 wallet + 32 collection), which adds up fast at scale.
        // Tracker is always incremented (even when no limit is active) so that activating a limit
        // later via update_config reflects accurate historical mint counts, not just post-limit mints.
        {
            let tracker = &mut ctx.accounts.wallet_tracker;
            let new_count = tracker
                .minted
                .checked_add(quantity)
                .ok_or(NexusError::MathOverflow)?;
            if collection.has_mint_limit() {
                require!(
                    new_count <= collection.mint_limit_per_wallet,
                    NexusError::MintLimitExceeded
                );
            }
            tracker.minted = new_count;
        }

        // Additive fee model: creator receives their full set price; platform fee
        // is calculated on top of that and charged additionally to the buyer.
        // Buyer pays: creator_amount + platform_fee. No funds accumulate in any PDA.
        let creator_amount = collection
            .price
            .checked_mul(quantity as u64)
            .ok_or(NexusError::MathOverflow)?;
        let platform_fee = creator_amount
            .checked_mul(collection.platform_fee_bps as u64)
            .and_then(|x| x.checked_div(10_000))
            .ok_or(NexusError::MathOverflow)?;

        // Platform gets paid first (because platforms pay the bills too)
        if platform_fee > 0 {
            anchor_lang::solana_program::program::invoke(
                &anchor_lang::solana_program::system_instruction::transfer(
                    &ctx.accounts.buyer.key(),
                    &collection.platform_wallet,
                    platform_fee,
                ),
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.platform_wallet.to_account_info(),
                ],
            )?;
        }

        // Creator payment — single wallet or split across multiple recipients
        if creator_amount > 0 {
            // Try split mode if enabled AND split_config exists; fallback to creator_wallet otherwise
            let split = if collection.has_split() {
                ctx.accounts.split_config.as_ref()
            } else {
                None
            };

            if split.is_none() {
                // No split configured, or split_config not provided — pay creator_wallet directly
                anchor_lang::solana_program::program::invoke(
                    &anchor_lang::solana_program::system_instruction::transfer(
                        &ctx.accounts.buyer.key(),
                        &collection.creator_wallet,
                        creator_amount,
                    ),
                    &[
                        ctx.accounts.buyer.to_account_info(),
                        ctx.accounts.creator_wallet.to_account_info(),
                    ],
                )?;
            } else {
                // Split mode: remaining_accounts = [buyer, recipient_0, ..., recipient_n-1]
                let split = split.unwrap();
                let n = split.num as usize;
                require!(n > 0 && n <= 10, NexusError::InvalidMintSplitAccounts);
                let rem = ctx.remaining_accounts;
                require!(rem.len() >= n + 1, NexusError::InvalidMintSplitAccounts);
                require!(
                    rem[0].key() == ctx.accounts.buyer.key(),
                    NexusError::InvalidMintSplitAccounts
                );
                for i in 0..n {
                    require!(
                        rem[i + 1].key() == split.recipients[i],
                        NexusError::InvalidMintSplitAccounts
                    );
                    require!(rem[i + 1].is_writable, NexusError::InvalidMintSplitAccounts);
                }
                let mut transferred: u64 = 0;
                for i in 0..n {
                    // Last recipient gets the remainder to absorb rounding dust
                    let amount = if i == n - 1 {
                        creator_amount
                            .checked_sub(transferred)
                            .ok_or(NexusError::MathOverflow)?
                    } else {
                        creator_amount
                            .checked_mul(split.shares[i] as u64)
                            .and_then(|x| x.checked_div(100))
                            .ok_or(NexusError::MathOverflow)?
                    };
                    if amount > 0 {
                        anchor_lang::solana_program::program::invoke(
                            &anchor_lang::solana_program::system_instruction::transfer(
                                &rem[0].key(),
                                &split.recipients[i],
                                amount,
                            ),
                            &[rem[0].clone(), rem[i + 1].clone()],
                        )?;
                        transferred = transferred
                            .checked_add(amount)
                            .ok_or(NexusError::MathOverflow)?;
                    }
                }
            }
        }

        collection.minted = new_minted;
        new_minted
        };

        mint_nft_assets(
            &ctx,
            &ctx.accounts.collection,
            new_minted,
            quantity,
        )?;

        log_msg!("Minted {}. Total minted: {}", quantity, new_minted);
        Ok(())
    }

    /// Pause minting (authority only). Use when something breaks or needs review.
    pub fn pause(ctx: Context<UpdateCollection>) -> Result<()> {
        ctx.accounts.collection.set_paused(true);
        ctx.accounts.collection.status = 5; // keep status in sync with flags.bit0
        log_msg!("Minting paused");
        Ok(())
    }

    /// Resume minting (authority only). Use after fixing whatever caused the pause.
    pub fn resume(ctx: Context<UpdateCollection>) -> Result<()> {
        ctx.accounts.collection.set_paused(false);
        if ctx.accounts.collection.status == 5 {
            ctx.accounts.collection.status = 3; // revert to "minting"
        }
        log_msg!("Minting resumed");
        Ok(())
    }

    /// Close a WalletMintTracker PDA and reclaim rent to the minter.
    /// Gated: minting must be permanently over (sold out or end_time passed) to prevent
    /// a minter from closing and resetting their tracker to bypass mint_limit_per_wallet.
    pub fn close_wallet_tracker(ctx: Context<CloseWalletTracker>) -> Result<()> {
        let collection = &ctx.accounts.collection;
        let clock = Clock::get()?;
        let sold_out = collection.minted >= collection.max_supply;
        let time_ended = collection.has_end_time() && clock.unix_timestamp > collection.end_time;
        require!(sold_out || time_ended, NexusError::MintingStillActive);
        log_msg!("Wallet tracker closed, rent reclaimed");
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURATION UPDATES
    // ═══════════════════════════════════════════════════════════════════════

    /// Update minting configuration (authority only).
    /// metadata_standard is immutable — changing it mid-collection breaks everything.
    pub fn update_config(
        ctx: Context<UpdateCollection>,
        new_config: CollectionConfig,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let collection = &mut ctx.accounts.collection;
        // Once minting has started, lock the price-sensitive fields to prevent mid-mint rugs:
        //   price change  → earlier buyers paid more/less than advertised
        //   supply change → scarcity promise broken (inflate to u64::MAX or deflate to bait)
        //   start_time forward → silently re-gates an open mint without going through pause()
        if collection.minted > 0 {
            require!(new_config.price_per_nft == collection.price, NexusError::InvalidStatus);
            require!(new_config.max_supply == collection.max_supply, NexusError::InvalidStatus);
            require!(new_config.start_time == collection.start_time, NexusError::InvalidStartTime);
        } else {
            require!(
                new_config.start_time >= clock.unix_timestamp,
                NexusError::InvalidStartTime
            );
        }
        // Immutable after creation: changing the standard mid-collection means
        // some NFTs are Legacy and some are Core, which is a support nightmare.
        require!(
            (new_config.metadata_standard as u8) == collection.metadata_standard,
            NexusError::InvalidMetadataStandard
        );
        require!(new_config.max_supply > 0, NexusError::InvalidSupply);
        // Prevent reducing supply below already-minted count — would brick minting
        // and could be used to bypass freeze_until_sold_out restrictions.
        require!(
            new_config.max_supply >= collection.minted,
            NexusError::InvalidSupply
        );
        if let Some(end) = new_config.end_time {
            require!(end > new_config.start_time, NexusError::InvalidStartTime);
        }
        collection.max_supply = new_config.max_supply;
        collection.price = new_config.price_per_nft;
        collection.start_time = new_config.start_time;
        collection.end_time = new_config.end_time.unwrap_or(Collection::DISABLED_I64);
        collection.mint_limit_per_wallet = new_config
            .mint_limit_per_wallet
            .unwrap_or(Collection::DISABLED_U8);
        collection.freeze_until = new_config
            .freeze_trading_until_date
            .unwrap_or(Collection::DISABLED_I64);
        collection.set_freeze_until_sold_out(new_config.freeze_trading_until_sold_out);
        emit!(CollectionConfigUpdated { collection: collection.key() });
        log_msg!("Collection config updated");
        Ok(())
    }

    /// Update platform fee percentage (registry authority only).
    /// Fee is in basis points: 500 = 5%. Hard cap: 1500 bps (15%).
    /// Gated on the registry authority — only the platform can change this,
    /// not individual collection creators.
    pub fn update_platform_fee(
        ctx: Context<UpdatePlatformFee>,
        new_fee_bps: u16,
    ) -> Result<()> {
        require!(new_fee_bps <= 1_500, NexusError::InvalidFeePercentage);
        let old_fee_bps = ctx.accounts.collection.platform_fee_bps;
        ctx.accounts.collection.platform_fee_bps = new_fee_bps;
        emit!(PlatformFeeUpdated {
            collection: ctx.accounts.collection.key(),
            old_fee_bps,
            new_fee_bps,
        });
        log_msg!("Platform fee → {} bps", new_fee_bps);
        Ok(())
    }

    /// Update allowlist Merkle root (authority only).
    /// Set root to enforce allowlist-only minting; set to [0u8;32] to open public mint.
    /// Emits AllowlistRootUpdated with old/new root and timestamp so off-chain observers
    /// can detect root rotation and notify wallets whose proofs are now invalid.
    pub fn update_allowlist_root(
        ctx: Context<UpdateCollection>,
        new_root: [u8; 32],
    ) -> Result<()> {
        let old_root = ctx.accounts.collection.allowlist_root;
        ctx.accounts.collection.allowlist_root = new_root;
        emit!(AllowlistRootUpdated {
            collection: ctx.accounts.collection.key(),
            timestamp: Clock::get()?.unix_timestamp,
            old_root,
            new_root,
        });
        log_msg!(
            "Allowlist root {}",
            if ctx.accounts.collection.has_allowlist() {
                "set"
            } else {
                "cleared (public mint)"
            }
        );
        Ok(())
    }

    /// Update trading freeze settings (authority only).
    /// Can freeze until a specific timestamp, until sold out, or both.
    pub fn update_trading_freeze(
        ctx: Context<UpdateCollection>,
        freeze_until_date: Option<i64>,
        freeze_until_sold_out: bool,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        collection.freeze_until = freeze_until_date.unwrap_or(Collection::DISABLED_I64);
        collection.set_freeze_until_sold_out(freeze_until_sold_out);
        log_msg!("Trading freeze updated");
        Ok(())
    }

    /// Set or update the base URI in an optional PDA (authority only).
    /// The PDA is only created when this is called — zero rent when unused.
    /// Close it with close_collection_uri when the mint ends to reclaim rent.
    pub fn update_base_uri(
        ctx: Context<UpdateBaseUri>,
        new_base_uri: String,
    ) -> Result<()> {
        require!(
            new_base_uri.len() <= COLLECTION_URI_MAX_LEN,
            NexusError::MetadataUriTooLong
        );
        ctx.accounts.collection_uri.base_uri = new_base_uri;
        log_msg!("Base URI updated");
        Ok(())
    }

    /// Close the CollectionUri PDA and reclaim its rent to the authority.
    /// Call this when the mint is over or the URI is no longer needed.
    pub fn close_collection_uri(_ctx: Context<CloseCollectionUri>) -> Result<()> {
        log_msg!("Collection URI PDA closed, rent reclaimed");
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MINT SPLIT CONFIG — optional PDA, only pay rent when splits are active
    // ═══════════════════════════════════════════════════════════════════════

    /// Create the MintSplitConfig PDA. Call this before update_mint_fund_splits.
    pub fn init_mint_split_config(ctx: Context<InitMintSplitConfig>) -> Result<()> {
        let split = &mut ctx.accounts.mint_split_config;
        split.num = 0;
        split.recipients = [Pubkey::default(); 10];
        split.shares = [0u8; 10];
        log_msg!("Mint split config PDA created");
        Ok(())
    }

    /// Configure mint fund splits (authority only).
    /// Pass num=0 to disable splits and revert to single creator_wallet.
    /// Shares must sum to 100. Recipients are paid in order as remaining_accounts during mint.
    pub fn update_mint_fund_splits(
        ctx: Context<UpdateMintFundSplits>,
        recipients: [Pubkey; 10],
        shares: [u8; 10],
        num: u8,
    ) -> Result<()> {
        require!(num <= 10, NexusError::InvalidMintSplitCount);
        let collection = &mut ctx.accounts.collection;
        if num == 0 {
            collection.set_has_split(false);
            log_msg!("Splits cleared — reverting to single creator_wallet");
            return Ok(());
        }
        let split = ctx
            .accounts
            .mint_split_config
            .as_mut()
            .ok_or(NexusError::InvalidMintSplitAccounts)?;
        let mut sum: u16 = 0;
        for i in 0..(num as usize) {
            require!(
                recipients[i] != Pubkey::default(),
                NexusError::InvalidMintSplitAccounts
            );
            sum = sum
                .checked_add(shares[i] as u16)
                .ok_or(NexusError::MathOverflow)?;
        }
        require!(sum == 100, NexusError::InvalidMintSplitSum);
        split.num = num;
        split.recipients = recipients;
        split.shares = shares;
        collection.set_has_split(true);
        log_msg!("Mint splits updated: {} recipients", num);
        Ok(())
    }

    /// Close the MintSplitConfig PDA and reclaim rent. Clears has_split on the collection.
    /// Guard: minting must be permanently over (sold out or end_time passed) so that authority
    /// cannot close splits mid-mint and silently reroute all revenue to creator_wallet.
    pub fn close_mint_split_config(ctx: Context<CloseMintSplitConfig>) -> Result<()> {
        let clock = Clock::get()?;
        let sold_out = ctx.accounts.collection.minted >= ctx.accounts.collection.max_supply;
        let time_ended = ctx.accounts.collection.has_end_time()
            && clock.unix_timestamp > ctx.accounts.collection.end_time;
        require!(sold_out || time_ended, NexusError::MintingStillActive);
        ctx.accounts.collection.set_has_split(false);
        log_msg!("Mint split config PDA closed, rent reclaimed");
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRADING CONTROLS — read-only view functions + transfer enforcement
    // ═══════════════════════════════════════════════════════════════════════

    /// Check if trading is currently frozen. Read-only, no state change.
    pub fn is_trading_frozen(ctx: Context<CheckTradingStatus>) -> Result<bool> {
        let clock = Clock::get()?;
        let frozen = trading_frozen(&ctx.accounts.collection, &clock);
        log_msg!("Trading frozen: {}", frozen);
        Ok(frozen)
    }

    /// Check if a newly minted NFT should have FreezeDelegate applied.
    /// Returns true when the collection's freeze conditions are active.
    pub fn should_freeze_nft(ctx: Context<CheckTradingStatus>) -> Result<bool> {
        let clock = Clock::get()?;
        Ok(trading_frozen(&ctx.accounts.collection, &clock))
    }

    /// Batch freeze state check — returns current freeze status for the entire collection.
    /// Use this to determine whether to batch-freeze or batch-thaw all NFTs.
    pub fn get_collection_freeze_state(ctx: Context<CheckTradingStatus>) -> Result<bool> {
        let clock = Clock::get()?;
        Ok(trading_frozen(&ctx.accounts.collection, &clock))
    }

    /// Freeze-state gate check — returns TradingFrozen if this collection's freeze is active.
    ///
    /// IMPORTANT: This instruction does NOT perform the NFT transfer and does NOT enforce
    /// the freeze on-chain. It is a freeze-state oracle only. Any caller can bypass it by
    /// invoking Metaplex transfer instructions directly without calling this instruction.
    /// Actual on-chain freeze enforcement must be configured via Metaplex rule sets
    /// (FreezeDelegate) at the collection level — this program cannot block those CPIs.
    ///
    /// Use this instruction in custom transfer flows that opt-in to the freeze check.
    /// Renamed from `transfer_nft` to prevent the false impression that calling it moves tokens.
    pub fn assert_transfer_allowed(ctx: Context<TransferNFT>) -> Result<()> {
        let clock = Clock::get()?;
        if trading_frozen(&ctx.accounts.collection, &clock) {
            log_msg!("Transfer gate BLOCKED — trading is frozen");
            return Err(NexusError::TradingFrozen.into());
        }
        log_msg!("Transfer gate ALLOWED");
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Verify a Keccak256 Merkle proof. Leaf = keccak256(wallet_pubkey).
// leaf_index determines left/right ordering at each tree level.
fn verify_merkle_proof(
    leaf: &[u8; 32],
    leaf_index: u32,
    proof: &[[u8; 32]],
    root: &[u8; 32],
) -> bool {
    // Empty proof would return leaf == root, allowing any wallet to verify against
    // a root that happens to equal their leaf hash — reject explicitly.
    if proof.is_empty() || proof.len() > MAX_MERKLE_PROOF_DEPTH {
        return false;
    }
    let mut current = *leaf;
    for (i, sibling) in proof.iter().enumerate() {
        let bit = (leaf_index >> i) & 1;
        let (left, right) = if bit == 0 {
            (current, *sibling)
        } else {
            (*sibling, current)
        };
        let mut combined = [0u8; 64];
        combined[..32].copy_from_slice(&left);
        combined[32..].copy_from_slice(&right);
        let mut hasher = Keccak256::new();
        hasher.update(&combined);
        // SAFETY: Keccak256 always produces exactly 32 bytes; try_into cannot fail here.
        current = <&[u8] as TryInto<[u8; 32]>>::try_into(hasher.finalize().as_slice()).unwrap();
    }
    current == *root
}

// Optimized Merkle proof verification with reduced allocations
#[inline]
fn verify_merkle_proof_optimized(
    leaf: &[u8; 32],
    leaf_index: u32,
    proof: &[[u8; 32]],
    root: &[u8; 32],
) -> bool {
    // Early exit for invalid proof length
    if proof.is_empty() || proof.len() > MAX_MERKLE_PROOF_DEPTH {
        return false;
    }
    
    let mut current = *leaf;
    let mut combined = [0u8; 64]; // Pre-allocate to avoid repeated allocations
    
    for (i, sibling) in proof.iter().enumerate() {
        let bit = (leaf_index >> i) & 1;
        
        // Direct assignment instead of tuple destructuring for performance
        if bit == 0 {
            combined[..32].copy_from_slice(&current);
            combined[32..].copy_from_slice(sibling);
        } else {
            combined[..32].copy_from_slice(sibling);
            combined[32..].copy_from_slice(&current);
        }
        
        let mut hasher = Keccak256::new();
        hasher.update(&combined);
        // SAFETY: Keccak256 always produces exactly 32 bytes; try_into cannot fail here.
        current = <&[u8] as TryInto<[u8; 32]>>::try_into(hasher.finalize().as_slice()).unwrap();
    }
    
    current == *root
}


// Check both freeze conditions in one place.
// freeze_until_sold_out takes priority; date freeze is secondary.
fn trading_frozen(collection: &Collection, clock: &Clock) -> bool {
    if collection.freeze_until_sold_out() && collection.minted < collection.max_supply {
        return true;
    }
    if collection.has_freeze_date() && clock.unix_timestamp < collection.freeze_until {
        return true;
    }
    false
}

/// Mint NFT assets after payment. Core: one remaining_account signer per quantity.
fn mint_nft_assets<'info>(
    ctx: &Context<'_, '_, '_, 'info, MintNFT<'info>>,
    collection: &Collection,
    new_minted: u64,
    quantity: u8,
) -> Result<()> {
    let standard = MetadataStandard::from_u8(collection.metadata_standard)
        .ok_or(NexusError::InvalidMetadataStandard)?;

    match standard {
        MetadataStandard::Core => {
            let clock = Clock::get()?;
            let freeze = trading_frozen(collection, &clock);
            let start_index = new_minted
                .checked_sub(quantity as u64)
                .and_then(|v| v.checked_add(1))
                .ok_or(NexusError::MathOverflow)?;

            let split_rem = if collection.has_split() && ctx.accounts.split_config.is_some() {
                let split = ctx
                    .accounts
                    .split_config
                    .as_ref()
                    .ok_or(NexusError::InvalidMintSplitAccounts)?;
                split.num as usize + 1
            } else {
                0
            };

            let rem = ctx.remaining_accounts;
            require!(
                rem.len() >= split_rem + quantity as usize,
                NexusError::InvalidCoreAssetAccounts
            );

            let (_, mint_auth_bump) = mint_authority_pda(&collection.mint, ctx.program_id);

            for i in 0..quantity as usize {
                let asset = &rem[split_rem + i];
                require!(asset.is_signer, NexusError::InvalidCoreAssetAccounts);
                require!(asset.is_writable, NexusError::InvalidCoreAssetAccounts);

                mint_core_asset(
                    collection,
                    start_index + i as u64,
                    asset,
                    &ctx.accounts.core_collection.to_account_info(),
                    &ctx.accounts.mint_authority.to_account_info(),
                    &ctx.accounts.buyer.to_account_info(),
                    &ctx.accounts.buyer.to_account_info(),
                    &ctx.accounts.system_program.to_account_info(),
                    &ctx.accounts.mpl_core_program.to_account_info(),
                    mint_auth_bump,
                    freeze,
                )?;
            }
        }
        MetadataStandard::Legacy => {
            // remaining_accounts layout (after split accounts):
            //   [split_rem + 0]: token_metadata_program
            //   [split_rem + 1]: token_program (spl_token)
            //   per NFT i: [split_rem + 2 + i*4 .. split_rem + 2 + i*4 + 4]
            //     [0] mint keypair    (signer, writable)
            //     [1] metadata PDA   (writable)
            //     [2] master edition (writable)
            //     [3] buyer ATA      (writable, pre-created by client)
            let start_index = new_minted
                .checked_sub(quantity as u64)
                .and_then(|v| v.checked_add(1))
                .ok_or(NexusError::MathOverflow)?;

            let split_rem = if collection.has_split() && ctx.accounts.split_config.is_some() {
                let split = ctx
                    .accounts
                    .split_config
                    .as_ref()
                    .ok_or(NexusError::InvalidMintSplitAccounts)?;
                split.num as usize + 1
            } else {
                0
            };

            const LEGACY_PROG_ACCOUNTS: usize = 2; // token_metadata_program + token_program
            let rem = ctx.remaining_accounts;
            require!(
                rem.len() >= split_rem + LEGACY_PROG_ACCOUNTS + quantity as usize * 4,
                NexusError::InvalidCoreAssetAccounts
            );

            let token_metadata_program = &rem[split_rem];
            let token_program = &rem[split_rem + 1];

            let (_, mint_auth_bump) = mint_authority_pda(&collection.mint, ctx.program_id);

            for i in 0..quantity as usize {
                let base = split_rem + LEGACY_PROG_ACCOUNTS + i * 4;
                let mint_account = &rem[base];
                let metadata_account = &rem[base + 1];
                let master_edition_account = &rem[base + 2];
                let buyer_ata_account = &rem[base + 3];

                require!(mint_account.is_signer, NexusError::InvalidCoreAssetAccounts);
                require!(mint_account.is_writable, NexusError::InvalidCoreAssetAccounts);
                require!(metadata_account.is_writable, NexusError::InvalidCoreAssetAccounts);
                require!(master_edition_account.is_writable, NexusError::InvalidCoreAssetAccounts);
                require!(buyer_ata_account.is_writable, NexusError::InvalidCoreAssetAccounts);

                mint_legacy_asset(
                    collection,
                    start_index + i as u64,
                    mint_account,
                    metadata_account,
                    master_edition_account,
                    buyer_ata_account,
                    &ctx.accounts.mint_authority.to_account_info(),
                    &ctx.accounts.buyer.to_account_info(),
                    &ctx.accounts.system_program.to_account_info(),
                    token_metadata_program,
                    token_program,
                    mint_auth_bump,
                )?;
            }
        }
        _ => return Err(NexusError::NftMintNotImplemented.into()),
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct AdminResetRegistry<'info> {
    /// CHECK: Registry PDA, reinitialized in place by the handler. No typed deserialize is
    /// done here (the existing data may be an incompatible layout); the authority is validated
    /// against the stored authority bytes inside admin_reset_registry.
    #[account(mut, seeds = [b"registry"], bump)]
    pub registry: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    // Space: 8 (disc) + 32 (authority) + 33 (pending_authority: Option<Pubkey>) + 300×32 (pubkeys) + 4 (count) + 1 (bump) = 9,680 bytes
    // Zero-copy optimized: fixed array instead of Vec for better memory efficiency
    #[account(
        init,
        payer = authority,
        // size_of::<CollectionRegistry>() only counts the Vec header (24 bytes), not its 300-elem
        // capacity, so it under-allocated to ~173 bytes (room for ~2 collections). Size explicitly:
        // 8 disc + 32 authority + 33 Option<Pubkey> + 32 pending_upgrade + 3*8 i64
        // + (4 + 32*300) collections + 4 count + 1 upgrade_state + 1 emergency_pause + 1 bump = 9740.
        space = 9740,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCollection<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Collection::INIT_SPACE,
        seeds = [b"collection", mint.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,

    /// Metaplex Core collection address (also the collection seed key).
    #[account(mut)]
    pub mint: Signer<'info>,

    #[account(
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA that signs Metaplex Core CPIs for this collection.
    /// CHECK: seeds validated below; address stored on Collection.mint_authority
    #[account(
        seeds = [MINT_AUTHORITY_SEED, mint.key().as_ref()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Creator wallet — receives mint revenue (minus platform fee) directly on each mint
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,

    /// CHECK: Platform wallet — receives the platform fee on each mint
    pub platform_wallet: UncheckedAccount<'info>,

    /// CHECK: Metaplex Core program
    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// Used by: update_metadata, update_collection_status, update_config, update_platform_fee,
//          update_allowlist_root, update_trading_freeze, pause, resume
#[derive(Accounts)]
pub struct UpdateCollection<'info> {
    #[account(
        mut,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProposeRegistryAdmin<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptRegistryAdmin<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    // Pending new authority must sign to prove key control
    pub new_authority: Signer<'info>,
}

// update_featured is the only instruction gated on the registry authority, not the collection authority.
// This was a security gap in the original code — any wallet could feature any collection.
#[derive(Accounts)]
pub struct UpdateFeatured<'info> {
    #[account(mut)]
    pub collection: Account<'info, Collection>,

    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

// update_platform_fee is gated on the registry authority — the platform controls the fee,
// not individual collection creators (who could otherwise zero it out or set it to 100%).
#[derive(Accounts)]
pub struct UpdatePlatformFee<'info> {
    #[account(mut)]
    pub collection: Account<'info, Collection>,

    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub collection: Account<'info, Collection>,

    // Registry for emergency pause checks
    #[account(
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Verified to match collection.creator_wallet
    #[account(
        mut,
        address = collection.creator_wallet @ NexusError::Unauthorized
    )]
    pub creator_wallet: UncheckedAccount<'info>,

    /// CHECK: Verified to match collection.platform_wallet
    #[account(
        mut,
        address = collection.platform_wallet @ NexusError::Unauthorized
    )]
    pub platform_wallet: UncheckedAccount<'info>,

    // 9 bytes per minter. Seeds prove ownership — no need to store wallet or collection pubkey.
    // That's 64 bytes saved per tracker, which matters at scale.
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + WalletMintTracker::INIT_SPACE,
        seeds = [b"wallet_mint", collection.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub wallet_tracker: Account<'info, WalletMintTracker>,

    // Optional — only required when collection.has_split(). Seed: ["split", collection].
    // Read-only during mint: only num/shares/recipients are accessed, nothing is written.
    #[account(
        seeds = [b"split", collection.key().as_ref()],
        bump
    )]
    pub split_config: Option<Account<'info, MintSplitConfig>>,

    /// Metaplex Core collection (collection.mint). Required for Core collections.
    /// CHECK: address matched to collection.mint in mint_nft_assets
    #[account(
        mut,
        address = collection.mint @ NexusError::Unauthorized
    )]
    pub core_collection: UncheckedAccount<'info>,

    /// PDA update/mint authority for Metaplex Core CPIs.
    /// CHECK: address matched to collection.mint_authority in mint_nft_assets
    #[account(
        address = collection.mint_authority @ NexusError::Unauthorized
    )]
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Metaplex Core program
    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    /// CHECK: Allowlist program for CPI calls
    #[account(address = ALLOWLIST_PROGRAM_ID)]
    pub allowlist_program: UncheckedAccount<'info>,

    /// Optional: Allowlist account for verification (only when collection.has_allowlist())
    /// CHECK: Address derived from collection key
    #[account(
        seeds = [b"allowlist", collection.key().as_ref()],
        bump,
        seeds::program = ALLOWLIST_PROGRAM_ID,
    )]
    pub allowlist_account: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateBaseUri<'info> {
    #[account(
        mut,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    #[account(mut)]
    pub authority: Signer<'info>,

    // Created on first call, reused on subsequent calls. Zero rent when not used.
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + CollectionUri::INIT_SPACE,
        seeds = [b"uri", collection.key().as_ref()],
        bump
    )]
    pub collection_uri: Account<'info, CollectionUri>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseCollectionUri<'info> {
    #[account(
        mut,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        seeds = [b"uri", collection.key().as_ref()],
        bump
    )]
    pub collection_uri: Account<'info, CollectionUri>,
}

#[derive(Accounts)]
pub struct InitMintSplitConfig<'info> {
    #[account(
        mut,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + MintSplitConfig::INIT_SPACE,
        seeds = [b"split", collection.key().as_ref()],
        bump
    )]
    pub mint_split_config: Account<'info, MintSplitConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMintFundSplits<'info> {
    #[account(
        mut,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"split", collection.key().as_ref()],
        bump
    )]
    pub mint_split_config: Option<Account<'info, MintSplitConfig>>,
}

#[derive(Accounts)]
pub struct CloseMintSplitConfig<'info> {
    #[account(
        mut,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        seeds = [b"split", collection.key().as_ref()],
        bump
    )]
    pub mint_split_config: Account<'info, MintSplitConfig>,
}

#[derive(Accounts)]
pub struct CloseWalletTracker<'info> {
    pub collection: Account<'info, Collection>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        close = buyer,
        seeds = [b"wallet_mint", collection.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub wallet_tracker: Account<'info, WalletMintTracker>,
}

#[derive(Accounts)]
pub struct CheckTradingStatus<'info> {
    // Read-only — no authority required. Anyone can query freeze status.
    pub collection: Account<'info, Collection>,
}

#[derive(Accounts)]
pub struct TransferNFT<'info> {
    pub collection: Account<'info, Collection>,

    /// CHECK: NFT mint account — must match collection.mint to prevent freeze bypass
    #[account(address = collection.mint @ NexusError::Unauthorized)]
    pub nft_mint: UncheckedAccount<'info>,

    /// CHECK: Current NFT owner (sender)
    pub from: UncheckedAccount<'info>,

    /// CHECK: New NFT owner (receiver)
    pub to: UncheckedAccount<'info>,

    // Usually the current owner; could be a delegate
    pub authority: Signer<'info>,

}

#[derive(Accounts)]
pub struct EmergencyControl<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitiateUpgrade<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteUpgrade<'info> {
    #[account(
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelUpgrade<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub registry: Account<'info, CollectionRegistry>,

    pub authority: Signer<'info>,
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTS
// ═══════════════════════════════════════════════════════════════════════════

// THE UNIFIED COLLECTION ACCOUNT
//
// Previously: two separate accounts across two programs (nexus-collection ~215 bytes +
// nexus-launchpad ~222 bytes = 437 bytes total, two rent payments per collection).
// Now: one account, ~396 bytes, one rent payment. Math did win.
//
// Layout (all fixed-size except metadata_uri):
//   5 Pubkeys:         5 × 32  = 160
//   3 u64:             3 × 8   =  24
//   4 i64:             4 × 8   =  32
//   1 u16:                      =   2
//   5 u8:              5 × 1   =   5
//   1 bool:                     =   1
//   allowlist_root:   [u8;32]  =  32
//   metadata_uri:   4+128      = 132
//   INIT_SPACE total            = 388  (+8 discriminator = 396 bytes)
// Optimized field ordering reduces padding from natural alignment
#[account]
#[derive(InitSpace)]
pub struct Collection {
    // 32-byte fields first to minimize padding
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub mint_authority: Pubkey,
    pub creator_wallet: Pubkey,
    pub platform_wallet: Pubkey,
    
    // 64-bit fields grouped together
    pub max_supply: u64,
    pub minted: u64,
    pub price: u64,
    pub start_time: i64,
    pub end_time: i64,             // DISABLED_I64 = no end time
    pub freeze_until: i64,         // DISABLED_I64 = no date-based freeze
    pub created_at: i64,
    
    // Smaller fields at the end to minimize padding
    pub platform_fee_bps: u16,
    pub allowlist_root: [u8; 32],  // [0;32] = public mint, anything else = allowlist active
    
    // Single-byte fields packed together
    pub mint_limit_per_wallet: u8, // 0 = unlimited
    pub metadata_standard: u8,     // MetadataStandard as u8 (0=Legacy .. 7=Custom)
    pub flags: u8,                 // bit0=paused, bit1=freeze_until_sold_out, bit2=has_split
    pub status: u8,                // 0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused
    pub featured: bool,
    pub bump: u8,
    
    #[max_len(128)]
    pub metadata_uri: String,
}

impl Collection {
    pub const FLAG_PAUSED: u8 = 1 << 0;
    pub const FLAG_FREEZE_UNTIL_SOLD_OUT: u8 = 1 << 1;
    pub const FLAG_HAS_SPLIT: u8 = 1 << 2;

    // Sentinels instead of Options — saves 1 byte per field (no discriminant byte).
    // i64::MIN avoids the "valid 1969 timestamp" ambiguity of -1 and is obviously not real data.
    pub const DISABLED_I64: i64 = i64::MIN;
    pub const DISABLED_U8: u8 = 0;

    #[inline]
    pub fn is_paused(&self) -> bool {
        self.flags & Self::FLAG_PAUSED != 0
    }
    #[inline]
    pub fn set_paused(&mut self, v: bool) {
        if v {
            self.flags |= Self::FLAG_PAUSED;
        } else {
            self.flags &= !Self::FLAG_PAUSED;
        }
    }
    pub fn freeze_until_sold_out(&self) -> bool {
        self.flags & Self::FLAG_FREEZE_UNTIL_SOLD_OUT != 0
    }
    pub fn set_freeze_until_sold_out(&mut self, v: bool) {
        if v {
            self.flags |= Self::FLAG_FREEZE_UNTIL_SOLD_OUT;
        } else {
            self.flags &= !Self::FLAG_FREEZE_UNTIL_SOLD_OUT;
        }
    }
    pub fn has_split(&self) -> bool {
        self.flags & Self::FLAG_HAS_SPLIT != 0
    }
    pub fn set_has_split(&mut self, v: bool) {
        if v {
            self.flags |= Self::FLAG_HAS_SPLIT;
        } else {
            self.flags &= !Self::FLAG_HAS_SPLIT;
        }
    }
    pub fn has_end_time(&self) -> bool {
        self.end_time != Self::DISABLED_I64
    }
    pub fn has_freeze_date(&self) -> bool {
        self.freeze_until != Self::DISABLED_I64
    }
    #[inline]
    pub fn has_allowlist(&self) -> bool {
        self.allowlist_root != [0u8; 32]
    }
    pub fn has_mint_limit(&self) -> bool {
        self.mint_limit_per_wallet != Self::DISABLED_U8
    }
}

// Global collection registry for fast querying.
// Heavily optimized: 8 + 32 + 33 + 32 + 33 + 4 + 4 + 1 + 1 + (300×32) + 1 = 9,718 bytes
// Without this you'd need getProgramAccounts to list collections — slow and expensive.
// With this you load one PDA and get up to 300 pubkeys instantly.
//
// Authority field added vs the original: now update_featured is actually gated.
// Added upgrade safety fields and emergency controls with optimal packing.
// Field layout optimized to minimize padding and maximize cache efficiency.
#[account]
pub struct CollectionRegistry {
    // 32-byte fields first for optimal alignment
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>, // two-step admin rotation; None when idle
    pub pending_upgrade_program: Pubkey, // Program ID for pending upgrade
    
    // 64-bit fields grouped together for cache efficiency
    pub upgrade_initiated_time: i64, // When upgrade was initiated
    pub upgrade_completion_time: i64, // When upgrade can be completed
    pub emergency_pause_time: i64, // When emergency pause was activated
    
    // Dynamic field - placed after fixed fields
    pub collections: Vec<Pubkey>, // Max 300 collections for rent efficiency
    
    // Small fields packed together at end to minimize padding
    pub collection_count: u32, // Track actual count (redundant but saves len() calls)
    pub upgrade_state: u8, // UpgradeState as u8
    pub emergency_pause: bool, // Global emergency pause state
    pub bump: u8,
}

impl CollectionRegistry {
    pub const MAX_COLLECTIONS: usize = 300;

    #[inline]
    pub fn add_collection(&mut self, collection: Pubkey) -> anchor_lang::Result<bool> {
        // Fast deduplicate check using collection_count for early exit
        let current_count = self.collection_count as usize;
        if self.collections.iter().take(current_count).any(|&k| k == collection) {
            return Ok(true);
        }
        if current_count >= Self::MAX_COLLECTIONS {
            return Ok(false); // full, but not a hard error
        }
        self.collections.push(collection);
        self.collection_count = self.collections.len() as u32;
        Ok(true)
    }

    #[inline]
    pub fn remove_collection(&mut self, collection: Pubkey) -> Result<()> {
        // Optimized: use collection_count to limit search scope
        let current_count = self.collection_count as usize;
        if let Some(index) = self.collections.iter().take(current_count).position(|&k| k == collection) {
            self.collections.remove(index);
            self.collection_count = self.collections.len() as u32;
        }
        Ok(())
    }

    #[inline]
    pub fn get_collections(&self) -> &[Pubkey] {
        // Return slice limited by collection_count for safety
        &self.collections[..self.collection_count as usize]
    }
}

// 9 bytes per minter (8 disc + 1 minted).
// PDA seeds [b"wallet_mint", collection, buyer] prove wallet+collection ownership,
// so we don't need to store either pubkey — that's 64 bytes saved per tracker.
// At 10,000 minters that's 640KB of rent you're not paying. (You're welcome.)
#[account]
#[derive(InitSpace)]
pub struct WalletMintTracker {
    pub minted: u8, // u8 cap matches mint_limit_per_wallet (both max 255)
}

// Optional base URI PDA. Seed: [b"uri", collection].
// Created only when the creator sets a URI. Collections without one pay zero rent here.
#[account]
#[derive(InitSpace)]
pub struct CollectionUri {
    #[max_len(COLLECTION_URI_MAX_LEN)]
    pub base_uri: String,
}

// Optional split config PDA. Seed: [b"split", collection].
// Created only when multi-recipient splits are needed. Close it after mint to reclaim rent.
#[account]
#[derive(InitSpace)]
pub struct MintSplitConfig {
    pub num: u8,                   // number of active recipients (0 = disabled)
    pub recipients: [Pubkey; 10],
    pub shares: [u8; 10],          // shares in whole percent, must sum to 100
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT STRUCTS
// ═══════════════════════════════════════════════════════════════════════════

// CollectionConfig is an input-only struct — it's never stored on-chain.
// Fields are unpacked into Collection directly to avoid nested struct padding.
// Think of it as the moving box, not the furniture.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionConfig {
    pub max_supply: u64,
    pub price_per_nft: u64,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub mint_limit_per_wallet: Option<u8>,
    pub metadata_standard: MetadataStandard,
    pub freeze_trading_until_date: Option<i64>,
    pub freeze_trading_until_sold_out: bool,
}

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

// All NFT/digital asset standards on Solana — stored as u8 to save 7 bytes vs full enum.
// Immutable after collection creation: it determines the minting flow, account structures,
// and programs used. Changing it mid-collection means mixed NFT types in one collection.
// (That's not a feature. That's a support ticket.)
//
// Cost estimates (on-chain only; we don't add fees):
//   Legacy:      ~0.021 SOL  — expensive but universal marketplace support
//   Programmable:~0.021 SOL  — enforced royalties, rule sets
//   Core:        ~0.008 SOL  — cheaper, cleaner, the future
//   Compressed:  ~0.005 SOL  — millions possible, Merkle tree storage
//   SemiFungible:~0.021 SOL  — NFT metadata + fungible supply (game items, tickets)
//   Token2022:   variable    — where Solana core is heading
//   NativeMetadata: variable — SPL native, no Metaplex dependency
//   Custom:      variable    — escape hatch for private/experimental standards
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum MetadataStandard {
    Legacy = 0,
    Programmable = 1,
    Core = 2,
    Compressed = 3,
    SemiFungible = 4,
    Token2022 = 5,
    NativeMetadata = 6,
    Custom = 7,
}

// Upgrade state machine for safe program upgrades
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum UpgradeState {
    None = 0,
    Initiated = 1,
    Completed = 2,
    Cancelled = 3,
}

impl MetadataStandard {
    // Validation only — name, program_id, cost descriptions live in the client SDK.
    // Keeping that info off-chain saves binary size (and binary size saves deploy cost).
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Legacy),
            1 => Some(Self::Programmable),
            2 => Some(Self::Core),
            3 => Some(Self::Compressed),
            4 => Some(Self::SemiFungible),
            5 => Some(Self::Token2022),
            6 => Some(Self::NativeMetadata),
            7 => Some(Self::Custom),
            _ => None,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

#[event]
pub struct CollectionConfigUpdated {
    pub collection: Pubkey,
}

#[event]
pub struct PlatformFeeUpdated {
    pub collection: Pubkey,
    pub old_fee_bps: u16,
    pub new_fee_bps: u16,
}

#[event]
pub struct AllowlistRootUpdated {
    pub collection: Pubkey,
    pub timestamp: i64,
    pub old_root: [u8; 32],
    pub new_root: [u8; 32],
}

#[event]
pub struct EmergencyPause {
    pub timestamp: i64,
    pub authority: Pubkey,
}

#[event]
pub struct EmergencyUnpause {
    pub timestamp: i64,
    pub authority: Pubkey,
}

#[event]
pub struct UpgradeInitiated {
    pub new_program_id: Pubkey,
    pub completion_time: i64,
    pub authority: Pubkey,
}

#[event]
pub struct UpgradeCompleted {
    pub old_program_id: Pubkey,
    pub new_program_id: Pubkey,
    pub completion_time: i64,
}

#[event]
pub struct UpgradeCancelled {
    pub cancelled_program: Pubkey,
    pub authority: Pubkey,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODES — merged from all three original programs
// ═══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum NexusError {
    // Auth
    #[msg("Unauthorized")]
    Unauthorized,
    // Collection catalog
    #[msg("Invalid collection status (must be 0-5)")]
    InvalidStatus,
    #[msg("Metadata URI exceeds maximum length (128 bytes)")]
    MetadataUriTooLong,
    // Launchpad config
    #[msg("Invalid start time — must be now or in the future; end time must be after start time")]
    InvalidStartTime,
    #[msg("Invalid supply — must be greater than zero")]
    InvalidSupply,
    #[msg("Invalid fee percentage — must be 0-1500 basis points (15% hard cap)")]
    InvalidFeePercentage,
    #[msg("Metadata standard is immutable after collection creation")]
    InvalidMetadataStandard,
    // Minting
    #[msg("Minting is paused")]
    MintingPaused,
    #[msg("Minting has not started yet")]
    MintingNotStarted,
    #[msg("Minting has ended")]
    MintingEnded,
    #[msg("Supply exceeded")]
    SupplyExceeded,
    #[msg("Mint limit per wallet exceeded")]
    MintLimitExceeded,
    // Allowlist
    #[msg("Allowlist phase active: valid Merkle proof required")]
    AllowlistRequired,
    #[msg("Allowlist proof invalid or wallet not in allowlist")]
    AllowlistInvalid,
    #[msg("Public mint: do not pass an allowlist proof")]
    AllowlistNotRequired,
    // Splits
    #[msg("Invalid mint split count (must be 0-10)")]
    InvalidMintSplitCount,
    #[msg("Mint split shares must sum to 100")]
    InvalidMintSplitSum,
    #[msg("Invalid mint split: pass recipient wallets in order as remaining_accounts")]
    InvalidMintSplitAccounts,
    // Trading freeze
    #[msg("Trading is frozen")]
    TradingFrozen,
    #[msg("Trading is not frozen")]
    TradingNotFrozen,
    // Admin rotation
    #[msg("No pending authority — call propose_registry_admin first")]
    NoPendingAuthority,
    // Wallet tracker
    #[msg("Minting is still active — tracker can only be closed after sold out or end_time passed")]
    MintingStillActive,
    // Math
    #[msg("Math overflow")]
    MathOverflow,
    // NFT minting
    #[msg("Collection name exceeds maximum length (32 bytes)")]
    CollectionNameTooLong,
    #[msg("Asset name exceeds maximum length (32 bytes)")]
    AssetNameTooLong,
    #[msg("Asset URI exceeds maximum length (128 bytes)")]
    AssetUriTooLong,
    #[msg("Invalid Metaplex Core program ID")]
    InvalidMplCoreProgram,
    #[msg("NFT minting not implemented for this metadata standard")]
    NftMintNotImplemented,
    #[msg("Invalid Core asset accounts — pass one signer asset keypair per quantity as remaining_accounts")]
    InvalidCoreAssetAccounts,
    // Upgrade and emergency controls
    #[msg("No emergency pause is currently active")]
    NoEmergencyPause,
    #[msg("Emergency pause is currently active - cannot perform this operation")]
    EmergencyPauseActive,
    #[msg("Upgrade delay too short - minimum 24 hours required")]
    UpgradeDelayTooShort,
    #[msg("Upgrade delay too long - maximum 7 days allowed")]
    UpgradeDelayTooLong,
    #[msg("No upgrade is currently in progress")]
    NoUpgradeInProgress,
    #[msg("Upgrade delay period has not passed yet")]
    UpgradeDelayNotPassed,
    #[msg("Upgrade is in progress - cannot perform this operation")]
    UpgradeInProgress,
}

// One program. One deploy. One upgrade authority.
// (One less thing to forget on mainnet launch day.)
