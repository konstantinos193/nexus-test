/**
 * Select - The dropdown that forces the user to make a choice.
 * Unlike radio buttons (visible) or typeaheads (searchable), this is a simple
 * native <select>. One field. One dropdown. One value.
 * The options prop drives everything. No children, no custom rendering. Just options.
 *
 * Uses the native <select> element because:
 * 1. Native keyboard navigation comes for free.
 * 2. Native mobile picker behavior comes for free.
 * 3. We didn't need a custom dropdown here. We built one for the NFT standard picker.
 *    This one serves simpler needs. No shame in that.
 *
 * Features:
 * - Optional label above the select.
 * - Optional error state: red border + error message below.
 * - forwardRef for programmatic control.
 * - Full TypeScript: extends all native SelectHTMLAttributes.
 *
 * @author Juan - The developer who knows when to build custom and when to use native.
 * (The NFT standard picker in CollectionForm is custom. This one is not.
 * Context matters. Coded with the wisdom of scoping appropriately.)
 */

// forwardRef — exposes the underlying <select> DOM node to parent components.
// SelectHTMLAttributes — the full native select API. options is our addition.
import { SelectHTMLAttributes, forwardRef } from 'react'

// cn — classnames utility. Error state + custom className merge cleanly.
import { cn } from '@/lib/utils'

// ── Props interface ────────────────────────────────────────────────────────────
// SelectProps: all native select attributes + label + error + options.
// options is required — a select without options is a broken select.
// Each option has a value and a label. Value is the stored value. Label is what the user sees.
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  // options — the dropdown choices. Required. Required. Required.
  // If options is empty, the select is empty. Don't do that.
  options: { value: string; label: string }[]
}

/**
 * Select — renders an optional label, a native <select>, and an optional error message.
 * options maps to <option> elements. value and label are distinct.
 * The ref forwards to the <select> element for programmatic focus/control.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      // Wrapper div — full-width container for label + select + error.
      <div className="w-full">
        {/* Label — conditional, only when label prop is provided.
            Same pattern as Input. Font-medium, secondary color, 8px bottom margin.
            Consistent with the Input component so they feel like siblings. They are. */}
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}

        {/* The select — matches Input sizing and border patterns.
            Native dropdown behavior: OS-native picker on mobile, OS-native dropdown on desktop.
            This is intentional. Native pickers are optimized for the device.
            We're not fighting the platform here. */}
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg',
            'text-dark-text-primary',
            'focus:outline-none focus:border-dark-border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Error border — same red as Input error state. Visual consistency.
            error && 'border-dark-accent-error',
            className
          )}
          {...props}
        >
          {/* Options — mapped from the options prop array.
              key = value because values are unique identifiers.
              The label is what the user reads. The value is what the code receives. */}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Error message — only when error prop is provided.
            Below the select, red, small. Same pattern as Input.
            Users picked something wrong (or didn't pick anything when they needed to). */}
        {error && (
          <p className="mt-2 text-sm text-dark-accent-error">{error}</p>
        )}
      </div>
    )
  }
)

// displayName — "Select" in DevTools. Not "ForwardRef".
// We have opinions about component names in the DevTools tree.
Select.displayName = 'Select'

export default Select

// Coded by Juan — the dropdown. Native select. Options array. Error state. forwardRef.
// Not everything needs to be a custom combobox with animations.
// Sometimes a user just needs to pick from a list.
// We provide the list. They pick. Done.
