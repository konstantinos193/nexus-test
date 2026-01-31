/**
 * Card Component - The container that holds stuff
 * Because sometimes you need a fancy box (and divs are boring)
 *
 * Variants: default, elevated, outlined
 * Sub-components: CardHeader, CardTitle, CardDescription, CardContent
 *
 * @author Juan - The developer who built this card
 * (Coded with care, humor, and probably too much coffee)
 */

import { HTMLAttributes } from 'react'
// cn - merge Tailwind classes so we can stack base + variant + className
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
}

// Main card - the wrapper with variant styles
export function Card({ className, variant = 'default', ...props }: CardProps) {
  // Variants - default (flat), elevated (shadow + hover), outlined (accent border)
  const variants = {
    default: 'bg-dark-bg-secondary border border-dark-border-primary',
    elevated: 'bg-dark-bg-tertiary border border-dark-border-secondary shadow-dark-lg hover:shadow-glow transition-shadow',
    outlined: 'bg-transparent border-2 border-dark-border-accent'
  }

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-300',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

// CardHeader - optional header block (margin below)
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4', className)}
      {...props}
    />
  )
}

// CardTitle - optional title (h3, semibold)
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-2xl font-semibold text-dark-text-primary', className)}
      {...props}
    />
  )
}

// CardDescription - optional description (muted text)
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-dark-text-secondary', className)}
      {...props}
    />
  )
}

// CardContent - optional content block (no default margin)
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('', className)}
      {...props}
    />
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Cards: fancy boxes for fancy content.
