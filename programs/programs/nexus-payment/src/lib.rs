/**
 * Nexus Payment Program - The Lean, Mean Payment Splitting Machine
 * 
 * This is where money gets split between creators and platforms
 * We handle fee calculations and direct transfers - no escrow, no bloat, just results.
 * 
 * Features:
 * - Payment splitter initialization (because someone has to set this up)
 * - Direct payment splitting (because creators and platforms need to get paid NOW)
 * - Fee calculations (because math is hard, but we make it easier)
 * 
 * Optimized for:
 * - Minimal rent cost (67 bytes vs 75 bytes - every byte counts when you're broke)
 * - Direct transfers (no escrow complexity, no delayed withdrawals, just money moving)
 * - Lower compute units (because compute costs money, and we're cheap)
 * 
 * @author Juan - The developer who built this payment splitter
 * (Coded with care, dark humor, and probably too much coffee)
 * (Also, if this breaks, it's not my fault - blame the math)
 */

use anchor_lang::prelude::*;

// Program ID - the unique identifier for this program on Solana
// This is like our address in the blockchain universe
// If you change this, everything breaks. Don't change this.
declare_id!("8VLcrDKmzMXM1hDBzEU9ifRvaYSbuC4kfAF2tNa1qU9Z");

// Gate logging behind feature flag to reduce binary size in release builds
#[cfg(feature = "logs")]
macro_rules! log_msg {
    ($($arg:tt)*) => {
        msg!($($arg)*)
    };
}

#[cfg(not(feature = "logs"))]
macro_rules! log_msg {
    ($($arg:tt)*) => {};
}

#[program]
pub mod nexus_payment {
    use super::*;

    /// Initialize payment splitter for a collection
    /// 
    /// This is where payment splitters are born - setting up the splitter account
    /// Think of this as the birth certificate for your payment splitter
    /// (Except instead of a baby, you get a way to split money between creators and platforms)
    /// 
    /// We validate the fee percentage because we don't trust users
    /// (Because taking more than 100% would be... creative accounting)
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_bps: u16,
    ) -> Result<()> {
        // Validate fee percentage (must be 0-10000 basis points, i.e., 0-100%)
        // We cap it at 100% because taking more than 100% would be... creative accounting
        // (And also mathematically impossible, but we check anyway because users are creative)
        require!(fee_bps <= 10_000, PaymentError::InvalidFee);

        // Set up the splitter account with all the important stuff
        // This is where we store who gets paid and how much
        // (Because without this, we'd have no idea who's in charge of getting paid)
        let s = &mut ctx.accounts.splitter;
        s.creator = ctx.accounts.creator.key();
        s.platform = ctx.accounts.platform.key();
        s.fee_bps = fee_bps;
        // Store the PDA bump - because we need it for account derivation
        // (And because Anchor told us to, and Anchor is usually right)
        s.bump = ctx.bumps.splitter;

        log_msg!(
            "Payment splitter initialized with {}% platform fee",
            fee_bps as f64 / 100.0
        );

        Ok(())
    }

    /// Split payment between creator and platform (direct transfer, no escrow)
    /// 
    /// This is where the magic happens - splitting money between creator and platform
    /// (Or at least, that's what we tell ourselves. Reality is more complicated.)
    /// 
    /// We calculate fees and transfer money directly - no escrow, no delays, just results.
    /// Because if we don't, people won't get paid (and that's bad)
    pub fn split_payment(ctx: Context<SplitPayment>, amount: u64) -> Result<()> {
        let s = &ctx.accounts.splitter;

        // Calculate fees - the platform gets a percentage of the payment
        // (Because even platforms need to pay the bills)
        let fee = amount
            .checked_mul(s.fee_bps as u64)
            .and_then(|v| v.checked_div(10_000))
            .ok_or(PaymentError::MathOverflow)?;

        // Creator gets the remainder (the platform takes its cut first, like a good business)
        // This is what's left after we take our fee
        // (The creator gets the rest, because they did the work)
        let creator_amount = amount
            .checked_sub(fee)
            .ok_or(PaymentError::MathOverflow)?;

        // Transfer to platform - we take our cut first
        // Using Anchor's transfer helper because it's cleaner and safer than raw invoke
        // (Because we're professionals, and professionals use the right tools)
        if fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.payer.to_account_info(),
                        to: ctx.accounts.platform.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Transfer to creator - they get the remainder
        // (Because creators need to get paid, or they won't create)
        if creator_amount > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.payer.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                ),
                creator_amount,
            )?;
        }

        log_msg!(
            "Split {} lamports: {} to creator, {} to platform",
            amount,
            creator_amount,
            fee
        );

        Ok(())
    }
}

// Account validation struct for initializing a payment splitter
// This defines what accounts are needed and how they're validated
// (Because Anchor needs to know what accounts to expect and how to validate them)
#[derive(Accounts)]
pub struct Initialize<'info> {
    // The splitter account - this is what we're initializing
    // It's a PDA derived from the creator's pubkey
    // (Because PDAs are deterministic and we can find them later)
    #[account(
        init,
        payer = creator,
        space = 8 + Splitter::INIT_SPACE,
        seeds = [b"splitter", creator.key().as_ref()],
        bump
    )]
    pub splitter: Account<'info, Splitter>,

    // The creator - the one who's initializing the splitter
    // They sign the transaction and pay for account creation
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Platform wallet
    /// This is where the platform gets paid
    /// (We don't validate it here, we just trust that it's correct)
    pub platform: UncheckedAccount<'info>,

    // The system program - needed for account creation
    // (Because Solana needs to know how to create accounts)
    pub system_program: Program<'info, System>,
}

// Account validation struct for splitting payments
// This defines what accounts are needed for a payment split
// (Because Anchor needs to know what accounts to expect and how to validate them)
#[derive(Accounts)]
pub struct SplitPayment<'info> {
    // The splitter account - we need to read it
    // (Because we need to check fees and who gets paid)
    pub splitter: Account<'info, Splitter>,

    // The payer - the one who's paying
    // They sign the transaction and pay for everything
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Creator wallet
    /// This is where the creator gets paid (minus platform fee)
    /// (We don't validate it here, we just trust that it's correct)
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    /// CHECK: Platform wallet
    /// This is where the platform gets paid (their fee)
    /// (We don't validate it here, we just trust that it's correct)
    #[account(mut)]
    pub platform: UncheckedAccount<'info>,

    // The system program - needed for transfers
    // (Because Solana needs to know how to transfer funds)
    pub system_program: Program<'info, System>,
}

// LaunchMyNFT-style splitter: who gets paid + what %. No strings, no Vec, no escrow.
// 67 bytes + 8 discriminator ≈ 75 bytes → rent exempt ≈ 0.000066 SOL.
// Direct transfer only (platform fee then creator remainder); no accumulated balances, no vaults.
#[account]
#[derive(InitSpace)]
pub struct Splitter {
    pub creator: Pubkey,
    pub platform: Pubkey,
    pub fee_bps: u16,
    pub bump: u8,
}

// Error codes for the payment program
// These are the various ways things can go wrong
// (And trust us, things will go wrong. That's why we have error codes.)
#[error_code]
pub enum PaymentError {
    // Fee percentage is invalid (must be 0-10000 basis points)
    #[msg("Invalid fee")]
    InvalidFee,
    // Math overflow (numbers got too big, which is bad)
    #[msg("Math overflow")]
    MathOverflow,
}

// Coded by Juan - because every good program needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - If this breaks, it's not my fault. Blame the math.
// P.P.S. - Actually, if this breaks, it probably is my fault. But still blame the math.
