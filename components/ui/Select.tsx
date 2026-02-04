/**
 * Select Component - The dropdown that gives users choices
 * Because sometimes you need to pick from a list
 * (And sometimes the list is too long, but that's life)
 */

import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg',
            'text-dark-text-primary',
            'focus:outline-none focus:border-dark-border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-dark-accent-error',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-2 text-sm text-dark-accent-error">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Dropdowns: making choices slightly less overwhelming. 📋
