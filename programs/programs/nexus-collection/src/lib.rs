use anchor_lang::prelude::*;

declare_id!("BUkDSb56YuM9Q1BsiokLKPfaUYP84AzE7xLfVXtqQzTi");

#[program]
pub mod nexus_collection {
    use super::*;

    /// Create a new NFT collection
    /// Respects template format: empty string for external_url becomes None
    pub fn create_collection(
        ctx: Context<CreateCollection>,
        collection_metadata: CollectionMetadata,
    ) -> Result<()> {
        // Normalize empty string to None for external_url (matching template format)
        let normalized_metadata = CollectionMetadata {
            external_url: collection_metadata.external_url.and_then(|url| {
                if url.is_empty() {
                    None
                } else {
                    Some(url)
                }
            }),
            ..collection_metadata
        };

        let collection = &mut ctx.accounts.collection;
        collection.authority = ctx.accounts.authority.key();
        collection.mint = ctx.accounts.mint.key();
        collection.metadata = normalized_metadata;
        collection.created_at = Clock::get()?.unix_timestamp;
        collection.bump = ctx.bumps.collection;

        msg!("Collection created: {}", collection.key());
        Ok(())
    }

    /// Update collection metadata (only authority)
    /// Respects template format: empty string for external_url becomes None
    pub fn update_metadata(
        ctx: Context<UpdateCollection>,
        new_metadata: CollectionMetadata,
    ) -> Result<()> {
        // Normalize empty string to None for external_url (matching template format)
        let normalized_metadata = CollectionMetadata {
            external_url: new_metadata.external_url.and_then(|url| {
                if url.is_empty() {
                    None
                } else {
                    Some(url)
                }
            }),
            ..new_metadata
        };

        ctx.accounts.collection.metadata = normalized_metadata;
        msg!("Collection metadata updated");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateCollection<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Collection::LEN,
        seeds = [b"collection", mint.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, Collection>,

    /// CHECK: NFT mint account
    pub mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

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

#[account]
pub struct Collection {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub metadata: CollectionMetadata,
    pub created_at: i64,
    pub bump: u8,
}

impl Collection {
    pub const LEN: usize = 32 + 32 + CollectionMetadata::LEN + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionMetadata {
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub seller_fee_basis_points: u16,
    pub image: String,
    pub external_url: Option<String>,
    pub attributes: Vec<TraitAttribute>,
    pub properties: Properties,
}

impl CollectionMetadata {
    pub const LEN: usize = 4 + 100 + 4 + 10 + 4 + 500 + 2 + 4 + 200 + (1 + 4 + 200) + 4 + (4 + 50 + 4 + 100 + 1 + 4 + 50 + 1 + 4 + 10) * 10 + Properties::LEN; // Approximate
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TraitAttribute {
    pub trait_type: String,
    pub value: String,
    pub display_type: Option<String>,
    pub max_value: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Properties {
    pub files: Vec<FileProperty>,
    pub category: String,
    pub creators: Vec<Creator>,
}

impl Properties {
    pub const LEN: usize = 4 + (4 + 200 + 4 + 50) * 5 + 4 + 50 + 4 + (32 + 1) * 10; // Approximate
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FileProperty {
    pub uri: String,
    pub r#type: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Creator {
    pub address: String,
    pub share: u8,
}

#[error_code]
pub enum CollectionError {
    #[msg("Unauthorized")]
    Unauthorized,
}
