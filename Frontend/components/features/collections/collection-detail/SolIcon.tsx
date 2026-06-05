/**
 * SolIcon – The Solana three-bar mark rendered as an inline SVG with the official gradient.
 * The gradient runs from #00FFA3 (Solana green) to #DC1FFF (Solana purple).
 * This is the exact canonical Solana brand gradient. We did not invent this.
 *
 * Each instance generates a unique gradient ID using React's useId hook.
 * This matters because SVG <defs> are globally scoped in the document.
 * Two SolIcons with the same gradient ID would share a gradient and render identically
 * even if you tried to change one. Which would be confusing. We don't do confusing.
 *
 * Usage: <SolIcon size={14} />
 * Convention: place BEFORE the number: <SolIcon size={13} /> {price}
 * This matches every NFT marketplace's convention. Don't fight it.
 * (Juan fought it once. He lost. The convention wins.)
 *
 * @author Juan – The developer who made Solana's brand gradient render correctly every time
 * (Coded with care, useId, and a healthy respect for SVG defs namespacing)
 */

// useId — React 18's hook for generating stable unique IDs.
// Used here to give each SolIcon instance its own gradient ID so they don't collide in the DOM.
import { useId } from 'react'

/** Props for SolIcon — size, optional CSS class, and optional inline styles. */
interface SolIconProps {
  size?: number                  // Width and height in pixels — square icon, always
  className?: string             // Optional extra class for layout adjustments
  style?: React.CSSProperties    // Optional inline styles for one-off tweaks
}

/**
 * SolIcon — The Solana brand mark as an inline SVG.
 * Three diagonal bars, green-to-purple gradient, unique per instance.
 * Small but mighty. Carries the weight of an entire ecosystem in 14×14 pixels.
 */
export default function SolIcon({ size = 14, className, style }: SolIconProps) {
  // Generate a unique ID for this instance — e.g. "r1" → "sol-grad-r1"
  // Replace colons because React's ":r0:" format contains characters invalid in SVG IDs
  const uid = useId().replace(/:/g, '')
  const gradId = `sol-grad-${uid}`

  return (
    <svg
      width={size}
      height={size}
      // Canonical Solana viewBox — do not change these numbers
      viewBox="0 0 397.7 311.7"
      // aria-hidden: decorative icon, no meaningful content for screen readers
      aria-hidden="true"
      // focusable false: IE11 compat — prevents the SVG from being keyboard-focusable
      focusable="false"
      className={className}
      style={{
        display: 'inline',          // Inline so it sits in text flow next to prices
        verticalAlign: 'middle',    // Middle-aligned so it sits at cap height with numbers
        flexShrink: 0,              // Don't shrink inside flex containers (it would look bad)
        ...style,                   // Caller overrides applied last — they get final say
      }}
    >
      <defs>
        {/* The Solana gradient — #00FFA3 to #DC1FFF.
            These are the official brand colors. They are non-negotiable.
            Top-left to bottom-right for the diagonal effect that matches the bars' angles. */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#00FFA3" />  {/* Solana green */}
          <stop offset="100%" stopColor="#DC1FFF" />  {/* Solana purple */}
        </linearGradient>
      </defs>

      {/* Top bar — the uppermost of the three Solana marks. Tilted ~25deg.
          This is the bar that points right-up on the left and right-down on the right. */}
      <path fill={`url(#${gradId})`} d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" />

      {/* Middle bar — the center bar. Same angle, different vertical position.
          Offset from the top bar, creates the three-bar rhythm of the Solana mark. */}
      <path fill={`url(#${gradId})`} d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" />

      {/* Bottom bar — the lowest of the three bars. Same angle again.
          Together, the three bars form the Solana logo. Simple. Iconic. Gradient. */}
      <path fill={`url(#${gradId})`} d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because Solana deserves correct gradient IDs on every instance.
// (SVG defs are globally scoped. One gradient ID per icon. This was not optional.)
// ─────────────────────────────────────────────────────────────────────────────
