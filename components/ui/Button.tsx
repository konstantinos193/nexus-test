/**
 * Button Component - The clickable thing that does stuff
 * Because every app needs buttons (and we're not going to make users wave at the screen)
 *
 * Variants: primary, secondary, outline, ghost
 * Sizes: sm, md, lg
 *
 * @author Juan - The developer who built this button
 * (Coded with care, humor, and probably too much coffee)
 */

import { ButtonHTMLAttributes, forwardRef } from 'react'
// cn - merge Tailwind classes (clsx + twMerge) so we can stack variant + size + className
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    // Base styles - font, radius, transition, disabled state, focus ring
    // Because a button without focus styles is like a door without a handle (accessibility matters)
    const baseStyles = 'font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-dark-accent-primary focus:ring-offset-2 focus:ring-offset-dark-bg-primary'

    // Variants - primary (gradient), secondary (border), outline (accent border), ghost (no bg)
    const variants = {
      primary: 'bg-gradient-accent text-white hover:shadow-glow-lg hover:opacity-90 active:opacity-75',
      secondary: 'bg-dark-bg-secondary border border-dark-border-primary text-dark-text-primary hover:bg-dark-bg-tertiary hover:border-dark-border-accent',
      outline: 'border-2 border-dark-accent-primary text-dark-accent-primary hover:bg-dark-accent-primary hover:text-white bg-transparent',
      ghost: 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-bg-secondary'
    }

    // Sizes - sm (compact), md (default), lg (big)
    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg'
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Buttons: making clicks count since... always.
