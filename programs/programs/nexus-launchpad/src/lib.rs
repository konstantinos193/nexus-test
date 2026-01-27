use anchor_lang::prelude::*;

declare_id!("w6ELig1b3oETMQmiJkvPtyu99fnPwAGMJYSnaTXphma");

#[program]
pub mod nexus_launchpad {
    use super::*;

    /// Initialize a new collection launchpad
    pub fn initialize_collection(
        ctx: Context<InitializeCollection>,
        collection_config: CollectionConfig,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        let clock = Clock::get()?;

        // Validate start time
        require!(
            collection_config.start_time >= clock.unix_timestamp,
            LaunchpadError::InvalidStartTime
        );

        // Validate supply
        require!(
            collection_config.max_supply > 0,
            LaunchpadError::InvalidSupply
        );

        collection.authority = ctx.accounts.authority.key();
        collection.mint_authority = ctx.accounts.mint_authority.key();
        collection.treasury = ctx.accounts.treasury.key();
        collection.config = collection_config;
        collection.minted_count = 0;
        collection.is_paused = false;
        collection.bump = ctx.bumps.collection;

        msg!("Collection initialized: {}", collection.key());
        Ok(())
    }

    /// Mint an NFT from the collection
    pub fn mint(ctx: Context<MintNFT>, quantity: u8) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        let clock = Clock::get()?;

        // Check if paused
        require!(!collection.is_paused, LaunchpadError::MintingPaused);

        // Check time constraints
        require!(
            clock.unix_timestamp >= collection.config.start_time,
            LaunchpadError::MintingNotStarted
        );

        if let Some(end_time) = collection.config.end_time {
            require!(
                clock.unix_timestamp <= end_time,
                LaunchpadError::MintingEnded
            );
        }

        // Check supply
        require!(
            collection.minted_count + quantity as u64 <= collection.config.max_supply,
            LaunchpadError::SupplyExceeded
        );

        // Check mint limit per wallet - because we can't let whales hoard all the NFTs
        if let Some(limit) = collection.config.mint_limit_per_wallet {
            let tracker = &mut ctx.accounts.wallet_tracker;
            
            // Initialize tracker fields if this is a new account (wallet is default/uninitialized)
            // The PDA derivation ensures this tracker is unique per wallet+collection combo
            if tracker.wallet == Pubkey::default() {
                tracker.wallet = ctx.accounts.buyer.key();
                tracker.collection = collection.key();
                // Get the bump from the account's bump seed
                let (_, bump) = Pubkey::find_program_address(
                    &[
                        b"wallet_mint",
                        collection.key().as_ref(),
                        ctx.accounts.buyer.key().as_ref(),
                    ],
                    ctx.program_id,
                );
                tracker.bump = bump;
            } else {
                // Verify this tracker belongs to the correct wallet and collection
                // Extra safety check - PDA should prevent this, but paranoia is healthy
                require!(
                    tracker.wallet == ctx.accounts.buyer.key() 
                        && tracker.collection == collection.key(),
                    LaunchpadError::Unauthorized
                );
            }

            // Check if this mint would exceed the limit (no hoarding allowed!)
            require!(
                tracker.minted_count + quantity as u64 <= limit as u64,
                LaunchpadError::MintLimitExceeded
            );

            // Update the tracker with the new mint count
            tracker.minted_count = tracker
                .minted_count
                .checked_add(quantity as u64)
                .ok_or(LaunchpadError::MathOverflow)?;
        }

        // Transfer payment (mint price only; Core/Legacy/cNFT costs are on-chain realities, not extra fees)
        let price = collection.config.price_per_nft
            .checked_mul(quantity as u64)
            .ok_or(LaunchpadError::MathOverflow)?;

        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &collection.treasury.key(),
                price,
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        // Update minted count
        collection.minted_count = collection
            .minted_count
            .checked_add(quantity as u64)
            .ok_or(LaunchpadError::MathOverflow)?;

        msg!(
            "Minted {} NFTs. Total minted: {}",
            quantity,
            collection.minted_count
        );

        Ok(())
    }

    /// Pause minting
    pub fn pause(ctx: Context<UpdateCollection>) -> Result<()> {
        ctx.accounts.collection.is_paused = true;
        msg!("Minting paused");
        Ok(())
    }

    /// Resume minting
    pub fn resume(ctx: Context<UpdateCollection>) -> Result<()> {
        ctx.accounts.collection.is_paused = false;
        msg!("Minting resumed");
        Ok(())
    }

    /// Update collection configuration (only authority)
    pub fn update_config(
        ctx: Context<UpdateCollection>,
        new_config: CollectionConfig,
    ) -> Result<()> {
        ctx.accounts.collection.config = new_config;
        msg!("Collection config updated");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCollection<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Collection::LEN,
        seeds = [b"collection", authority.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Mint authority for the NFT collection
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Treasury account to receive payments
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub collection: Account<'info, Collection>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Treasury account
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    /// Wallet mint tracker - tracks how many NFTs this wallet has minted
    /// PDA derived from collection and buyer to ensure one tracker per wallet per collection
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + WalletMintTracker::LEN,
        seeds = [b"wallet_mint", collection.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub wallet_tracker: Account<'info, WalletMintTracker>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCollection<'info> {
    #[account(
        mut,
        has_one = authority @ LaunchpadError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    pub authority: Signer<'info>,
}

#[account]
pub struct Collection {
    pub authority: Pubkey,
    pub mint_authority: Pubkey,
    pub treasury: Pubkey,
    pub config: CollectionConfig,
    pub minted_count: u64,
    pub is_paused: bool,
    pub bump: u8,
}

impl Collection {
    pub const LEN: usize = 32 + 32 + 32 + CollectionConfig::LEN + 8 + 1 + 1;
}

/// Metadata standard for the collection. Set by creator at creation; all mints use this.
/// Core ~0.008 SOL, Legacy ~0.021 SOL, cNFT ~0.005 SOL (on-chain costs; we don't add fees).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MetadataStandard {
    /// Metaplex Core (Digital Asset Standard) — lower fees
    Core,
    /// Metaplex Legacy (Token Metadata)
    Legacy,
    /// Compressed NFT — lowest fees
    Cnft,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionConfig {
    pub max_supply: u64,
    pub price_per_nft: u64, // in lamports
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub mint_limit_per_wallet: Option<u8>,
    /// Creator chooses at collection creation; mints produce this type (Core/Legacy/cNFT).
    pub metadata_standard: MetadataStandard,
}

impl CollectionConfig {
    pub const LEN: usize = 8 + 8 + 8 + (1 + 8) + (1 + 1) + 1; // +1 for MetadataStandard enum
}

/// Tracks how many NFTs a specific wallet has minted from a collection
/// Because we need to keep track of who's been naughty and minted too many
#[account]
pub struct WalletMintTracker {
    pub wallet: Pubkey,
    pub collection: Pubkey,
    pub minted_count: u64,
    pub bump: u8,
}

impl WalletMintTracker {
    pub const LEN: usize = 32 + 32 + 8 + 1;
}

#[error_code]
pub enum LaunchpadError {
    #[msg("Invalid start time")]
    InvalidStartTime,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Minting is paused")]
    MintingPaused,
    #[msg("Minting has not started yet")]
    MintingNotStarted,
    #[msg("Minting has ended")]
    MintingEnded,
    #[msg("Supply exceeded")]
    SupplyExceeded,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Mint limit per wallet exceeded")]
    MintLimitExceeded,
}
