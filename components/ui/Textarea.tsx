/**
 * Textarea Component - For when one line isn't enough
 * Because sometimes users need to write more than a sentence
 * (And sometimes they write novels, but we limit that)
 *
 * @author Juan - The developer who built this textarea
 * (Coded with care, humor, and probably too much coffee)
 */

import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg',
            'text-dark-text-primary placeholder-dark-text-tertiary',
            'focus:outline-none focus:border-dark-border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
            error && 'border-dark-accent-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-dark-accent-error">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea

// Coded by Juan - because every good component needs a developer signature
// P.S. - More than one line. Still not a novel.
