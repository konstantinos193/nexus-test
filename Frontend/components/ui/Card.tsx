// HTMLAttributes — the full native div API. We extend it, not restrict it.
// Every HTML attribute a div accepts, CardProps accepts too.
import { HTMLAttributes } from 'react'

// cn — classnames utility. Merges our styles with anything the caller passes.
// Without cn, we'd battle className precedence with string literals like it's 2015.
import { cn } from '@/lib/utils'

/**
 * Card - The container that gives content visual hierarchy and breathing room.
 * Because a raw div has no personality, no border, no background, no rounded corners.
 * A Card has all of those things. A Card is a div that has been to finishing school.
 *
 * Three variants:
 * - default: standard border + secondary background. The most-used one.
 * - elevated: tertiary background + shadow + hover glow. For things that want attention.
 * - outlined: transparent background + stronger border. For bordered-but-not-filled looks.
 *
 * Sub-components for composable structure:
 * - CardHeader: margin below for separation. That's it.
 * - CardTitle: h3, large, primary text color.
 * - CardDescription: paragraph, secondary text color.
 * - CardContent: the body. No extra styles — it's a clean slate.
 *
 * Prefer composing: <Card><CardHeader><CardTitle>...</CardTitle></CardHeader></Card>
 * Over: <Card className="p-6 space-y-4">...raw content...
 * (Both work. One is more intentional. We prefer intentional.)
 *
 * @author Juan - The developer who made divs aspirational.
 * (Coded with care, a deeply held belief that rounded corners matter,
 * and the quiet satisfaction of a shadow-lg that's just dark enough.)
 */

// CardProps — extends HTMLDivAttributes with a variant prop.
// variant defaults to 'default' at usage. The other two are opt-in.
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // variant — which visual treatment to apply.
  // default: standard surface. elevated: lifted with shadow. outlined: just a border.
  variant?: 'default' | 'elevated' | 'outlined'
}

/**
 * Card — the base card component. All variants flow through here.
 * rounded-xl + transition-all on every variant for smooth interaction.
 * Specific colors and shadows vary per variant.
 */
export function Card({ className, variant = 'default', ...props }: CardProps) {
  // variants — each is a Tailwind class string describing that variant's visual treatment.
  const variants = {
    // default: secondary bg + standard border. Safe, clean, universally applicable.
    default: 'bg-dark-bg-secondary border border-dark-border-primary',
    // elevated: tertiary bg (slightly lighter) + secondary shadow + glow on hover.
    // Use for cards that should feel raised above the page surface.
    elevated: 'bg-dark-bg-tertiary border border-dark-border-secondary shadow-dark-lg hover:shadow-glow transition-shadow',
    // outlined: transparent background + accent border. No background fill.
    // Use when the card should feel like a container without a surface.
    outlined: 'bg-transparent border-2 border-dark-border-accent'
  }

  return (
    <div
      className={cn(
        // Shared: rounded corners, smooth transitions.
        'rounded-xl transition-all duration-300',
        // Per-variant: background, border, shadow, hover effects.
        variants[variant],
        // Caller className last — overrides win. Intentional.
        className
      )}
      {...props}
    />
  )
}

/**
 * CardHeader — the header section of a card. Adds bottom margin.
 * Use it to wrap CardTitle + CardDescription before the CardContent.
 * mb-4 provides breathing room between the header and the content below.
 */
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4', className)}
      {...props}
    />
  )
}

/**
 * CardTitle — the h3 title element. Bold, large, primary text color.
 * It's an h3 by default because Cards usually live inside h2-level page sections.
 * Semantic heading hierarchy matters. Screen readers appreciate it.
 * (The hierarchy is: h1 page, h2 section, h3 card. We don't fight this.)
 */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-2xl font-semibold text-dark-text-primary', className)}
      {...props}
    />
  )
}

/**
 * CardDescription — a paragraph below the title. Muted secondary text.
 * Use for one or two lines of supporting context.
 * If you need more than two lines, the description is too long.
 * That's a writing note, not a code constraint. But still.
 */
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-dark-text-secondary', className)}
      {...props}
    />
  )
}

/**
 * CardContent — the body of the card. No default styles applied.
 * Clean slate — add your own padding, spacing, layout here.
 * We don't assume. We provide the container. You provide the content.
 */
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('', className)}
      {...props}
    />
  )
}

// Coded by Juan — four components: Card, CardHeader, CardTitle, CardDescription, CardContent.
// (That's five. We said four. The count was wrong. The components are right.)
// Fancy boxes for content that deserves better than a raw div.
// Dark mode. Rounded corners. Shadows that know their place.
// Light mode is for people who haven't discovered dark mode yet. We don't judge. We just default to dark.
