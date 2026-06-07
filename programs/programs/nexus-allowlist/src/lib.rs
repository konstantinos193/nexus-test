/**
 * Nexus Allowlist - Dedicated Allowlist Verification Program
 *
 * Extracted from the monolithic Nexus Launchpad for better modularity and security.
 * This program handles all allowlist-related operations including:
 * - Merkle tree verification
 * - Allowlist creation and management
 * - Wallet eligibility verification
 *
 * Benefits of separation:
 * - Reduced main program size
 * - Independent security audits
 * - Reusable across multiple launchpad instances
 * - Easier upgrades to allowlist logic
 */

use anchor_lang::prelude::*;
use core::convert::TryInto;
use sha3::{Digest, Keccak256};

// Maximum Merkle proof depth - 24 levels → 2^24 leaves → ~16 million wallets
const MAX_MERKLE_PROOF_DEPTH: usize = 24;

// TODO: Update this with the actual program ID after deployment
declare_id!("ALw7hB9n3jQq2ZpZpZpZpZpZpZpZpZpZpZpZpZpZ");

// Logging macro — gated behind feature flag so release builds stay lean
#[cfg(feature = "logs")]
macro_rules! log_msg {
    ($($arg:tt)*) => { msg!($($arg)*) };
}

#[cfg(not(feature = "logs"))]
macro_rules! log_msg {
    ($($arg:tt)*) => {};
}

#[program]
pub mod nexus_allowlist {
    use super::*;

    /// Create a new allowlist for a collection
    pub fn create_allowlist(
        ctx: Context<CreateAllowlist>,
        collection: Pubkey,
        merkle_root: [u8; 32],
        authority: Pubkey,
    ) -> Result<()> {
        let allowlist = &mut ctx.accounts.allowlist;
        allowlist.collection = collection;
        allowlist.merkle_root = merkle_root;
        allowlist.authority = authority;
        allowlist.created_at = Clock::get()?.unix_timestamp;
        allowlist.is_active = true;
        allowlist.bump = ctx.bumps.allowlist;
        
        emit!(AllowlistCreated {
            collection,
            merkle_root,
            authority,
        });
        
        log_msg!("Allowlist created for collection: {}", collection);
        Ok(())
    }

    /// Verify if a wallet is in the allowlist
    pub fn verify_wallet(
        ctx: Context<VerifyWallet>,
        wallet: Pubkey,
        proof: Vec<[u8; 32]>,
        leaf_index: u32,
    ) -> Result<bool> {
        let allowlist = &ctx.accounts.allowlist;
        
        require!(allowlist.is_active, AllowlistError::AllowlistInactive);
        require!(!proof.is_empty(), AllowlistError::InvalidProof);
        require!(proof.len() <= MAX_MERKLE_PROOF_DEPTH, AllowlistError::InvalidProof);

        // Create leaf hash: keccak256(wallet_pubkey || collection_pubkey)
        let mut hasher = Keccak256::new();
        hasher.update(wallet.as_ref());
        hasher.update(allowlist.collection.as_ref());
        let hash_result = hasher.finalize();
        
        // SAFETY: Keccak256 always produces exactly 32 bytes
        let leaf: [u8; 32] = hash_result.as_slice().try_into().unwrap();

        let is_valid = verify_merkle_proof(
            &leaf,
            leaf_index,
            &proof,
            &allowlist.merkle_root,
        );

        emit!(WalletVerified {
            wallet,
            collection: allowlist.collection,
            is_valid,
        });

        log_msg!("Wallet {} verified: {}", wallet, is_valid);
        Ok(is_valid)
    }

    /// Update allowlist Merkle root (authority only)
    pub fn update_merkle_root(
        ctx: Context<UpdateAllowlist>,
        new_merkle_root: [u8; 32],
    ) -> Result<()> {
        let allowlist = &mut ctx.accounts.allowlist;
        let old_root = allowlist.merkle_root;
        
        allowlist.merkle_root = new_merkle_root;
        allowlist.updated_at = Some(Clock::get()?.unix_timestamp);

        emit!(MerkleRootUpdated {
            collection: allowlist.collection,
            old_root,
            new_root,
            authority: ctx.accounts.authority.key(),
        });

        log_msg!("Merkle root updated for collection: {}", allowlist.collection);
        Ok(())
    }

    /// Activate or deactivate allowlist (authority only)
    pub fn set_allowlist_active(
        ctx: Context<UpdateAllowlist>,
        is_active: bool,
    ) -> Result<()> {
        let allowlist = &mut ctx.accounts.allowlist;
        allowlist.is_active = is_active;
        allowlist.updated_at = Some(Clock::get()?.unix_timestamp);

        emit!(AllowlistStatusChanged {
            collection: allowlist.collection,
            is_active,
            authority: ctx.accounts.authority.key(),
        });

        log_msg!("Allowlist {} for collection: {}", 
            if is_active { "activated" } else { "deactivated" },
            allowlist.collection
        );
        Ok(())
    }

    /// Close allowlist and reclaim rent (authority only)
    pub fn close_allowlist(ctx: Context<CloseAllowlist>) -> Result<()> {
        let allowlist = &ctx.accounts.allowlist;
        
        emit!(AllowlistClosed {
            collection: allowlist.collection,
            authority: ctx.accounts.authority.key(),
        });

        log_msg!("Allowlist closed for collection: {}", allowlist.collection);
        Ok(())
    }
}

// Verify a Keccak256 Merkle proof with optimizations
#[inline]
fn verify_merkle_proof(
    leaf: &[u8; 32],
    leaf_index: u32,
    proof: &[[u8; 32]],
    root: &[u8; 32],
) -> bool {
    if proof.is_empty() || proof.len() > MAX_MERKLE_PROOF_DEPTH {
        return false;
    }
    
    let mut current = *leaf;
    let mut combined = [0u8; 64]; // Pre-allocate for performance
    
    for (i, sibling) in proof.iter().enumerate() {
        let bit = (leaf_index >> i) & 1;
        
        // Direct assignment for performance
        if bit == 0 {
            combined[..32].copy_from_slice(&current);
            combined[32..].copy_from_slice(sibling);
        } else {
            combined[..32].copy_from_slice(sibling);
            combined[32..].copy_from_slice(&current);
        }
        
        let mut hasher = Keccak256::new();
        hasher.update(&combined);
        // SAFETY: Keccak256 always produces exactly 32 bytes
        current = <&[u8] as TryInto<[u8; 32]>>::try_into(hasher.finalize().as_slice()).unwrap();
    }
    
    current == *root
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct CreateAllowlist<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AllowlistAccount::INIT_SPACE,
        seeds = [b"allowlist", collection.as_ref()],
        bump
    )]
    pub allowlist: Account<'info, AllowlistAccount>,

    /// CHECK: Collection this allowlist is for
    pub collection: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyWallet<'info> {
    #[account(
        seeds = [b"allowlist", allowlist.collection.as_ref()],
        bump = allowlist.bump
    )]
    pub allowlist: Account<'info, AllowlistAccount>,
}

#[derive(Accounts)]
pub struct UpdateAllowlist<'info> {
    #[account(
        mut,
        seeds = [b"allowlist", allowlist.collection.as_ref()],
        bump = allowlist.bump,
        has_one = authority @ AllowlistError::Unauthorized
    )]
    pub allowlist: Account<'info, AllowlistAccount>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseAllowlist<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"allowlist", allowlist.collection.as_ref()],
        bump = allowlist.bump,
        has_one = authority @ AllowlistError::Unauthorized
    )]
    pub allowlist: Account<'info, AllowlistAccount>,

    pub authority: Signer<'info>,
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTS
// ═══════════════════════════════════════════════════════════════════════════

#[account]
#[derive(InitSpace)]
pub struct AllowlistAccount {
    pub collection: Pubkey,
    pub merkle_root: [u8; 32],
    pub authority: Pubkey,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub is_active: bool,
    pub bump: u8,
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

#[event]
pub struct AllowlistCreated {
    pub collection: Pubkey,
    pub merkle_root: [u8; 32],
    pub authority: Pubkey,
}

#[event]
pub struct WalletVerified {
    pub wallet: Pubkey,
    pub collection: Pubkey,
    pub is_valid: bool,
}

#[event]
pub struct MerkleRootUpdated {
    pub collection: Pubkey,
    pub old_root: [u8; 32],
    pub new_root: [u8; 32],
    pub authority: Pubkey,
}

#[event]
pub struct AllowlistStatusChanged {
    pub collection: Pubkey,
    pub is_active: bool,
    pub authority: Pubkey,
}

#[event]
pub struct AllowlistClosed {
    pub collection: Pubkey,
    pub authority: Pubkey,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum AllowlistError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Allowlist is not active")]
    AllowlistInactive,
    #[msg("Invalid Merkle proof")]
    InvalidProof,
}
