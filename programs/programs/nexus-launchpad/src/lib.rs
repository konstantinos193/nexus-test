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
use sha3::{Digest, Keccak256};

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
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.bump = ctx.bumps.registry;
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
        metadata_uri: String,
        collection_config: CollectionConfig,
        platform_fee_bps: u16,
    ) -> Result<()> {
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
        collection.mint_authority = ctx.accounts.mint_authority.key();
        collection.creator_wallet = ctx.accounts.creator_wallet.key();
        collection.platform_wallet = ctx.accounts.platform_wallet.key();

        // Catalog fields
        collection.metadata_uri = metadata_uri;
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
                    registry.collections.len()
                );
            }
            Ok(false) => {
                log_msg!("Registry full — collection created but not listed");
            }
            Err(err) => return Err(err),
        }

        log_msg!("Collection created: {}", collection.key());
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
    pub fn mint(
        ctx: Context<MintNFT>,
        quantity: u8,
        allowlist_proof: Vec<[u8; 32]>,
        allowlist_leaf_index: u32,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        let clock = Clock::get()?;

        require!(quantity > 0, NexusError::InvalidSupply);
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

        // Allowlist verification via Keccak256 Merkle proof
        if collection.has_allowlist() {
            require!(!allowlist_proof.is_empty(), NexusError::AllowlistRequired);
            require!(
                allowlist_proof.len() <= MAX_MERKLE_PROOF_DEPTH,
                NexusError::AllowlistInvalid
            );
            let mut hasher = Keccak256::new();
            hasher.update(ctx.accounts.buyer.key().as_ref());
            // Bind leaf to this collection so a proof from collection A cannot
            // be replayed against collection B with the same Merkle root.
            hasher.update(collection.key().as_ref());
            let hash_result = hasher.finalize();
            // SAFETY: Keccak256 always produces exactly 32 bytes; try_into cannot fail here.
            let leaf: [u8; 32] = hash_result.as_slice().try_into().unwrap();
            require!(
                verify_merkle_proof(
                    &leaf,
                    allowlist_leaf_index,
                    &allowlist_proof,
                    &collection.allowlist_root
                ),
                NexusError::AllowlistInvalid
            );
        } else {
            // Don't silently ignore proof data on public mint — caller probably has a bug
            require!(allowlist_proof.is_empty(), NexusError::AllowlistNotRequired);
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
            if !collection.has_split() {
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
                let split = ctx
                    .accounts
                    .split_config
                    .as_ref()
                    .ok_or(NexusError::InvalidMintSplitAccounts)?;
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

        log_msg!("Minted {}. Total minted: {}", quantity, collection.minted);
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

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    // Space: 8 (disc) + 32 (authority) + 33 (pending_authority: Option<Pubkey>) + 4 (vec len) + 300×32 (pubkeys) + 1 (bump) = 9,678 bytes
    // Manual size because we cap the Vec at 300 to stay under the 10KB CPI reallocation limit.
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 33 + 4 + (300 * 32) + 1, // +33 for pending_authority: Option<Pubkey>
        seeds = [b"registry"],
        bump,
        constraint = authority.key() == PLATFORM_AUTHORITY @ NexusError::Unauthorized
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

    /// CHECK: NFT collection mint — the pubkey becomes the collection's permanent identifier
    pub mint: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Mint authority for the collection
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Creator wallet — receives mint revenue (minus platform fee) directly on each mint
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,

    /// CHECK: Platform wallet — receives the platform fee on each mint
    pub platform_wallet: UncheckedAccount<'info>,

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
#[account]
#[derive(InitSpace)]
pub struct Collection {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub mint_authority: Pubkey,
    pub creator_wallet: Pubkey,
    pub platform_wallet: Pubkey,
    pub max_supply: u64,
    pub minted: u64,
    pub price: u64,
    pub start_time: i64,
    pub end_time: i64,             // DISABLED_I64 = no end time
    pub freeze_until: i64,         // DISABLED_I64 = no date-based freeze
    pub created_at: i64,
    pub platform_fee_bps: u16,
    pub mint_limit_per_wallet: u8, // 0 = unlimited
    pub metadata_standard: u8,     // MetadataStandard as u8 (0=Legacy .. 7=Custom)
    pub flags: u8,                 // bit0=paused, bit1=freeze_until_sold_out, bit2=has_split
    // INFORMATIONAL ONLY — status has no enforcement effect. Minting is controlled
    // exclusively by flags.bit0 (set by pause()/resume()). A status=5 collection
    // is NOT paused unless flags.bit0 is also set. Frontends must read flags, not status.
    pub status: u8,                // 0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused
    pub featured: bool,
    pub bump: u8,
    pub allowlist_root: [u8; 32],  // [0;32] = public mint, anything else = allowlist active
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

    pub fn is_paused(&self) -> bool {
        self.flags & Self::FLAG_PAUSED != 0
    }
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
    pub fn has_allowlist(&self) -> bool {
        self.allowlist_root != [0u8; 32]
    }
    pub fn has_mint_limit(&self) -> bool {
        self.mint_limit_per_wallet != Self::DISABLED_U8
    }
}

// Global collection registry for fast querying.
// Without this you'd need getProgramAccounts to list collections — slow and expensive.
// With this you load one PDA and get up to 300 pubkeys instantly.
//
// Authority field added vs the original: now update_featured is actually gated.
// Space: 8 + 32 + 33 + 4 + (300×32) + 1 = 9,678 bytes — set manually in InitializeRegistry.
#[account]
pub struct CollectionRegistry {
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>, // two-step admin rotation; None when idle
    pub collections: Vec<Pubkey>, // max 300 — cap keeps initial alloc under 10KB CPI limit
    pub bump: u8,
}

impl CollectionRegistry {
    pub const MAX_COLLECTIONS: usize = 300;

    pub fn add_collection(&mut self, collection: Pubkey) -> anchor_lang::Result<bool> {
        // Deduplicate — idempotent is better than erroring on retry
        if self.collections.iter().any(|&k| k == collection) {
            return Ok(true);
        }
        if self.collections.len() >= Self::MAX_COLLECTIONS {
            return Ok(false); // full, but not a hard error
        }
        self.collections.push(collection);
        Ok(true)
    }

    pub fn remove_collection(&mut self, collection: Pubkey) -> Result<()> {
        self.collections.retain(|&k| k != collection);
        Ok(())
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
}

// One program. One deploy. One upgrade authority.
// (One less thing to forget on mainnet launch day.)
