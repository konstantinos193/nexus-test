// React button props - because we need to extend the native button
// Without this, TypeScript would complain about missing props (and so would we)
import { ButtonHTMLAttributes, forwardRef } from 'react'
// Utility function - because we need to merge class names
// Because string concatenation is so 2010 (and error-prone)
import { cn } from '@/lib/utils'

/**
 * Button Component - The clickable thing that does stuff
 * Because every app needs buttons (and we're not going to make users wave at the screen)
 *
 * Variants: primary, secondary, outline, ghost
 * Sizes: sm, md, lg
 * isLoading: swaps the gradient for a clean flat loading state — gradient + opacity-50 looks terrible.
 *
 * @author Juan - The developer who built this button
 * (Coded with care, humor, and probably too much coffee)
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-dark-accent-primary focus:ring-offset-2 focus:ring-offset-dark-bg-primary'

    const variants = {
      primary: 'bg-gradient-accent text-white hover:shadow-glow-lg hover:opacity-90 active:opacity-75 disabled:opacity-50',
      secondary: 'bg-dark-bg-secondary border border-dark-border-primary text-dark-text-primary hover:bg-dark-bg-tertiary hover:border-dark-border-accent disabled:opacity-50',
      outline: 'border-2 border-dark-accent-primary text-dark-accent-primary hover:bg-dark-accent-primary hover:text-white bg-transparent disabled:opacity-50',
      ghost: 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-bg-secondary disabled:opacity-50',
    }

    // Loading state overrides the gradient — faded border + muted text beats opacity-50 on a gradient every time
    const loadingStyles = 'bg-dark-bg-tertiary border border-dark-accent-primary/25 text-dark-text-tertiary cursor-wait !opacity-100'

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          isLoading ? loadingStyles : variants[variant],
          sizes[size],
          className,
        )}
        disabled={isLoading || props.disabled}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Buttons: making clicks count since... always. 🔘
