'use client'

/**
 * EmptyState – What you see when the data gods have forsaken you.
 * A gem SVG, a title, a description, and up to two action buttons to escape the void.
 * Used for empty grids, filter results that matched nothing, and API errors with nowhere to go.
 *
 * The gem SVG uses a unique ID per instance because SVG <defs> are global to the document.
 * Two EmptyStates with the same gradient ID would share the gradient and look wrong.
 * (It happened once in testing. It was subtle. Juan noticed. Juan fixed it.)
 *
 * Three sizes: compact (inline), default (section), page (full-page sadness).
 * Choose based on how much space you have and how sad you want the user to feel.
 *
 * @author Juan – The developer who made "nothing here" look this good
 * (Coded with care, linear gradients, and useId for collision-proof SVG defs)
 */

// Link — for action buttons that navigate somewhere, as opposed to ones that fire callbacks
import Link from 'next/link'
// useId — React 18 hook for generating unique IDs. Used here to prevent SVG gradient collisions.
// (SVG defs are globally scoped to the document. Reusing IDs breaks gradients. Ask me how I know.)
import { useId } from 'react'
// CSS module — sizes, glow effects, gem icon wrapper, title, description, action buttons
import styles from './EmptyState.module.css'

/** An action button definition — either a callback or a navigation link, never both. */
interface EmptyStateAction {
  label: string           // The button text — keep it short, keep it actionable
  onClick?: () => void    // Callback for in-page actions (clear filters, retry, etc.)
  href?: string           // Navigation target for links to other pages
}

/** Props for EmptyState — flexible enough to cover every "nothing here" scenario. */
interface EmptyStateProps {
  title?: string                    // Headline. Default: "Nothing here yet"
  description?: string              // Supporting text. Default: "Check back soon."
  action?: EmptyStateAction         // Primary action button — highlighted
  secondaryAction?: EmptyStateAction // Secondary action button — less prominent
  size?: 'compact' | 'default' | 'page'  // How much visual weight to give the empty state
}

/**
 * GemSVG — The decorative diamond SVG icon used in the empty state.
 * It has facet lines, a gradient stroke, and a faint gradient fill.
 * Each instance gets unique gradient IDs so they don't stomp on each other in the DOM.
 * (SVG <defs> are document-scoped. Shared IDs = shared gradients = visual chaos.)
 */
function GemSVG({ strokeId, fillId }: { strokeId: string; fillId: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <defs>
        {/* Stroke gradient — cyan to purple, the colors of this whole platform's soul */}
        <linearGradient id={strokeId} x1="6" y1="6" x2="74" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
        </linearGradient>
        {/* Fill gradient — same direction, much more transparent. The gem is mostly empty.
            (Poetic, given the component's purpose.) */}
        <linearGradient id={fillId} x1="6" y1="6" x2="74" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Outer diamond — the main shape. A tilted square, as God intended for gem icons. */}
      <path
        d="M40 5 L75 38 L40 75 L5 38 Z"
        stroke={`url(#${strokeId})`}
        strokeWidth="1.5"
        fill={`url(#${fillId})`}
      />
      {/* Girdle — the horizontal line across the widest part of the diamond.
          Adds realism. Or at least, the appearance of realism. Close enough. */}
      <line x1="5" y1="38" x2="75" y2="38" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.35" />
      {/* Upper-left facet — the line from crown to upper-left girdle point */}
      <line x1="40" y1="5" x2="22" y2="38" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.55" />
      {/* Upper-right facet — mirrored. The diamond is symmetric. Unlike most things. */}
      <line x1="40" y1="5" x2="58" y2="38" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.55" />
      {/* Lower-left facet — going down into the pavilion. More subdued opacity. */}
      <line x1="22" y1="38" x2="40" y2="75" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.3" />
      {/* Lower-right facet — mirror of lower-left. Symmetric grief is still grief. */}
      <line x1="58" y1="38" x2="40" y2="75" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  )
}

/**
 * ActionEl — Renders either a Link or a button depending on whether an href was provided.
 * Because sometimes "do something" means "navigate somewhere" and sometimes it means "call a function".
 * The component handles both cases so callers don't have to think about it.
 */
function ActionEl({ action, primary }: { action: EmptyStateAction; primary: boolean }) {
  // Primary actions get the highlighted style; secondary gets the muted style
  const cls = primary ? styles.primaryAction : styles.secondaryAction

  // If an href is provided, render a Link — proper navigation, proper semantics
  if (action.href) {
    return <Link href={action.href} className={cls}>{action.label}</Link>
  }

  // Otherwise render a button — click handler, no navigation
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {action.label}
    </button>
  )
}

/**
 * EmptyState — The component that makes having nothing look intentional.
 * Shows a gem, a title, a description, and optional escape-hatch buttons.
 */
export default function EmptyState({
  title = 'Nothing here yet',       // Default title — honest and not alarming
  description = 'Check back soon.', // Default description — hopeful but noncommittal
  action,
  secondaryAction,
  size = 'default',
}: EmptyStateProps) {
  // Generate a unique ID for this instance — used to namespace the SVG gradient defs
  const uid = useId()
  // Strip colons from React's ":r0:" format — SVG IDs can't contain colons (browsers complain)
  const strokeId = `es-s-${uid.replace(/:/g, '')}`
  const fillId   = `es-f-${uid.replace(/:/g, '')}`

  return (
    // Outer wrap — size class determines how much vertical space this takes up
    <div className={`${styles.wrap} ${styles[size]}`}>

      {/* The ambient glow effect — only shown for non-compact sizes.
          Compact empty states don't need a glow. They're inline. They're chill. */}
      {size !== 'compact' && <div className={styles.glow} aria-hidden="true" />}

      <div className={styles.inner}>
        {/* Gem icon wrap — contains the SVG with the unique gradient IDs */}
        <div className={styles.iconWrap}>
          <GemSVG strokeId={strokeId} fillId={fillId} />
        </div>

        {/* Divider — only in non-compact sizes. Separates the icon from the text.
            Compact states are in a hurry. No dividers for compact. */}
        {size !== 'compact' && <div className={styles.divider} aria-hidden="true" />}

        {/* Title — the headline of nothingness */}
        <h3 className={styles.title}>{title}</h3>

        {/* Description — the explanation of nothingness */}
        <p className={styles.description}>{description}</p>

        {/* Actions — the exit ramps from nothingness.
            Only rendered if at least one action was provided.
            We don't render an empty <div> for no actions. That would be peak irony. */}
        {(action || secondaryAction) && (
          <div className={styles.actions}>
            {/* Primary action — the main thing we want the user to do */}
            {action && <ActionEl action={action} primary />}
            {/* Secondary action — the fallback, the "or maybe this" option */}
            {secondaryAction && <ActionEl action={secondaryAction} primary={false} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because "nothing here" deserves to look like a design decision.
// (The void is real. We just gave it good typography and a gradient gem icon.)
// ─────────────────────────────────────────────────────────────────────────────
