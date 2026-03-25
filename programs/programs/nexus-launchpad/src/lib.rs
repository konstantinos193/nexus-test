/**
 * Nexus Launchpad Program - The NFT Launchpad That Actually Works
 * 
 * This is where dreams of launching NFT collections come to die... or thrive.
 * We handle minting, allowlists, trading freezes, and all the chaos that comes
 * with launching digital collectibles on Solana.
 * 
 * Features:
 * - Collection initialization (because someone has to set this up)
 * - Minting with allowlist support (because exclusivity sells)
 * - Trading freeze controls (because we can't let people trade too early)
 * - Platform fees (because even launchpads need to eat)
 * - Wallet mint limits (because whales ruin everything)
 * 
 * @author Juan - The developer who built this digital launchpad
 * (Coded with care, dark humor, and probably too much coffee)
 * (Also, if this breaks, it's not my fault - blame the blockchain)
 */

use anchor_lang::prelude::*;
use core::convert::TryInto;
use sha3::{Digest, Keccak256};

// Program ID - the unique identifier for this program on Solana
// This is like our address in the blockchain universe
// If you change this, everything breaks. Don't change this.
declare_id!("w6ELig1b3oETMQmiJkvPtyu99fnPwAGMJYSnaTXphma");

// Gate logging behind feature flag to reduce binary size in release builds
// Because apparently size matters (especially when you're paying for compute units)
// In release builds, we strip out all the logging to save space
// In debug builds, we keep it so we can actually see what's happening
// This is the difference between a bloated program and a lean, mean minting machine
#[cfg(feature = "logs")]
macro_rules! log_msg {
    ($($arg:tt)*) => {
        msg!($($arg)*)
    };
}

// When logs are disabled, this macro does absolutely nothing
// It's like screaming into the void, but more efficient
// (And less therapeutic)
#[cfg(not(feature = "logs"))]
macro_rules! log_msg {
    ($($arg:tt)*) => {};
}

/// Max base URI length in optional CollectionUri PDA. Keeps rent ~0.03 SOL when used.
pub const COLLECTION_URI_MAX_LEN: usize = 128;

fn truncate_uri(s: String, max_len: usize) -> String {
    if s.len() <= max_len {
        return s;
    }
    let mut end = max_len;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    s[..end].to_string()
}

#[program]
pub mod nexus_launchpad {
    use super::*;

    /// Initialize a new collection launchpad
    /// Platform fee only applies to mints, not trading (because we're not a marketplace, we're a launchpad)
    /// 
    /// This is where it all begins - setting up a new collection for launch
    /// Think of this as the birth certificate for your NFT collection
    /// (Except instead of a baby, you get a digital collectible that may or may not be worth anything)
    /// 
    /// We validate everything because we don't trust users to not mess things up
    /// Start times, supply limits, fee percentages - all checked here
    /// Because if we don't validate, chaos ensues (and chaos is expensive on Solana)
    pub fn initialize_collection(
        ctx: Context<InitializeCollection>,
        collection_config: CollectionConfig,
        platform_fee_basis_points: u16,
    ) -> Result<()> {
        // Validate BEFORE accessing accounts to ensure errors are thrown early
        // Get the current time - because we need to know when "now" is
        // Without this, we'd be living in a timeless void (which sounds cool but breaks everything)
        let clock = Clock::get()?;

        // Validate supply FIRST - must be greater than zero
        // Because a collection with zero supply is just... sad
        // (And also breaks math, which is less sad but more problematic)
        require!(
            collection_config.max_supply > 0,
            LaunchpadError::InvalidSupply
        );

        // Validate start time - can't start in the past (time travel not supported yet)
        // If someone tries to set a start time in the past, we politely tell them no
        // Because starting a mint in the past would be... problematic
        require!(
            collection_config.start_time >= clock.unix_timestamp,
            LaunchpadError::InvalidStartTime
        );

        // Validate platform fee (0-100%, in basis points: 0-10000)
        // We cap it at 100% because taking more than 100% would be... creative accounting
        // (And also mathematically impossible, but we check anyway because users are creative)
        require!(
            platform_fee_basis_points <= 10000,
            LaunchpadError::InvalidFeePercentage
        );

        // NOW access the collection account after validation passes
        let collection = &mut ctx.accounts.collection;

        // Set all the important stuff - authority, wallets, fees
        // This is where we store who owns what and who gets paid
        // Because without this, we'd have no idea who's in charge (chaos, remember?)
        collection.authority = ctx.accounts.authority.key();
        collection.mint_authority = ctx.accounts.mint_authority.key();
        collection.creator_wallet = ctx.accounts.creator_wallet.key();
        collection.platform_wallet = ctx.accounts.platform_wallet.key();
        collection.platform_fee_bps = platform_fee_basis_points;
        
        // Flatten config fields directly into collection (no nested struct = less padding)
        // We unpack the config struct and store everything flat, because nested structs waste padding
        // (And we're not about that wasteful lifestyle - every byte counts when you're paying rent)
        collection.max_supply = collection_config.max_supply;
        collection.price = collection_config.price_per_nft;
        collection.start_time = collection_config.start_time;
        // Convert Option<i64> to sentinel -1 (because None wastes 9 bytes, -1 wastes 8)
        // (And yes, we're that cheap - we'll save 1 byte if we can)
        collection.end_time = collection_config.end_time.unwrap_or(Collection::DISABLED_I64);
        // Convert Option<u8> to sentinel 0 (because None wastes 2 bytes, 0 wastes 1)
        // (Because we're efficient like that - every byte saved is a byte earned)
        collection.mint_limit_per_wallet = collection_config.mint_limit_per_wallet.unwrap_or(Collection::DISABLED_U8);
        // Convert enum to u8 (because storing the full enum wastes space)
        // (And we're not about that wasteful lifestyle - we pack everything tight)
        collection.metadata_standard = collection_config.metadata_standard as u8;
        // Convert Option<i64> to sentinel -1 (because we're consistent, and also cheap)
        collection.freeze_until = collection_config.freeze_trading_until_date.unwrap_or(Collection::DISABLED_I64);
        
        // Pack booleans into flags bitmask (saves alignment bytes)
        // We start with flags = 0 (all flags cleared), then set them as needed
        // (Because storing multiple bools wastes alignment bytes, and we're not wasteful)
        collection.flags = 0;
        if collection_config.freeze_trading_until_sold_out {
            collection.set_freeze_until_sold_out(true);
        }
        
        // Start with zero mints
        collection.minted = 0;
        
        // Mint fund split: when has_split, load from MintSplitConfig PDA (saves ~330 bytes per collection when unused).
        collection.set_has_split(false);
        
        // No allowlist initially - admin can set via update_allowlist_root for allowlist-phase mints
        collection.allowlist_root = [0u8; 32];
        
        // Base URI: not in core. Optional CollectionUri PDA (seed ["uri", collection]) created only when set.
        
        // Store the PDA bump - because we need it for account derivation
        // (And because Anchor told us to, and Anchor is usually right)
        collection.bump = ctx.bumps.collection;

        log_msg!(
            "Collection initialized: {} with {}% platform fee (mint only)",
            collection.key(),
            platform_fee_basis_points as f64 / 100.0
        );
        Ok(())
    }

    /// Mint an NFT from the collection.
    /// When allowlist is active: pass proof (len <= 24) and leaf_index. When public mint: pass empty vec and 0.
    pub fn mint(
        ctx: Context<MintNFT>,
        quantity: u8,
        allowlist_proof: Vec<[u8; 32]>,
        allowlist_leaf_index: u32,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        // Get the current time again - because time keeps moving forward
        // (Unlike some of our users' understanding of how blockchains work)
        let clock = Clock::get()?;

        // Check if paused - because sometimes you need to stop the mint
        // (Usually because something broke, or someone found an exploit, or both)
        require!(!collection.is_paused(), LaunchpadError::MintingPaused);

        // Check time constraints - can't mint before start time
        // Because time travel isn't supported (yet), so we enforce chronological order
        require!(
            clock.unix_timestamp >= collection.start_time,
            LaunchpadError::MintingNotStarted
        );

        // Check if minting has ended (if an end time was set)
        // Because all good things must come to an end (especially mints)
        if collection.has_end_time() {
            require!(
                clock.unix_timestamp <= collection.end_time,
                LaunchpadError::MintingEnded
            );
        }

        // Check supply - can't mint more than the max supply
        // Because infinite NFTs would break... well, everything
        // (And also devalue the collection, but that's a secondary concern)
        require!(
            collection.minted + quantity as u64 <= collection.max_supply,
            LaunchpadError::SupplyExceeded
        );

        // Allowlist: root set → require non-empty proof and valid leaf_index; root clear → require empty proof.
        if collection.has_allowlist() {
            require!(!allowlist_proof.is_empty(), LaunchpadError::AllowlistRequired);
            require!(
                allowlist_proof.len() <= MAX_MERKLE_PROOF_DEPTH,
                LaunchpadError::AllowlistInvalid
            );
            let mut hasher = Keccak256::new();
            hasher.update(ctx.accounts.buyer.key().as_ref());
            let hash_result = hasher.finalize();
            let leaf: [u8; 32] = hash_result.as_slice().try_into().unwrap();
            require!(
                verify_allowlist_proof(&leaf, allowlist_leaf_index, &allowlist_proof, &collection.allowlist_root),
                LaunchpadError::AllowlistInvalid
            );
        } else {
            require!(allowlist_proof.is_empty(), LaunchpadError::AllowlistNotRequired);
        }

        // Check mint limit per wallet - because we can't let whales hoard all the NFTs
        // This prevents one wallet from minting the entire collection
        // (Which would be bad for the community, and also bad for our reputation)
        // We use our optimized tracker that only stores the count (because we're efficient)
        // (And because storing wallet/collection in the tracker is wasteful - PDA seeds prove ownership)
        if collection.has_mint_limit() {
            let tracker = &mut ctx.accounts.wallet_tracker;
            
            // The tracker is automatically initialized by Anchor if it doesn't exist
            // The PDA derivation ensures this tracker is unique per wallet+collection combo
            // We don't need to store wallet/collection - PDA seeds prove ownership
            // (Because PDAs are deterministic, we can always derive the same account)
            // (And because storing data we can derive is wasteful, and we're not wasteful)
            
            // Check if this mint would exceed the limit (no hoarding allowed!)
            // Because if we let whales mint everything, regular users get nothing
            // (And regular users are the ones who actually use the NFTs)
            // We use checked_add to prevent overflow (because overflow = bad, and we don't like bad)
            let new_count = tracker.minted
                .checked_add(quantity)
                .ok_or(LaunchpadError::MathOverflow)?;
            require!(
                new_count <= collection.mint_limit_per_wallet,
                LaunchpadError::MintLimitExceeded
            );

            // Update the tracker with the new mint count
            // Using u8 since limits are typically small (max 255)
            // (Because if someone needs to mint more than 255 NFTs, they can use multiple wallets)
            // (And because we're not about to let one wallet hoard everything anyway)
            tracker.minted = new_count;
        }

        // Calculate total price - the buyer pays this amount
        // This is simple math: price per NFT × quantity = total price
        // (Unless there's overflow, in which case we reject the transaction)
        let total_price = collection.price
            .checked_mul(quantity as u64)
            .ok_or(LaunchpadError::MathOverflow)?;

        // Calculate platform fee (only on mints, not trading - we're a launchpad, not a marketplace)
        // The platform gets a percentage of the mint price
        // (Because even launchpads need to pay the bills)
        let platform_fee = total_price
            .checked_mul(collection.platform_fee_bps as u64)
            .and_then(|x| x.checked_div(10000))
            .ok_or(LaunchpadError::MathOverflow)?;

        // Creator gets the remainder (the platform takes its cut first, like a good business)
        // This is what's left after we take our fee
        // (The creator gets the rest, because they did the work of creating the collection)
        let creator_amount = total_price
            .checked_sub(platform_fee)
            .ok_or(LaunchpadError::MathOverflow)?;

        // Transfer platform fee (if any) - because even platforms need to eat
        // We take our cut first, because we're the platform and we can do that
        // (Also because if we don't get paid, we can't keep the lights on)
        if platform_fee > 0 {
            anchor_lang::solana_program::program::invoke(
                &anchor_lang::solana_program::system_instruction::transfer(
                    &ctx.accounts.buyer.key(),
                    &collection.platform_wallet.key(),
                    platform_fee,
                ),
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.platform_wallet.to_account_info(),
                ],
            )?;
        }

        // Transfer creator amount: single creator_wallet or split via MintSplitConfig PDA
        if creator_amount > 0 {
            if !collection.has_split() {
                anchor_lang::solana_program::program::invoke(
                    &anchor_lang::solana_program::system_instruction::transfer(
                        &ctx.accounts.buyer.key(),
                        &collection.creator_wallet.key(),
                        creator_amount,
                    ),
                    &[
                        ctx.accounts.buyer.to_account_info(),
                        ctx.accounts.creator_wallet.to_account_info(),
                    ],
                )?;
            } else {
                let split = ctx.accounts.split_config.as_ref().ok_or(LaunchpadError::InvalidMintSplitAccounts)?;
                let n = split.num as usize;
                require!(n > 0 && n <= 10, LaunchpadError::InvalidMintSplitAccounts);
                let rem = ctx.remaining_accounts;
                require!(rem.len() >= n + 1, LaunchpadError::InvalidMintSplitAccounts);
                require!(rem[0].key() == ctx.accounts.buyer.key(), LaunchpadError::InvalidMintSplitAccounts);
                for i in 0..n {
                    require!(
                        rem[i + 1].key() == split.recipients[i],
                        LaunchpadError::InvalidMintSplitAccounts
                    );
                }
                let mut transferred: u64 = 0;
                for i in 0..n {
                    let share = split.shares[i] as u64;
                    let amount = if i == n - 1 {
                        creator_amount
                            .checked_sub(transferred)
                            .ok_or(LaunchpadError::MathOverflow)?
                    } else {
                        creator_amount
                            .checked_mul(share)
                            .and_then(|x| x.checked_div(100))
                            .ok_or(LaunchpadError::MathOverflow)?
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
                            .ok_or(LaunchpadError::MathOverflow)?;
                    }
                }
            }
        }

        // Update minted count - because we need to track how many have been minted
        // This is important for supply checks and sold-out detection
        // (And also for bragging rights when the collection sells out)
        collection.minted = collection
            .minted
            .checked_add(quantity as u64)
            .ok_or(LaunchpadError::MathOverflow)?;

        log_msg!(
            "Minted {} NFTs. Total minted: {}",
            quantity,
            collection.minted
        );

        // NOTE: If trading is frozen, NFTs should be frozen using Metaplex Freeze Delegate
        // This is typically done during the actual NFT minting process (in nexus-collection or Metaplex)
        // The freeze check will be enforced by the transfer_nft function and Metaplex freeze state

        Ok(())
    }

    /// Pause minting
    /// This stops all minting activity (usually because something broke)
    /// Use this when you need to stop the mint without ending it permanently
    /// (Because sometimes you need a break, and mints are no exception)
    pub fn pause(ctx: Context<UpdateCollection>) -> Result<()> {
        // Set the pause flag - this will block all mint attempts
        // (Because we're the authority and we can do that)
        ctx.accounts.collection.set_paused(true);
        log_msg!("Minting paused");
        Ok(())
    }

    /// Resume minting
    /// This un-pauses minting (usually after you fixed whatever broke)
    /// Use this to restart the mint after pausing it
    /// (Because all good things must continue, especially mints)
    pub fn resume(ctx: Context<UpdateCollection>) -> Result<()> {
        // Clear the pause flag - this allows minting to continue
        // (And hopefully everything works this time)
        ctx.accounts.collection.set_paused(false);
        log_msg!("Minting resumed");
        Ok(())
    }

    /// Update collection configuration (only authority)
    /// This lets you change the collection config after initialization
    /// (Because sometimes you need to adjust things, and that's okay)
    /// Use this to update prices, times, limits, etc.
    /// (But be careful - changing things mid-mint can confuse users)
    pub fn update_config(
        ctx: Context<UpdateCollection>,
        new_config: CollectionConfig,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        
        // Metadata standard is IMMUTABLE - cannot be changed after collection creation
        // Because it determines the entire minting process, account structures, and programs used
        // Changing it mid-collection would break consistency (can't have Legacy and Core NFTs in same collection)
        require!(
            (new_config.metadata_standard as u8) == collection.metadata_standard,
            LaunchpadError::InvalidMetadataStandard
        );
        
        // Update flattened config fields directly (because we don't store nested structs)
        // We unpack the config struct and update everything flat, because that's how we roll
        // (And because nested structs waste padding, and we're not about that wasteful lifestyle)
        collection.max_supply = new_config.max_supply;
        collection.price = new_config.price_per_nft;
        collection.start_time = new_config.start_time;
        // Convert Option<i64> to sentinel -1 (because we're consistent, and also cheap)
        collection.end_time = new_config.end_time.unwrap_or(Collection::DISABLED_I64);
        // Convert Option<u8> to sentinel 0 (because we're efficient like that)
        collection.mint_limit_per_wallet = new_config.mint_limit_per_wallet.unwrap_or(Collection::DISABLED_U8);
        // DO NOT update metadata_standard - it's immutable (see validation above)
        // Convert Option<i64> to sentinel -1 (because we're consistent, and also cheap)
        collection.freeze_until = new_config.freeze_trading_until_date.unwrap_or(Collection::DISABLED_I64);
        // Update the freeze-until-sold-out flag (using our helper method because we're lazy)
        collection.set_freeze_until_sold_out(new_config.freeze_trading_until_sold_out);
        
        log_msg!("Collection config updated");
        Ok(())
    }

    /// Update platform fee percentage (only authority)
    /// This only affects mints, not trading - because we're a launchpad, not a marketplace
    /// Fee is in basis points (e.g., 500 = 5%, 10000 = 100%)
    /// 
    /// Use this to adjust the platform fee (usually to make more money)
    /// (Or less money, if you're feeling generous)
    pub fn update_platform_fee(
        ctx: Context<UpdateCollection>,
        new_platform_fee_basis_points: u16,
    ) -> Result<()> {
        require!(
            new_platform_fee_basis_points <= 10000,
            LaunchpadError::InvalidFeePercentage
        );

        ctx.accounts.collection.platform_fee_bps = new_platform_fee_basis_points;
        log_msg!("Platform fee updated to {} basis points", new_platform_fee_basis_points);
        Ok(())
    }

    /// Set/update base URI in optional CollectionUri PDA (only authority). Creates PDA only when used; collections without URI pay zero rent.
    pub fn update_base_uri(
        ctx: Context<UpdateBaseUri>,
        new_base_uri: String,
    ) -> Result<()> {
        let uri = truncate_uri(new_base_uri, COLLECTION_URI_MAX_LEN);
        let uri_account = &mut ctx.accounts.collection_uri;
        uri_account.base_uri = uri;
        log_msg!("Collection base_uri updated");
        Ok(())
    }

    /// Close CollectionUri PDA and reclaim rent to authority. Call when mint ended or URI no longer needed.
    pub fn close_collection_uri(_ctx: Context<CloseCollectionUri>) -> Result<()> {
        log_msg!("Collection URI PDA closed, rent reclaimed");
        Ok(())
    }

    /// Close MintSplitConfig PDA and reclaim rent to authority. Clear has_split on collection. Call when mint ended or splits no longer needed.
    pub fn close_mint_split_config(ctx: Context<CloseMintSplitConfig>) -> Result<()> {
        ctx.accounts.collection.set_has_split(false);
        log_msg!("Mint split config PDA closed, rent reclaimed");
        Ok(())
    }

    /// Create MintSplitConfig PDA (only authority). Call before setting splits with update_mint_fund_splits.
    pub fn init_mint_split_config(ctx: Context<InitMintSplitConfig>) -> Result<()> {
        let split = &mut ctx.accounts.mint_split_config;
        split.num = 0;
        split.recipients = [Pubkey::default(); 10];
        split.shares = [0u8; 10];
        log_msg!("Mint split config PDA created");
        Ok(())
    }

    /// Update mint fund splits (only authority). Pass num 0 to clear (single creator_wallet). When num > 0, MintSplitConfig PDA must exist (call init_mint_split_config first).
    pub fn update_mint_fund_splits(
        ctx: Context<UpdateMintFundSplits>,
        recipients: [Pubkey; 10],
        shares: [u8; 10],
        num: u8,
    ) -> Result<()> {
        require!(num <= 10, LaunchpadError::InvalidMintSplitCount);
        let collection = &mut ctx.accounts.collection;
        if num == 0 {
            collection.set_has_split(false);
            log_msg!("Mint fund splits cleared (legacy single creator_wallet)");
            return Ok(());
        }
        let split = ctx
            .accounts
            .mint_split_config
            .as_mut()
            .ok_or(LaunchpadError::InvalidMintSplitAccounts)?;
        let mut sum: u16 = 0;
        for i in 0..(num as usize) {
            sum = sum
                .checked_add(shares[i] as u16)
                .ok_or(LaunchpadError::MathOverflow)?;
        }
        require!(sum == 100, LaunchpadError::InvalidMintSplitSum);
        split.num = num;
        split.recipients = recipients;
        split.shares = shares;
        collection.set_has_split(true);
        log_msg!("Mint fund splits updated: {} recipients", num);
        Ok(())
    }

    /// Update allowlist Merkle root (only authority).
    /// Set root to enforce allowlist-phase mints; set to [0u8;32] for public mint.
    /// 
    /// This is how you switch between allowlist and public mint phases
    /// Set a root to enable allowlist-only minting
    /// Clear it ([0u8;32]) to open up public minting
    /// (Because sometimes you want exclusivity, and sometimes you want volume)
    pub fn update_allowlist_root(
        ctx: Context<UpdateCollection>,
        new_root: [u8; 32],
    ) -> Result<()> {
        ctx.accounts.collection.allowlist_root = new_root;
        log_msg!(
            "Allowlist root {}",
            if ctx.accounts.collection.has_allowlist() { "set" } else { "cleared" }
        );
        Ok(())
    }

    /// Update trading freeze settings (only authority)
    /// Can freeze trading until a date or until sold out.
    ///
    /// This lets you control when people can trade the NFTs
    /// Freeze until a date, or until sold out, or both
    /// (Because sometimes you want to prevent secondary sales until everyone gets a chance to mint)
    pub fn update_trading_freeze(
        ctx: Context<UpdateCollection>,
        freeze_trading_until_date: Option<i64>,
        freeze_trading_until_sold_out: bool,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        collection.freeze_until = freeze_trading_until_date.unwrap_or(Collection::DISABLED_I64);
        collection.set_freeze_until_sold_out(freeze_trading_until_sold_out);
        
        log_msg!(
            "Trading freeze updated: until_date={:?}, until_sold_out={}",
            if collection.has_freeze_date() { Some(collection.freeze_until) } else { None },
            freeze_trading_until_sold_out
        );
        Ok(())
    }

    /// Check if trading is currently frozen for this collection
    /// Returns true if trading should be frozen (either by date or until sold out)
    /// This is a view function - doesn't modify state, just checks conditions
    /// Can be called by anyone to check trading status
    /// 
    /// This is like asking "can I trade this NFT right now?"
    /// (And the answer might be "no, because we said so")
    pub fn is_trading_frozen(ctx: Context<CheckTradingStatus>) -> Result<bool> {
        let collection = &ctx.accounts.collection;
        // Get the current time - because time matters for freeze checks
        let clock = Clock::get()?;

        // Use the consolidated helper function (DRY principle)
        let is_frozen = check_trading_frozen(collection, &clock);
        
        if is_frozen {
            log_msg!("Trading is frozen");
        } else {
            log_msg!("Trading is not frozen");
        }
        
        Ok(is_frozen)
    }

    /// Validate that an NFT should be frozen based on collection freeze settings
    /// Returns true if NFT should be frozen, false otherwise
    /// 
    /// Use this during NFT minting to determine if FreezeDelegate should be applied
    /// The actual freeze is applied via Metaplex Core CPI during mint or separately
    /// 
    /// This tells you whether to freeze an NFT when minting it
    /// (Because frozen NFTs can't be traded, which is the whole point)
    pub fn should_freeze_nft(ctx: Context<CheckTradingStatus>) -> Result<bool> {
        let collection = &ctx.accounts.collection;
        // Get the current time - because freeze status depends on time
        let clock = Clock::get()?;
        
        // Check if trading is frozen (using our consolidated helper function)
        let is_frozen = check_trading_frozen(collection, &clock);
        
        // Log the result - because logging is important (and also helps with debugging)
        if is_frozen {
            log_msg!("NFT should be FROZEN: Apply Metaplex FreezeDelegate plugin with frozen=true during mint");
        } else {
            log_msg!("NFT should NOT be frozen: Trading is allowed");
        }
        
        Ok(is_frozen)
    }

    /// Batch check: Should all NFTs in collection be frozen/thawed?
    /// Returns the current freeze state based on collection settings
    /// Use this to determine if you need to batch freeze or thaw all NFTs
    /// 
    /// This tells you the freeze state for the entire collection
    /// (Useful when you need to batch update all NFTs in a collection)
    pub fn get_collection_freeze_state(ctx: Context<CheckTradingStatus>) -> Result<bool> {
        let collection = &ctx.accounts.collection;
        // Get the current time - because freeze state depends on time
        let clock = Clock::get()?;
        
        // Check if trading should be frozen (using consolidated helper)
        let should_be_frozen = check_trading_frozen(collection, &clock);
        
        // Log the state with helpful instructions
        // (Because knowing what to do is half the battle)
        if should_be_frozen {
            log_msg!("Collection FREEZE state: FROZEN - All NFTs should have FreezeDelegate with frozen=true");
            log_msg!("Apply freeze to all NFTs in collection via Metaplex FreezeDelegate plugin");
        } else {
            log_msg!("Collection FREEZE state: THAWED - All NFTs should have FreezeDelegate with frozen=false");
            log_msg!("Thaw all NFTs in collection via Metaplex FreezeDelegate plugin");
        }
        
        Ok(should_be_frozen)
    }

    /// Transfer NFT - enforces trading freeze on-chain
    /// This function checks if trading is frozen and blocks transfers if so
    /// NOTE: With Metaplex Freeze Delegate, frozen NFTs cannot be transferred at all
    /// This function provides an additional check for custom transfer flows
    /// 
    /// This is where we actually enforce the trading freeze
    /// (Because checking is one thing, but blocking is another)
    pub fn transfer_nft(ctx: Context<TransferNFT>) -> Result<()> {
        let collection = &ctx.accounts.collection;
        // Get the current time - because freeze status depends on time
        let clock = Clock::get()?;

        // Check if trading is frozen - ACTUALLY BLOCK THE TRANSFER
        // If trading is frozen, we reject the transfer immediately
        // (Because rules are rules, and we're here to enforce them)
        if check_trading_frozen(collection, &clock) {
            log_msg!("Transfer BLOCKED: Trading is frozen");
            return Err(LaunchpadError::TradingFrozen.into());
        }

        // If we get here, trading is not frozen - allow the transfer
        // NOTE: If NFT is frozen via Metaplex Freeze Delegate, transfer will fail at Metaplex level
        // This check provides additional validation for custom transfer flows
        // (Because double-checking is better than single-checking)
        log_msg!("Transfer ALLOWED: Trading is not frozen");
        
        // TODO: Implement actual NFT transfer via Metaplex/SPL Token
        // The transfer will automatically fail if NFT is frozen via Freeze Delegate
        // (For now, this is just a placeholder that checks freeze status)
        
        Ok(())
    }
}

/// Max Merkle proof depth — supports up to 2^24 leaves. Keeps tx size reasonable.
// This limits how deep the Merkle tree can be (and thus how many leaves it can have)
// We cap it at 24 levels because transaction size matters on Solana
// (And also because 2^24 leaves is probably enough for most allowlists)
const MAX_MERKLE_PROOF_DEPTH: usize = 24;

/// Verify a Merkle proof for allowlist-phase mints.
/// Leaf = keccak256(pubkey); tree uses leaf index to determine left/right at each level.
/// 
/// This verifies that a wallet is actually on the allowlist
/// (Because fake proofs are like fake IDs - they don't work here)
/// 
/// The proof is a path from the leaf to the root of the Merkle tree
/// If the proof is valid, the wallet is on the allowlist
/// If not, they're trying to mint without permission (and we reject them)
fn verify_allowlist_proof(
    leaf: &[u8; 32],
    leaf_index: u32,
    proof: &[[u8; 32]],
    root: &[u8; 32],
) -> bool {
    // Check proof depth - if it's too deep, reject it
    // (Because we don't want to process proofs that are too large)
    if proof.len() > MAX_MERKLE_PROOF_DEPTH {
        return false;
    }
    // Start with the leaf (the wallet's hashed pubkey)
    let mut current = *leaf;
    // Walk up the Merkle tree, combining nodes at each level
    // The leaf_index tells us whether to put current on the left or right
    // (Because Merkle trees are binary, and we need to know the order)
    for (i, sibling) in proof.iter().enumerate() {
        // Get the bit at position i to determine left/right
        let bit = (leaf_index >> i) & 1;
        // Combine current and sibling in the correct order
        let (left, right) = if bit == 0 {
            (current, *sibling)
        } else {
            (*sibling, current)
        };
        // Combine the two nodes into a single array
        let mut combined = [0u8; 64];
        combined[..32].copy_from_slice(&left);
        combined[32..].copy_from_slice(&right);
        // Hash the combined left+right nodes using keccak256 for Merkle tree verification
        // This gives us the parent node in the tree
        let mut hasher = Keccak256::new();
        hasher.update(&combined);
        let hash_result = hasher.finalize();
        current = <&[u8] as TryInto<[u8; 32]>>::try_into(hash_result.as_slice()).unwrap();
    }
    // If the final hash matches the root, the proof is valid
    // (Otherwise, they're trying to fake their way onto the allowlist)
    current == *root
}

// Helper function to check if trading is currently frozen
// Returns true if frozen, false if not frozen
// 
// This is a consolidated helper function that checks both freeze conditions
// (Because we check this in multiple places, and DRY is a thing - Don't Repeat Yourself)
// Now uses optimized struct layout with sentinels and flags (because we're efficient like that)
// 
// We consolidated this because we had the same logic in 3 different places
// (And having duplicate code is like having duplicate keys - it's confusing and wasteful)
// Now we have one function that does it all, and we call it everywhere
// (Because we're lazy, but in a good way - we write code once, use it many times)
fn check_trading_frozen(collection: &Collection, clock: &Clock) -> bool {
    // Check if frozen until sold out (using packed flag - because we're efficient)
    // If the collection isn't sold out yet, trading is frozen
    // (Because we want everyone to get a chance to mint before trading starts)
    // This prevents early whales from flipping NFTs before everyone gets a chance
    // (Because fairness matters, even in the wild west of crypto)
    if collection.freeze_until_sold_out() {
        let is_sold_out = collection.minted >= collection.max_supply;
        if !is_sold_out {
            return true; // Still frozen - not sold out yet (because we want fairness)
        }
    }

    // Check if frozen until a specific date (using sentinel -1 = disabled)
    // If we haven't reached the freeze-until date yet, trading is frozen
    // (Because sometimes you want to freeze trading for a specific period)
    // This lets you freeze trading until a certain date, then allow it
    // (Because sometimes you want to control when trading starts, and that's valid)
    if collection.has_freeze_date() {
        if clock.unix_timestamp < collection.freeze_until {
            return true; // Still frozen - date hasn't passed yet (because time matters)
        }
    }

    // If we get here, trading is not frozen
    // (Which means people can trade freely, for better or worse)
    // (And by "worse" we mean "people can flip NFTs immediately", which some people don't like)
    // (But hey, that's crypto - freedom comes with responsibility, or something like that)
    false
}

// Account validation struct for initializing a collection
// This defines what accounts are needed and how they're validated
// (Because Anchor needs to know what accounts to expect and how to validate them)
#[derive(Accounts)]
pub struct InitializeCollection<'info> {
    // The collection account - this is what we're initializing
    // It's a PDA derived from the authority's pubkey
    // (Because PDAs are deterministic and we can find them later)
    #[account(
        init,
        payer = authority,
        space = 8 + Collection::INIT_SPACE,
        seeds = [b"collection", authority.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,

    // The authority - the one who's initializing the collection
    // They sign the transaction and pay for account creation
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Mint authority for the NFT collection
    /// This is the account that has permission to mint NFTs
    /// (We don't validate it here, we just trust that it's correct)
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Creator's wallet — receives mint payments directly (on mint, not on claim)
    /// This is where the creator gets paid when NFTs are minted
    /// (Because creators need to get paid, or they won't create)
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,

    /// CHECK: Platform wallet to receive platform fees (mint only, not trading)
    /// This is where the platform gets its cut of mint fees
    /// (Because even platforms need to pay the bills)
    pub platform_wallet: UncheckedAccount<'info>,

    // The system program - needed for account creation
    // (Because Solana needs to know how to create accounts)
    pub system_program: Program<'info, System>,
}

// Account validation struct for minting NFTs
// This defines what accounts are needed for a mint transaction
// (Because Anchor needs to know what accounts to expect and how to validate them)
#[derive(Accounts)]
pub struct MintNFT<'info> {
    // The collection account - we need to read and update it
    // (Because we need to check supply, update counts, etc.)
    #[account(mut)]
    pub collection: Account<'info, Collection>,

    // The buyer - the one who's minting the NFT
    // They sign the transaction and pay for everything
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Creator's wallet (receives payment minus platform fee directly on mint)
    /// This is where the creator gets paid (minus our platform fee)
    /// (Because creators need to get paid, or they won't create)
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,

    /// CHECK: Platform wallet (receives platform fee from mints only)
    /// This is where we get our cut of the mint price
    /// (Because even platforms need to pay the bills)
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    /// Wallet mint tracker - tracks how many NFTs this wallet has minted
    /// RENT-OPTIMIZED: Only stores u8 count - PDA seeds prove wallet+collection ownership
    /// PDA derived from collection and buyer to ensure one tracker per wallet per collection
    /// This is how we enforce per-wallet mint limits
    /// (Because we can't let whales hoard all the NFTs - fairness matters, even in crypto)
    /// 
    /// The PDA seeds prove ownership, so we don't need to store wallet/collection again
    /// (Because storing data we can derive is wasteful, and we're not wasteful)
    /// This saves us 64 bytes per tracker, which adds up FAST
    /// (For 1000 minters, that's 64KB saved - which is a lot of SOL in rent)
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + WalletMintTracker::INIT_SPACE,
        seeds = [b"wallet_mint", collection.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub wallet_tracker: Account<'info, WalletMintTracker>,

    /// Optional MintSplitConfig PDA; required when collection.has_split(). Seed = ["split", collection].
    /// When collection.has_split(), client must pass MintSplitConfig PDA. Omitted otherwise.
    #[account(
        mut,
        seeds = [b"split", collection.key().as_ref()],
        bump
    )]
    pub split_config: Option<Account<'info, MintSplitConfig>>,

    // The system program - needed for account creation (if tracker is new)
    // (Because Solana needs to know how to create accounts)
    pub system_program: Program<'info, System>,
}

// Account validation struct for updating collection settings
#[derive(Accounts)]
pub struct UpdateCollection<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,
    pub authority: Signer<'info>,
}

/// Optional base URI PDA. Created only when creator sets URI; collections without URI pay zero rent. Seed = ["uri", collection].
#[derive(Accounts)]
pub struct UpdateBaseUri<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,
    #[account(mut)]
    pub authority: Signer<'info>,
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

/// Close CollectionUri PDA; rent goes to authority.
#[derive(Accounts)]
pub struct CloseCollectionUri<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
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

/// Context for init_mint_split_config: creates MintSplitConfig PDA. Seed = ["split", collection].
#[derive(Accounts)]
pub struct InitMintSplitConfig<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
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

/// Context for update_mint_fund_splits. When num > 0, pass MintSplitConfig PDA (must exist via init_mint_split_config).
#[derive(Accounts)]
pub struct UpdateMintFundSplits<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
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

/// Close MintSplitConfig PDA; rent goes to authority. Clears has_split on collection.
#[derive(Accounts)]
pub struct CloseMintSplitConfig<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
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

/// Context for checking trading status (read-only, no authority required)
/// This is used for read-only operations that check trading freeze status
/// (Because anyone should be able to check if trading is frozen)
#[derive(Accounts)]
pub struct CheckTradingStatus<'info> {
    /// CHECK: Collection account (read-only)
    /// We just need to read the collection config to check freeze status
    /// (No authority required, because checking status doesn't modify anything)
    pub collection: Account<'info, Collection>,
}


/// Context for transferring NFTs with freeze enforcement
/// This defines what accounts are needed for an NFT transfer
/// (Because we need to check freeze status before allowing transfers)
#[derive(Accounts)]
pub struct TransferNFT<'info> {
    /// CHECK: Collection account (read-only, to check freeze status)
    /// We need this to check if trading is frozen
    /// (Because we can't allow transfers if trading is frozen)
    pub collection: Account<'info, Collection>,

    /// CHECK: NFT mint account (to verify it belongs to this collection)
    /// In a real implementation, you'd verify the NFT belongs to the collection
    /// (For now, we just trust that it's correct)
    pub nft_mint: UncheckedAccount<'info>,

    /// CHECK: Current owner of the NFT
    /// This is who's sending the NFT
    /// (They need to have the NFT, or the transfer will fail)
    #[account(mut)]
    pub from: UncheckedAccount<'info>,

    /// CHECK: New owner of the NFT
    /// This is who's receiving the NFT
    /// (They'll own it after the transfer, if we allow it)
    #[account(mut)]
    pub to: UncheckedAccount<'info>,

    /// CHECK: Authority signing the transfer (usually the current owner)
    /// This is who's authorizing the transfer
    /// (Usually the current owner, but could be a delegate)
    pub authority: Signer<'info>,

    /// CHECK: Token program for SPL Token transfers
    /// This is the program that handles the actual token transfer
    /// (Because we don't handle transfers ourselves, we delegate to SPL Token)
    pub token_program: UncheckedAccount<'info>,
}

// Candy Machine–style minimal core: ~214 bytes + 8 discriminator ≈ 0.02–0.03 SOL rent.
//
// We do NOT store: base_uri, metadata strings, split arrays, royalty logic.
// Those live in optional PDAs (CollectionUri, MintSplitConfig) or off-chain / client.
// On-chain is enforcement only; complexity stays in SDKs and backend.
//
// Layout (fixed, always needed at mint):
//   authority, mint_authority, creator_wallet, platform_wallet (4×32)
//   max_supply, minted, price, start_time, end_time, freeze_until
//   platform_fee_bps, mint_limit_per_wallet, metadata_standard, flags
//   allowlist_root (32), bump
#[account]
#[derive(InitSpace)]
pub struct Collection {
    pub authority: Pubkey,
    pub mint_authority: Pubkey,
    pub creator_wallet: Pubkey,
    pub platform_wallet: Pubkey,
    pub max_supply: u64,
    pub minted: u64,
    pub price: u64,
    pub start_time: i64,
    pub end_time: i64,       // -1 = disabled
    pub freeze_until: i64,   // -1 = disabled
    pub platform_fee_bps: u16,
    pub mint_limit_per_wallet: u8, // 0 = unlimited
    pub metadata_standard: u8,     // 0=Legacy .. 7=Custom
    pub flags: u8,                 // bit0=paused, bit1=freeze_until_sold_out, bit2=has_split
    pub allowlist_root: [u8; 32],   // [0;32] = public mint
    pub bump: u8,
}

// Flag constants and helper methods for the Collection struct
// Because we need to actually USE these flags, not just set them
// (And helper methods make the code cleaner, which is important when you're debugging at 3am)
impl Collection {
    // Flag constants for our bitmask - because magic numbers are bad, named constants are good
    // (And because we're professionals, even if we write cheeky comments)
    pub const FLAG_PAUSED: u8 = 1 << 0;
    pub const FLAG_FREEZE_UNTIL_SOLD_OUT: u8 = 1 << 1;
    pub const FLAG_HAS_SPLIT: u8 = 1 << 2;
    
    // Sentinel values - because None costs bytes, and we're cheap
    // We use these instead of Options because Options waste space
    // (And we're not about that wasteful lifestyle)
    pub const DISABLED_I64: i64 = -1; // -1 = disabled (because timestamps can't be negative, so this is safe)
    pub const DISABLED_U8: u8 = 0; // 0 = unlimited/disabled (because 0 is a nice round number)
    
    // Helper methods for flags - because bit manipulation is hard, and we want easy APIs
    // (Also because we're lazy, and helper methods make our lives easier)
    pub fn is_paused(&self) -> bool {
        // Check if the paused flag is set (because we need to know if minting is paused)
        // (And because checking flags manually is error-prone, so we wrap it in a function)
        self.flags & Self::FLAG_PAUSED != 0
    }
    
    pub fn set_paused(&mut self, paused: bool) {
        // Set or clear the paused flag (because we need to control minting)
        // (And because bit manipulation is fun, but we want it to be safe)
        if paused {
            self.flags |= Self::FLAG_PAUSED; // Set the bit (because we're pausing)
        } else {
            self.flags &= !Self::FLAG_PAUSED; // Clear the bit (because we're resuming)
        }
    }
    
    pub fn freeze_until_sold_out(&self) -> bool {
        // Check if we're freezing until sold out (because we want everyone to get a chance)
        // (And because checking this manually is annoying, so we made a helper)
        self.flags & Self::FLAG_FREEZE_UNTIL_SOLD_OUT != 0
    }
    
    pub fn set_freeze_until_sold_out(&mut self, freeze: bool) {
        if freeze {
            self.flags |= Self::FLAG_FREEZE_UNTIL_SOLD_OUT;
        } else {
            self.flags &= !Self::FLAG_FREEZE_UNTIL_SOLD_OUT;
        }
    }
    
    pub fn has_split(&self) -> bool {
        self.flags & Self::FLAG_HAS_SPLIT != 0
    }
    
    pub fn set_has_split(&mut self, has: bool) {
        if has {
            self.flags |= Self::FLAG_HAS_SPLIT;
        } else {
            self.flags &= !Self::FLAG_HAS_SPLIT;
        }
    }
    
    // Helper methods for sentinels - because checking sentinels manually is error-prone
    // (And because we want readable code, not cryptic sentinel checks everywhere)
    pub fn has_end_time(&self) -> bool {
        // Check if we have an end time (because not all mints have end times)
        // (And because checking for -1 manually is ugly, so we made it pretty)
        self.end_time != Self::DISABLED_I64
    }
    
    pub fn has_freeze_date(&self) -> bool {
        // Check if we have a freeze date (because not all collections freeze trading)
        // (And because we want readable code, not magic number checks)
        self.freeze_until != Self::DISABLED_I64
    }
    
    pub fn has_allowlist(&self) -> bool {
        // Check if we have an allowlist (because not all mints are allowlist-only)
        // (And because checking for [0u8;32] manually is annoying, so we made it easy)
        self.allowlist_root != [0u8; 32]
    }
    
    pub fn has_mint_limit(&self) -> bool {
        self.mint_limit_per_wallet != Self::DISABLED_U8
    }
}

/// Optional base URI PDA. Only created when creator sets URI; collections without URI pay zero rent. Seed = ["uri", collection].
#[account]
#[derive(InitSpace)]
pub struct CollectionUri {
    #[max_len(COLLECTION_URI_MAX_LEN)]
    pub base_uri: String,
}

/// Mint split config in separate PDA; only created when splits are used. Seed = ["split", collection].
#[account]
#[derive(InitSpace)]
pub struct MintSplitConfig {
    pub num: u8,
    pub recipients: [Pubkey; 10],
    pub shares: [u8; 10],
}

/// Metadata standard for the collection. Set by creator at creation; all mints use this.
/// 
/// THE COMPLETE REALITY MAP: All NFT/digital asset standards on Solana that developers actually encounter.
/// This is the future-proof enum that matches reality - because we're coding during a transition era.
/// 
/// Cost estimates (on-chain costs; we don't add fees):
/// - Legacy: ~0.021 SOL (expensive but universal)
/// - Programmable: ~0.021 SOL + rule set costs (enforced royalties)
/// - Core: ~0.008 SOL (cheaper, future-proof)
/// - Compressed: ~0.005 SOL (dirt cheap, millions possible)
/// - SemiFungible: ~0.021 SOL (NFT metadata + fungible supply)
/// - Token2022: Variable (newer, more features)
/// - NativeMetadata: Variable (SPL native, no Metaplex)
/// - Custom: Variable (private implementations)
/// 
/// NOTE: Stored as u8 in Collection struct to save space
/// (Because storing the full enum wastes bytes, and we're not about that wasteful lifestyle)
/// We use #[repr(u8)] to ensure the enum values match their u8 representation
/// (Because we want predictable conversions, not surprises)
/// 
/// Migration path: Legacy → pNFT → Core → Token-2022 Native Assets
/// (You're literally coding during a transition era - embrace it)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum MetadataStandard {
    /// Metaplex Legacy NFT (Token Metadata) - AKA "Classic NFT"
    /// Program: mpl-token-metadata
    /// Uses SPL Token (mint = 1, decimals = 0)
    /// External JSON metadata, royalties optional, high rent cost
    /// Still dominates marketplaces - universal support, tooling everywhere
    /// (Because sometimes you need compatibility, even if it costs more)
    /// Pros: Universal support, tooling everywhere
    /// Cons: Expensive, no enforced royalties
    Legacy = 0,
    
    /// Programmable NFT (pNFT) - AKA Rule-based NFT, Enforced Royalty NFT
    /// Built on Token Metadata program, adds rule sets
    /// Enforced royalties, transfer restrictions, staking locks, gating logic
    /// Used by games, royalty-sensitive projects, utility NFTs
    /// This is NOT legacy — it's an extension layer on top of Legacy
    /// (Because sometimes you need rules, and rules need enforcement)
    Programmable = 1,
    
    /// Metaplex Core (Digital Asset Standard) - AKA DAS, Core Asset
    /// New Metaplex protocol, no SPL token mint required
    /// Lower account count, lower rent, designed to replace legacy NFTs long-term
    /// (Because the future is cheaper, and we're building for the future)
    /// Pros: Much cheaper, cleaner account model, better composability
    /// Cons: Marketplace support still catching up
    Core = 2,
    
    /// Compressed NFT (cNFT) - AKA Bubblegum NFT
    /// Stored in Merkle Trees, uses state compression
    /// Off-chain proof verification, extremely cheap
    /// (Because sometimes you want millions of NFTs, and that's valid)
    /// Pros: Millions of NFTs possible, dirt cheap minting
    /// Cons: Limited programmability, harder UX, no native token ownership
    Compressed = 3,
    
    /// Semi-Fungible Token (SFT)
    /// TokenStandard::SemiFungible, supply > 1
    /// NFT-style metadata with fungible supply
    /// Used for game items, tickets, badges, packs
    /// (Because sometimes you want NFT metadata but multiple copies - like trading cards)
    /// Basically NFT metadata + fungible supply
    SemiFungible = 4,
    
    /// Token-2022 NFTs
    /// NFTs built using spl-token-2022 instead of legacy SPL Token
    /// Features: Transfer hooks, confidential transfers, native royalties (in progress), metadata extensions
    /// This is where Solana core devs are pushing long-term
    /// (Because the future is Token-2022, and we're ready for it)
    Token2022 = 5,
    
    /// SPL Token Extensions Metadata - AKA Token-2022 Metadata Extension
    /// Native SPL token metadata, no Metaplex dependency
    /// Stored directly in token account
    /// Supports: Name, Symbol, URI, Custom fields
    /// Used by people trying to move away from Metaplex monopoly
    /// (Because sometimes you want to break free from the ecosystem, and that's valid)
    NativeMetadata = 6,
    
    /// Custom / Private Standards
    /// Custom metadata programs, custom NFT logic, custom asset registries
    /// Non-standard private implementations (WNS, spNFT, SPL-404, Nifty, etc.)
    /// (Because sometimes you need something custom, and that's okay)
    /// Think of it as the "escape hatch" for experimental standards
    Custom = 7,
}

// On-chain: only from_u8 for validation. Name, program_id, cost, etc. live in client/SDK to reduce binary size.
impl MetadataStandard {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(MetadataStandard::Legacy),
            1 => Some(MetadataStandard::Programmable),
            2 => Some(MetadataStandard::Core),
            3 => Some(MetadataStandard::Compressed),
            4 => Some(MetadataStandard::SemiFungible),
            5 => Some(MetadataStandard::Token2022),
            6 => Some(MetadataStandard::NativeMetadata),
            7 => Some(MetadataStandard::Custom),
            _ => None,
        }
    }
}

// CollectionConfig - DEPRECATED: Now flattened into Collection struct
// Kept for backward compatibility with initialize_collection function signature
// This struct is only used for input parsing, not on-chain storage
// (Because we flattened everything to save rent - no nested structs means less padding)
// Think of this as a temporary container that gets unpacked into the Collection struct
// (Like unpacking groceries - you don't keep the bags, you put everything in the fridge)
// We keep it because changing function signatures is annoying, and we're lazy
// (But we don't store it on-chain, because that would be wasteful, and we're not wasteful)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionConfig {
    pub max_supply: u64,
    pub price_per_nft: u64,
    pub start_time: i64,
    pub end_time: Option<i64>, // Still Option here because it's input - we convert to sentinel on-chain
    pub mint_limit_per_wallet: Option<u8>, // Still Option here because it's input - we convert to sentinel on-chain
    pub metadata_standard: MetadataStandard,
    pub freeze_trading_until_date: Option<i64>, // Still Option here because it's input - we convert to sentinel on-chain
    pub freeze_trading_until_sold_out: bool,
}

/// Tracks how many NFTs a specific wallet has minted from a collection
/// RENT-OPTIMIZED: Only stores the count - PDA seeds prove wallet+collection ownership
/// 
/// This is how we enforce per-wallet mint limits
/// (Because we can't let whales hoard all the NFTs - fairness matters, even in crypto)
/// 
/// MASSIVE SAVINGS: Removed wallet (32 bytes) + collection (32 bytes) = 64 bytes saved per tracker
/// PDA derivation already proves ownership, so we don't need to store it again
/// (Because storing data we can derive is wasteful, and we're not wasteful)
/// 
/// Before: 73 bytes per tracker (32 + 32 + 8 + 1)
/// After: ~9 bytes per tracker (1 byte + discriminator)
/// Savings: ~64 bytes per tracker, which adds up FAST when you have many minters
/// (For 1000 minters, that's 64KB saved - which is a lot of SOL in rent)
/// 
/// We use u8 instead of u64 because mint limits are typically small (max 255)
/// (Because if someone needs to mint more than 255 NFTs, they can use multiple wallets)
/// (And because we're not about to let one wallet hoard everything anyway)
#[account]
#[derive(InitSpace)]
pub struct WalletMintTracker {
    // How many NFTs this wallet has minted from this collection
    // Using u8 since mint limits are typically small (max 255)
    // (Because we need to track this to enforce limits, but we don't need u64 for small limits)
    // The PDA seeds (wallet + collection) prove ownership, so we don't store them
    // (Because storing data we can derive is like storing your address when you're already at home)
    pub minted: u8,
}

// Error codes for the launchpad program
// These are the various ways things can go wrong
// (And trust us, things will go wrong. That's why we have error codes.)
#[error_code]
pub enum LaunchpadError {
    // Start time is in the past (time travel not supported yet)
    #[msg("Invalid start time")]
    InvalidStartTime,
    // Supply is zero or invalid (can't have a collection with no NFTs)
    #[msg("Invalid supply")]
    InvalidSupply,
    // Minting is currently paused (usually because something broke)
    #[msg("Minting is paused")]
    MintingPaused,
    // Minting hasn't started yet (patience is a virtue)
    #[msg("Minting has not started yet")]
    MintingNotStarted,
    // Minting has ended (all good things must come to an end)
    #[msg("Minting has ended")]
    MintingEnded,
    // Trying to mint more than the max supply (infinite NFTs not supported)
    #[msg("Supply exceeded")]
    SupplyExceeded,
    // Not authorized to perform this action (permissions matter)
    #[msg("Unauthorized")]
    Unauthorized,
    // Metadata standard cannot be changed after collection creation (it's immutable)
    #[msg("Metadata standard cannot be changed")]
    InvalidMetadataStandard,
    // Math overflow (numbers got too big, which is bad)
    #[msg("Math overflow")]
    MathOverflow,
    // Wallet has exceeded its mint limit (no hoarding allowed)
    #[msg("Mint limit per wallet exceeded")]
    MintLimitExceeded,
    // Fee percentage is invalid (must be 0-10000 basis points)
    #[msg("Invalid fee percentage (must be 0-10000 basis points)")]
    InvalidFeePercentage,
    // Trading is frozen (can't transfer NFTs right now)
    #[msg("Trading is frozen - transfers are blocked until conditions are met")]
    TradingFrozen,
    // Trading is not frozen (can't perform freeze operation)
    #[msg("Trading is not frozen - cannot perform freeze operation")]
    TradingNotFrozen,
    // Allowlist phase is active, but no proof was provided
    #[msg("Allowlist phase active: valid Merkle proof and leaf index required")]
    AllowlistRequired,
    // Allowlist proof is invalid or wallet is not on the allowlist
    #[msg("Allowlist proof invalid or wallet not in allowlist")]
    AllowlistInvalid,
    // Public mint is active, but proof data was provided (unnecessary)
    #[msg("Public mint: do not pass allowlist proof or leaf index")]
    AllowlistNotRequired,
    // Mint fund split: num must be 0-10
    #[msg("Invalid mint fund split count (must be 0-10)")]
    InvalidMintSplitCount,
    // Mint fund split: shares must sum to 100
    #[msg("Invalid mint fund split: shares must total 100")]
    InvalidMintSplitSum,
    // Mint fund split: remaining_accounts must match recipients and count
    #[msg("Invalid mint fund split: pass recipient wallets in order as remaining_accounts")]
    InvalidMintSplitAccounts,
}

// Coded by Juan - because every good program needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - If this breaks, it's not my fault. Blame the blockchain.
// P.P.S. - Actually, if this breaks, it probably is my fault. But still blame the blockchain.
