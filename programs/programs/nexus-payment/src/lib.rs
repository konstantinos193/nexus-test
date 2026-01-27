use anchor_lang::prelude::*;

declare_id!("8VLcrDKmzMXM1hDBzEU9ifRvaYSbuC4kfAF2tNa1qU9Z");

#[program]
pub mod nexus_payment {
    use super::*;

    /// Initialize payment splitter for a collection
    pub fn initialize_splitter(
        ctx: Context<InitializeSplitter>,
        platform_fee_basis_points: u16,
    ) -> Result<()> {
        require!(
            platform_fee_basis_points <= 10000,
            PaymentError::InvalidFeePercentage
        );

        let splitter = &mut ctx.accounts.splitter;
        splitter.creator = ctx.accounts.creator.key();
        splitter.platform = ctx.accounts.platform.key();
        splitter.platform_fee_basis_points = platform_fee_basis_points;
        splitter.total_collected = 0;
        splitter.bump = ctx.bumps.splitter;

        msg!(
            "Payment splitter initialized with {}% platform fee",
            platform_fee_basis_points as f64 / 100.0
        );

        Ok(())
    }

    /// Distribute payment between creator and platform
    pub fn distribute_payment(ctx: Context<DistributePayment>, amount: u64) -> Result<()> {
        let splitter = &mut ctx.accounts.splitter;

        // Calculate fees
        let platform_fee = amount
            .checked_mul(splitter.platform_fee_basis_points as u64)
            .and_then(|x| x.checked_div(10000))
            .ok_or(PaymentError::MathOverflow)?;

        let creator_amount = amount
            .checked_sub(platform_fee)
            .ok_or(PaymentError::MathOverflow)?;

        // Transfer to platform
        if platform_fee > 0 {
            anchor_lang::solana_program::program::invoke(
                &anchor_lang::solana_program::system_instruction::transfer(
                    &ctx.accounts.payer.key(),
                    &splitter.platform.key(),
                    platform_fee,
                ),
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.platform.to_account_info(),
                ],
            )?;
        }

        // Transfer to creator
        if creator_amount > 0 {
            anchor_lang::solana_program::program::invoke(
                &anchor_lang::solana_program::system_instruction::transfer(
                    &ctx.accounts.payer.key(),
                    &splitter.creator.key(),
                    creator_amount,
                ),
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.creator.to_account_info(),
                ],
            )?;
        }

        // Update total collected
        splitter.total_collected = splitter
            .total_collected
            .checked_add(amount)
            .ok_or(PaymentError::MathOverflow)?;

        msg!(
            "Distributed {} lamports: {} to creator, {} to platform",
            amount,
            creator_amount,
            platform_fee
        );

        Ok(())
    }

    /// Withdraw accumulated funds (for escrow-based approach)
    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let splitter = &ctx.accounts.splitter;

        require!(
            ctx.accounts.authority.key() == splitter.creator
                || ctx.accounts.authority.key() == splitter.platform,
            PaymentError::Unauthorized
        );

        // Calculate split
        let platform_fee = amount
            .checked_mul(splitter.platform_fee_basis_points as u64)
            .and_then(|x| x.checked_div(10000))
            .ok_or(PaymentError::MathOverflow)?;

        let creator_amount = amount
            .checked_sub(platform_fee)
            .ok_or(PaymentError::MathOverflow)?;

        // Transfer funds
        if ctx.accounts.authority.key() == splitter.creator && creator_amount > 0 {
            **ctx.accounts.escrow.try_borrow_mut_lamports()? -= creator_amount;
            **ctx.accounts.creator.try_borrow_mut_lamports()? += creator_amount;
        }

        if ctx.accounts.authority.key() == splitter.platform && platform_fee > 0 {
            **ctx.accounts.escrow.try_borrow_mut_lamports()? -= platform_fee;
            **ctx.accounts.platform.try_borrow_mut_lamports()? += platform_fee;
        }

        msg!("Withdrew {} lamports", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeSplitter<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + PaymentSplitter::LEN,
        seeds = [b"splitter", creator.key().as_ref()],
        bump
    )]
    pub splitter: Account<'info, PaymentSplitter>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Platform wallet
    pub platform: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributePayment<'info> {
    #[account(mut)]
    pub splitter: Account<'info, PaymentSplitter>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Creator wallet
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    /// CHECK: Platform wallet
    #[account(mut)]
    pub platform: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub splitter: Account<'info, PaymentSplitter>,

    pub authority: Signer<'info>,

    /// CHECK: Creator wallet
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    /// CHECK: Platform wallet
    #[account(mut)]
    pub platform: UncheckedAccount<'info>,

    /// CHECK: Escrow account
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct PaymentSplitter {
    pub creator: Pubkey,
    pub platform: Pubkey,
    pub platform_fee_basis_points: u16, // e.g., 500 = 5%
    pub total_collected: u64,
    pub bump: u8,
}

impl PaymentSplitter {
    pub const LEN: usize = 32 + 32 + 2 + 8 + 1;
}

#[error_code]
pub enum PaymentError {
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Unauthorized")]
    Unauthorized,
}
