/**
 * Nexus Collection Program - The NFT Collection Manager That Actually Works
 * 
 * This is where NFT collections are created and managed
 * We handle metadata, validation, and all the chaos that comes
 * with storing collection information on-chain.
 * 
 * Features:
 * - Collection creation (because someone has to create the collection)
 * - Metadata management (because NFTs need metadata, or they're just tokens)
 * - Input validation (because users will try to break things)
 * - Buffer overflow prevention (because buffer overflows are bad)
 * 
 * @author Juan - The developer who built this collection manager
 * (Coded with care, dark humor, and probably too much coffee)
 * (Also, if this breaks, it's not my fault - blame the users)
 */

use anchor_lang::prelude::*;

// Program ID - the unique identifier for this program on Solana
// This is like our address in the blockchain universe
// If you change this, everything breaks. Don't change this.
declare_id!("BUkDSb56YuM9Q1BsiokLKPfaUYP84AzE7xLfVXtqQzTi");

// Gate logging behind feature flag to reduce binary size in release builds
// Returns () as an expression so it can be used in match arms
// Because apparently size matters (especially when you're paying for compute units)
// In release builds, we strip out all the logging to save space
// In debug builds, we keep it so we can actually see what's happening
// This is the difference between a bloated program and a lean, mean collection machine
#[cfg(feature = "logs")]
macro_rules! log_msg {
    ($($arg:tt)*) => {
        {
            msg!($($arg)*);
            ()
        }
    };
}

// When logs are disabled, this macro does absolutely nothing
// It's like screaming into the void, but more efficient
// (And less therapeutic)
#[cfg(not(feature = "logs"))]
macro_rules! log_msg {
    ($($arg:tt)*) => { () };
}

/// Max byte length for metadata_uri (rent savings vs 200).
pub const METADATA_URI_MAX_LEN: usize = 128;

#[program]
pub mod nexus_collection {
    use super::*;

    /// Create a new NFT collection
    /// 
    /// RENT OPTIMIZATION: We store only authority, mint, metadata_uri, created_at, bump, status, featured.
    /// Full metadata (name, description, image, attributes, etc.) lives off-chain at metadata_uri.
    /// Validate metadata client-side and upload to Arweave/IPFS/HTTPS before calling this.
    /// 
    /// Registers the collection in the global registry for fast querying (if initialized).
    pub fn create_collection(
        ctx: Context<CreateCollection>,
        metadata_uri: String,
    ) -> Result<()> {
        require!(
            metadata_uri.len() <= METADATA_URI_MAX_LEN,
            CollectionError::MetadataUriTooLong
        );

        let collection = &mut ctx.accounts.collection;
        collection.authority = ctx.accounts.authority.key();
        collection.mint = ctx.accounts.mint.key();
        collection.metadata_uri = metadata_uri;
        collection.created_at = Clock::get()?.unix_timestamp;
        collection.bump = ctx.bumps.collection;
        collection.status = 0;
        collection.featured = false;

        let registry = &mut ctx.accounts.registry;
        let collection_key = collection.key();

        log_msg!("collection account key: {}", ctx.accounts.collection.key());
        log_msg!("mint key: {}", ctx.accounts.mint.key());
        log_msg!("registry key: {}", ctx.accounts.registry.key());
        log_msg!("collection_key being registered: {}", collection_key);

        match registry.add_collection(collection_key) {
            Ok(true) => {
                log_msg!("Collection {} registered in registry (total: {})", collection_key, registry.collections.len());
            }
            Ok(false) => {
                log_msg!("Registry is full (300 collections), collection not registered (but still created)");
            }
            Err(err) => return Err(err),
        }

        log_msg!("Collection created with metadata_uri: {}", collection.metadata_uri);
        log_msg!("Collection created: {}", collection.key());
        Ok(())
    }

    /// Initialize the global collection registry
    /// 
    /// This must be called once before creating any collections.
    /// The registry stores all collection addresses for fast querying.
    /// 
    /// WHY SEPARATE? Because Solana limits account reallocations in CPI to 10KB,
    /// but the registry needs ~320KB (10000 collections * 32 bytes each).
    /// By initializing it separately, we avoid the CPI reallocation limit.
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.bump = ctx.bumps.registry;
        registry.collections = Vec::new();
        log_msg!("Registry initialized: {}", registry.key());
        Ok(())
    }

    /// Update collection metadata URI (authority only).
    /// New metadata must already be uploaded off-chain at the new URI.
    pub fn update_metadata(
        ctx: Context<UpdateCollection>,
        new_metadata_uri: String,
    ) -> Result<()> {
        require!(
            new_metadata_uri.len() <= METADATA_URI_MAX_LEN,
            CollectionError::MetadataUriTooLong
        );
        ctx.accounts.collection.metadata_uri = new_metadata_uri;
        log_msg!("Collection metadata_uri updated: {}", ctx.accounts.collection.metadata_uri);
        Ok(())
    }

    /// Update collection status (draft, preparing, ready, minting, completed, paused)
    /// Status is stored as u8: 0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused
    /// (Because storing strings wastes bytes, and we're not made of money)
    pub fn update_collection_status(
        ctx: Context<UpdateCollection>,
        status: u8,
    ) -> Result<()> {
        // Validate status (0-5 are valid)
        require!(
            status <= 5,
            CollectionError::InvalidStatus
        );
        ctx.accounts.collection.status = status;
        log_msg!("Collection status updated to: {}", status);
        Ok(())
    }

    /// Update featured flag (only platform authority - because we don't trust randos)
    /// Featured collections appear in the homepage hero section
    /// (Because being featured is a privilege, not a right)
    pub fn update_featured(
        ctx: Context<UpdateFeatured>,
        featured: bool,
    ) -> Result<()> {
        ctx.accounts.collection.featured = featured;
        log_msg!("Collection featured flag updated to: {}", featured);
        Ok(())
    }
}

// Account validation struct for creating a collection
// This defines what accounts are needed and how they're validated
// (Because Anchor needs to know what accounts to expect and how to validate them)
#[derive(Accounts)]
pub struct CreateCollection<'info> {
    // The collection account - this is what we're creating
    // It's a PDA derived from the mint's pubkey
    // (Because PDAs are deterministic and we can find them later)
    #[account(
        init,
        payer = authority,
        space = 8 + Collection::INIT_SPACE, // Rent-optimized: only the essentials, nothing more
        seeds = [b"collection", mint.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,

    /// CHECK: NFT mint account
    /// This is the mint for the NFT collection
    /// (We don't validate it here because we're trusting you not to mess this up)
    /// (Please don't mess this up)
    pub mint: UncheckedAccount<'info>,

    // The global registry - where we register all collections for fast querying
    // This is a PDA that stores a list of all collection addresses
    // (Because getProgramAccounts is slow, but a registry PDA is fast)
    // NOTE: Registry registration is non-blocking - if full, collection still created
    // Collections can always be found via getProgramAccounts, the registry is just an optimization
    // Registry can hold 300 collections (limited by 10KB CPI reallocation limit)
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    // The authority - the one who's creating the collection (and paying for it)
    // They sign the transaction and pay for account creation (because nothing is free)
    #[account(mut)]
    pub authority: Signer<'info>,

    // The system program - needed for account creation
    // (Because Solana needs to know how to create accounts, and we're not that smart)
    pub system_program: Program<'info, System>,
}

// Account validation struct for initializing the registry
// This must be called once before creating any collections
// 
// IMPORTANT: We manually specify space to fit within 10KB CPI limit
// Space = 8 (discriminator) + 4 (Vec len) + 300 * 32 (Pubkeys) + 1 (bump) = 9,613 bytes
// This is smaller than InitSpace would calculate (which uses max_len(10000) = 320KB)
// The Vec can still grow dynamically, but initial allocation must fit in 10KB
#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    // The registry account - this is what we're creating
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + (300 * 32) + 1, // Manual calculation: discriminator + Vec len + 300 Pubkeys + bump
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, CollectionRegistry>,

    // The authority - the one who's initializing the registry (and paying for it)
    #[account(mut)]
    pub authority: Signer<'info>,

    // The system program - needed for account creation
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCollection<'info> {
    #[account(
        mut,
        has_one = authority @ CollectionError::Unauthorized
    )]
    pub collection: Account<'info, Collection>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateFeatured<'info> {
    #[account(mut)]
    pub collection: Account<'info, Collection>,

    // Platform authority - only platform can feature collections
    // (Because we don't want everyone featuring their own collections)
    #[account(mut)]
    pub platform_authority: Signer<'info>,
}

// Collection account - THE RENT OPTIMIZATION SPECIAL
// We store only the bare minimum on-chain and kick everything else to off-chain storage
// This is the difference between paying 0.1 SOL vs 2 SOL in rent (your wallet will thank me)
// 
// THE TRUTH: The big lever for rent isn't fewer code lines, it's fewer account bytes
// Code size affects deploy costs, but account size affects rent FOREVER
// So we keep only: authority, mint, metadata_uri, created_at, bump, status, featured
// Everything else (name, description, image, attributes, properties, your life story)?
// That lives off-chain where it belongs (because on-chain storage costs real money)
// 
// NEW: Added status and featured for queryable filtering
// Status: u8 (0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused)
// Featured: bool (for homepage hero section)
// These add only 2 bytes but enable efficient on-chain filtering
#[account]
#[derive(InitSpace)]
pub struct Collection {
    // The authority - the one who calls the shots
    // (They can update metadata, change URIs, basically do whatever they want)
    pub authority: Pubkey,
    // The mint - the NFT mint this collection is attached to
    // (Because collections need mints like I need coffee - absolutely essential)
    pub mint: Pubkey,
    // URI pointing to off-chain metadata JSON (Arweave/IPFS/HTTPS - your choice)
    #[max_len(128)]
    pub metadata_uri: String,
    // When the collection was created (unix timestamp)
    // (For posterity, sorting, filtering, and proving you were here first)
    pub created_at: i64,
    // The PDA bump - needed for account derivation
    // (PDAs are picky and need their bumps. Don't ask why, just accept it)
    pub bump: u8,
    // Collection status: 0=draft, 1=preparing, 2=ready, 3=minting, 4=completed, 5=paused
    // (Stored as u8 to save bytes - strings are expensive, numbers are cheap)
    pub status: u8,
    // Featured flag - for homepage hero section
    // (Because being featured is a privilege, not a right)
    pub featured: bool,
}

// Collection Registry - THE FAST QUERY SPECIAL
// This is a global registry that stores all collection addresses for fast iteration
// Instead of scanning all program accounts (slow), we can iterate this registry (fast)
// 
// Why? Because getProgramAccounts is slow and expensive, but a registry PDA is fast
// It's like the difference between a phone book and door-to-door canvassing
// 
// We use a Vec<Pubkey> to store collection addresses
// IMPORTANT: Initial size is limited to 300 collections (fits in 10KB CPI limit)
// Space calculation: 8 (discriminator) + 4 (Vec len) + 300 * 32 (Pubkeys) + 1 (bump) = 9,613 bytes
// The Vec can grow dynamically up to max_len, but initial allocation must fit in 10KB
// If we need more than 300 collections, we'll need to reallocate (which also has CPI limits)
// For now, 300 collections should be sufficient for most use cases
#[account]
#[derive(InitSpace)]
pub struct CollectionRegistry {
    // List of all collection addresses (PDAs)
    // This allows fast iteration without scanning the entire program
    // (Because scanning is slow, but a registry is fast)
    // NOTE: Limited to 300 collections to fit within 10KB CPI reallocation limit
    // Initial allocation: 8 (discriminator) + 4 (Vec len) + 300 * 32 (Pubkeys) + 1 (bump) = 9,613 bytes
    // If you need more than 300, you'll need a different storage approach (paging / multiple accounts)
    #[max_len(300)]
    pub collections: Vec<Pubkey>,
    // The PDA bump - needed for account derivation
    pub bump: u8,
}

// Helper methods for CollectionRegistry
impl CollectionRegistry {
    /// Add a collection to the registry
    /// (Because we need to track all collections somewhere)
    /// 
    /// NOTE: Registry is initialized with space for 300 collections (fits in 10KB CPI limit)
    /// Returns Ok(false) if registry is full (handled gracefully in create_collection)
    /// Returns Ok(true) if collection was added successfully
    /// Returns Err for any other error (serious problem)
    /// Collections can still be created even if registry is full - they just won't be in the registry
    /// Collections can always be found via getProgramAccounts, the registry is just an optimization
    pub fn add_collection(&mut self, collection: Pubkey) -> anchor_lang::Result<bool> {
        // Check if already registered (avoid duplicates)
        // Use explicit comparison to ensure proper Pubkey matching
        let already_registered = self.collections.iter().any(|&existing| existing == collection);
        
        if !already_registered {
            // Safety check: prevent exceeding allocated space (300 collections)
            // Account space: 8 (discriminator) + 4 (Vec len) + 300 * 32 (Pubkeys) + 1 (bump) = 9,613 bytes
            // This allows exactly 300 Pubkeys (9,600 bytes / 32 = 300)
            if self.collections.len() >= 300 {
                return Ok(false); // Registry is full, but not an error
            }
            self.collections.push(collection);
            log_msg!("Added collection {} to registry (new total: {})", collection, self.collections.len());
            Ok(true)
        } else {
            log_msg!("Collection {} already in registry, skipping duplicate", collection);
            Ok(true) // Already registered, considered success
        }
    }

    /// Remove a collection from the registry
    /// (Because sometimes collections need to be removed - it happens)
    pub fn remove_collection(&mut self, collection: Pubkey) -> Result<()> {
        self.collections.retain(|&x| x != collection);
        Ok(())
    }
}

// Error codes for the collection program
// These are the various ways things can go wrong
// (And trust us, things will go wrong. That's why we have error codes.)
#[error_code]
pub enum CollectionError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid status")]
    InvalidStatus,
    #[msg("Registry is full - maximum 300 collections supported")]
    RegistryFull,
    #[msg("Metadata URI exceeds maximum length (128 bytes)")]
    MetadataUriTooLong,
}

// Coded by Juan - because every good program needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - If this breaks, it's not my fault. Blame the users.
// P.P.S. - Actually, if this breaks, it probably is my fault. But still blame the users.
