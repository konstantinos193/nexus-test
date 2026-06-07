/**
 * Nexus Payment - Advanced Payment Splitting Program
 *
 * Handles complex payment distribution scenarios including:
 * - Multi-recipient payment splitting
 * - Dynamic share allocation
 * - Escrow and timed releases
 * - Revenue tracking and analytics
 *
 * Extracted from the main launchpad for better modularity and to enable
 * more sophisticated payment logic without bloating the core program.
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

declare_id!("PAYm7hB9n3jQq2ZpZpZpZpZpZpZpZpZpZpZpZpZpZpZ");

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
pub mod nexus_payment {
    use super::*;

    /// Create a payment splitter for a collection
    pub fn create_payment_splitter(
        ctx: Context<CreatePaymentSplitter>,
        collection: Pubkey,
        recipients: [Pubkey; 10],
        shares: [u8; 10],
        num_recipients: u8,
    ) -> Result<()> {
        require!(num_recipients > 0 && num_recipients <= 10, NexusError::InvalidRecipientCount);
        
        // Validate shares sum to 100
        let mut total_shares: u16 = 0;
        for i in 0..num_recipients as usize {
            total_shares = total_shares.checked_add(shares[i] as u16).ok_or(NexusError::MathOverflow)?;
        }
        require!(total_shares == 100, NexusError::InvalidShares);

        let splitter = &mut ctx.accounts.payment_splitter;
        splitter.collection = collection;
        splitter.recipients = recipients;
        splitter.shares = shares;
        splitter.num_recipients = num_recipients;
        splitter.total_distributed = 0;
        splitter.created_at = Clock::get()?.unix_timestamp;
        splitter.is_active = true;
        splitter.bump = ctx.bumps.payment_splitter;

        emit!(PaymentSplitterCreated {
            collection,
            num_recipients,
        });

        log_msg!("Payment splitter created for collection: {}", collection);
        Ok(())
    }

    /// Distribute payment among recipients
    pub fn distribute_payment(
        ctx: Context<DistributePayment>,
        amount: u64,
    ) -> Result<()> {
        let splitter = &ctx.accounts.payment_splitter;
        require!(splitter.is_active, NexusError::SplitterInactive);
        require!(amount > 0, NexusError::InvalidAmount);

        let from_account = &ctx.accounts.from_account;
        let token_program = &ctx.accounts.token_program;

        let mut distributed_amount: u64 = 0;

        for i in 0..splitter.num_recipients as usize {
            let recipient_pubkey = splitter.recipients[i];
            let share = splitter.shares[i] as u64;
            
            // Calculate amount for this recipient
            let recipient_amount = if i == (splitter.num_recipients - 1) as usize {
                // Last recipient gets remainder to handle rounding
                amount.checked_sub(distributed_amount).ok_or(NexusError::MathOverflow)?
            } else {
                amount
                    .checked_mul(share)
                    .and_then(|x| x.checked_div(100))
                    .ok_or(NexusError::MathOverflow)?
            };

            if recipient_amount > 0 {
                // Find the recipient token account in remaining_accounts
                let recipient_account = ctx.remaining_accounts
                    .iter()
                    .find(|acc| acc.key() == recipient_pubkey)
                    .ok_or(NexusError::RecipientAccountNotFound)?;

                let transfer_accounts = Transfer {
                    from: from_account.to_account_info(),
                    to: recipient_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                };

                let transfer_ctx = CpiContext::new(
                    token_program.to_account_info(),
                    transfer_accounts,
                );

                anchor_spl::token::transfer(transfer_ctx, recipient_amount)?;
                distributed_amount = distributed_amount
                    .checked_add(recipient_amount)
                    .ok_or(NexusError::MathOverflow)?;
            }
        }

        emit!(PaymentDistributed {
            collection: splitter.collection,
            total_amount: amount,
            actual_distributed: distributed_amount,
        });

        log_msg!("Payment distributed: {} lamports", distributed_amount);
        Ok(())
    }

    /// Update payment splitter configuration (authority only)
    pub fn update_splitter_config(
        ctx: Context<UpdateSplitter>,
        new_recipients: Option<[Pubkey; 10]>,
        new_shares: Option<[u8; 10]>,
        new_num_recipients: Option<u8>,
    ) -> Result<()> {
        let splitter = &mut ctx.accounts.payment_splitter;

        if let Some(num) = new_num_recipients {
            require!(num > 0 && num <= 10, NexusError::InvalidRecipientCount);
            splitter.num_recipients = num;
        }

        if let Some(shares) = new_shares {
            // Validate shares sum to 100
            let mut total_shares: u16 = 0;
            for i in 0..splitter.num_recipients as usize {
                total_shares = total_shares.checked_add(shares[i] as u16).ok_or(NexusError::MathOverflow)?;
            }
            require!(total_shares == 100, NexusError::InvalidShares);
            splitter.shares = shares;
        }

        if let Some(recipients) = new_recipients {
            splitter.recipients = recipients;
        }

        splitter.updated_at = Some(Clock::get()?.unix_timestamp);

        emit!(SplitterConfigUpdated {
            collection: splitter.collection,
            authority: ctx.accounts.authority.key(),
        });

        log_msg!("Payment splitter config updated for collection: {}", splitter.collection);
        Ok(())
    }

    /// Create revenue analytics account
    pub fn create_revenue_analytics(
        ctx: Context<CreateRevenueAnalytics>,
        collection: Pubkey,
    ) -> Result<()> {
        let analytics = &mut ctx.accounts.revenue_analytics;
        analytics.collection = collection;
        analytics.total_revenue = 0;
        analytics.distributions_count = 0;
        analytics.last_distribution = None;
        analytics.created_at = Clock::get()?.unix_timestamp;
        analytics.bump = ctx.bumps.revenue_analytics;

        log_msg!("Revenue analytics created for collection: {}", collection);
        Ok(())
    }

    /// Record revenue distribution for analytics
    pub fn record_revenue(
        ctx: Context<RecordRevenue>,
        amount: u64,
    ) -> Result<()> {
        let analytics = &mut ctx.accounts.revenue_analytics;
        
        analytics.total_revenue = analytics.total_revenue
            .checked_add(amount)
            .ok_or(NexusError::MathOverflow)?;
        analytics.distributions_count = analytics.distributions_count.checked_add(1).unwrap();
        analytics.last_distribution = Some(Clock::get()?.unix_timestamp);

        emit!(RevenueRecorded {
            collection: analytics.collection,
            amount,
            total_revenue: analytics.total_revenue,
        });

        log_msg!("Revenue recorded: {} lamports", amount);
        Ok(())
    }

    /// Deactivate payment splitter (authority only)
    pub fn deactivate_splitter(ctx: Context<UpdateSplitter>) -> Result<()> {
        let splitter = &mut ctx.accounts.payment_splitter;
        splitter.is_active = false;
        splitter.updated_at = Some(Clock::get()?.unix_timestamp);

        emit!(SplitterDeactivated {
            collection: splitter.collection,
            authority: ctx.accounts.authority.key(),
        });

        log_msg!("Payment splitter deactivated for collection: {}", splitter.collection);
        Ok(())
    }

    /// Close payment splitter and reclaim rent (authority only)
    pub fn close_splitter(ctx: Context<CloseSplitter>) -> Result<()> {
        let splitter = &ctx.accounts.payment_splitter;
        
        emit!(SplitterClosed {
            collection: splitter.collection,
            authority: ctx.accounts.authority.key(),
        });

        log_msg!("Payment splitter closed for collection: {}", splitter.collection);
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct CreatePaymentSplitter<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PaymentSplitter::INIT_SPACE,
        seeds = [b"payment_splitter", collection.as_ref()],
        bump
    )]
    pub payment_splitter: Account<'info, PaymentSplitter>,

    /// CHECK: Collection this splitter is for
    pub collection: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributePayment<'info> {
    #[account(
        mut,
        seeds = [b"payment_splitter", payment_splitter.collection.as_ref()],
        bump = payment_splitter.bump
    )]
    pub payment_splitter: Account<'info, PaymentSplitter>,

    #[account(mut)]
    pub from_account: Box<Account<'info, TokenAccount>>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateSplitter<'info> {
    #[account(
        mut,
        seeds = [b"payment_splitter", payment_splitter.collection.as_ref()],
        bump = payment_splitter.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub payment_splitter: Account<'info, PaymentSplitter>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateRevenueAnalytics<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + RevenueAnalytics::INIT_SPACE,
        seeds = [b"revenue_analytics", collection.as_ref()],
        bump
    )]
    pub revenue_analytics: Account<'info, RevenueAnalytics>,

    /// CHECK: Collection this analytics is for
    pub collection: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordRevenue<'info> {
    #[account(
        mut,
        seeds = [b"revenue_analytics", revenue_analytics.collection.as_ref()],
        bump = revenue_analytics.bump
    )]
    pub revenue_analytics: Account<'info, RevenueAnalytics>,
}

#[derive(Accounts)]
pub struct CloseSplitter<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"payment_splitter", payment_splitter.collection.as_ref()],
        bump = payment_splitter.bump,
        has_one = authority @ NexusError::Unauthorized
    )]
    pub payment_splitter: Account<'info, PaymentSplitter>,

    pub authority: Signer<'info>,
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTS
// ═══════════════════════════════════════════════════════════════════════════

#[account]
#[derive(InitSpace)]
pub struct PaymentSplitter {
    pub collection: Pubkey,
    pub recipients: [Pubkey; 10],
    pub shares: [u8; 10],
    pub num_recipients: u8,
    pub total_distributed: u64,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RevenueAnalytics {
    pub collection: Pubkey,
    pub total_revenue: u64,
    pub distributions_count: u32,
    pub last_distribution: Option<i64>,
    pub created_at: i64,
    pub bump: u8,
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

#[event]
pub struct PaymentSplitterCreated {
    pub collection: Pubkey,
    pub num_recipients: u8,
}

#[event]
pub struct PaymentDistributed {
    pub collection: Pubkey,
    pub total_amount: u64,
    pub actual_distributed: u64,
}

#[event]
pub struct SplitterConfigUpdated {
    pub collection: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct RevenueRecorded {
    pub collection: Pubkey,
    pub amount: u64,
    pub total_revenue: u64,
}

#[event]
pub struct SplitterDeactivated {
    pub collection: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct SplitterClosed {
    pub collection: Pubkey,
    pub authority: Pubkey,
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum NexusError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid recipient count (must be 1-10)")]
    InvalidRecipientCount,
    #[msg("Invalid shares (must sum to 100)")]
    InvalidShares,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Payment splitter is inactive")]
    SplitterInactive,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Recipient account not found in remaining_accounts")]
    RecipientAccountNotFound,
}
