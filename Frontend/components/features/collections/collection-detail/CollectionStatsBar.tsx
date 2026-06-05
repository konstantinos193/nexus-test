'use client'

/**
 * CollectionStatsBar – The four numbers that matter on a launchpad.
 * Minted, Supply, Mint Price, and Remaining — everything a minter needs to decide.
 * Notice what's NOT here: floor price, volume, 24h change, holders.
 * Those belong on Magic Eden. This is where NFTs are BORN, not traded.
 * (We are a launchpad. We celebrate creation. The secondary market can have the rest.)
 *
 * @author Juan – The developer who decided four stats was the right number
 * (Coded with care, toLocaleString(), and strong opinions about what metrics belong where)
 */

// CollectionDetail type — the full collection data shape. We use minted, totalSupply, price.
import type { CollectionDetail } from '@/types'
// SolIcon — the Solana gradient three-bar SVG mark. Appears next to prices.
// (It's small. It's elegant. It carries the weight of an entire ecosystem.)
import SolIcon from './SolIcon'

/**
 * CollectionStatsBar — Four stats. No more. No less.
 * Renders a horizontal strip of chip-style stat cards below the hero section.
 */
export default function CollectionStatsBar({ collection }: { collection: CollectionDetail }) {
  // Safe defaults — the API might not always send these fields. We handle that gracefully.
  const minted = collection.minted ?? 0
  const supply = collection.totalSupply ?? 0
  const price  = collection.price ?? 0

  // Mint progress percentage — capped at 100 so we never show "101.3% minted" on a bad day
  const pct = supply > 0 ? Math.min(100, (minted / supply) * 100) : 0

  return (
    // cp-stats-strip: a flex row of stat chips, wrapping on small screens
    <div className="cp-stats-strip">

      {/* ── Minted Stat ─────────────────────────────────────────────────────
          How many NFTs have been minted. The progress number.
          Includes a parenthetical percentage — because absolute numbers
          mean nothing without context. 500 out of 10,000 is very different from 500 out of 500. */}
      <div className="cp-stat-chip">
        <div className="cp-stat-chip-label">Minted</div>
        <div className="cp-stat-chip-value">
          {minted.toLocaleString()}
          {/* Percentage in a muted color — secondary info that helps interpret the count */}
          <span style={{ color: 'var(--cp-text-muted)', fontSize: '0.8rem', fontWeight: 400, marginLeft: '0.3rem' }}>
            ({pct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* ── Supply Stat ─────────────────────────────────────────────────────
          Total number of NFTs in this collection. The denominator.
          Without this, "500 minted" is meaningless. Context, always context. */}
      <div className="cp-stat-chip">
        <div className="cp-stat-chip-label">Supply</div>
        <div className="cp-stat-chip-value">{supply.toLocaleString()}</div>
      </div>

      {/* ── Mint Price Stat ──────────────────────────────────────────────────
          The cost to mint one NFT. The most important number for wallet-holders.
          Free mints get the green treatment — because "free" is the best price. */}
      <div className="cp-stat-chip">
        <div className="cp-stat-chip-label">Mint Price</div>
        <div className="cp-stat-chip-value" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {price === 0
            // Green "Free" — the color green here is intentional. Free is good. Green is good.
            ? <span style={{ color: 'var(--cp-green)' }}>Free</span>
            // Otherwise: the price in SOL followed by the Solana logo
            : <>{price.toFixed(2)} <SolIcon size={13} /></>
          }
        </div>
      </div>

      {/* ── Remaining Stat ───────────────────────────────────────────────────
          How many are left to mint. The scarcity signal.
          If this number is small, the FOMO intensifies. That's not a bug, that's economics.
          (supply - minted). Simple subtraction. Powerful psychology.) */}
      <div className="cp-stat-chip">
        <div className="cp-stat-chip-label">Remaining</div>
        <div className="cp-stat-chip-value">{(supply - minted).toLocaleString()}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — four numbers, all the context a minter needs to make a decision.
// (Floor price and volume belong on secondary. We launch things here. Different game.)
// ─────────────────────────────────────────────────────────────────────────────
