/**
 * Input Component - The text input that users type in
 * Because sometimes users need to type things
 * (And sometimes they type the wrong things, but that's not our problem)
 *
 * @author Juan - The developer who built this input
 * (Coded with care, humor, and probably too much coffee)
 */

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg',
            'text-dark-text-primary placeholder-dark-text-tertiary',
            'focus:outline-none focus:border-dark-border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
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

Input.displayName = 'Input'

export default Input

// Coded by Juan - because every good component needs a developer signature
// P.S. - Inputs: where dreams become (hopefully valid) text.
