import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Badge Component - The little label that says things
 * Because sometimes you need to label things (and we're not going to use sticky notes)
 * (And badges are like name tags, but for UI elements)
 *
 * Variants: default, secondary, outline, destructive
 * Because variety is the spice of life (and UI design)
 *
 * @author Juan - The developer who built this badge
 * (Coded with care, humor, and probably too much coffee)
 */

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'border-transparent bg-dark-accent-primary text-white hover:bg-dark-accent-primary/80',
      secondary: 'border-transparent bg-dark-bg-secondary text-dark-text-primary hover:bg-dark-bg-tertiary',
      outline: 'text-dark-text-primary border-dark-border-primary',
      destructive: 'border-transparent bg-dark-accent-error text-white hover:bg-dark-accent-error/80',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-dark-accent-primary focus:ring-offset-2 focus:ring-offset-dark-bg-primary',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Badges: making labels look good since... always. 🏷️
