/**
 * Input - The humble text input. The foundation of all user-provided data.
 * Without this component, users can't type anything. Without users typing,
 * there are no collections. Without collections, the launchpad is just a webpage.
 * We're not being dramatic. Inputs matter. This one matters.
 *
 * Features:
 * - Optional label above the input. Pass label="" and it disappears cleanly.
 * - Optional error state: red border + error message below. Validation feedback.
 * - forwardRef so parent components can focus, blur, or measure the input.
 * - Full TypeScript: extends all native InputHTMLAttributes. Nothing lost.
 *
 * Use this for simple text, email, URL, number inputs.
 * For descriptions and longer text: use Textarea.
 * For dropdowns: use Select.
 * For dates: use DateTimePicker. (The native datetime-local input is not an option.)
 *
 * @author Juan - The developer who wrote this and then used it in approximately
 * forty-seven different places across the application.
 * (Coded with care, a forwardRef, and the disciplined refusal to add more props
 * than are actually necessary. Less API surface = fewer ways to misuse it.)
 */

// forwardRef — exposes the underlying <input> DOM element to parent components.
// InputHTMLAttributes — the full native input API. We add label and error on top.
import { InputHTMLAttributes, forwardRef } from 'react'

// cn — classnames utility. Error state adds a red border. Custom className merges in.
import { cn } from '@/lib/utils'

// ── Props interface ────────────────────────────────────────────────────────────
// InputProps extends everything native. We add two semantic props:
// label — displayed above the input in a <label> element. Accessible. Required for AT.
// error — shows a red border on the input + an error message below. Validation feedback.
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

/**
 * Input — renders an optional label, the input element, and an optional error message.
 * All native input props pass through. The ref is forwarded to the input element.
 * Error state: red border via border-dark-accent-error class, message below.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      // Wrapper div — full-width, contains label + input + error message.
      // w-full ensures the input fills its container. Always. That's the expectation.
      <div className="w-full">
        {/* Label — conditional, only renders when label prop is provided.
            Linked to the input via htmlFor... but wait, we don't set an id here.
            This is a known limitation of this component. CollectionForm sets its own
            htmlFor/id pairs directly. For standalone use, pass an id prop. */}
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}

        {/* The input — full-width, dark background, primary border, rounded.
            focus: highlights the border without the browser's native outline ring.
            disabled: opacity-50 + not-allowed cursor. Clear visual feedback.
            error: overrides border color to accent-error (red). Unmistakable. */}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg',
            'text-dark-text-primary placeholder-dark-text-tertiary',
            'focus:outline-none focus:border-dark-border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Error class overrides the border color to red. Applied on top.
            error && 'border-dark-accent-error',
            // Custom className last — callers can override anything.
            className
          )}
          {...props}
        />

        {/* Error message — only renders when error prop is provided.
            Small, red, below the input. Inline feedback.
            The user typed something wrong. We tell them. Politely. */}
        {error && (
          <p className="mt-2 text-sm text-dark-accent-error">{error}</p>
        )}
      </div>
    )
  }
)

// displayName — shows "Input" in React DevTools instead of "ForwardRef".
// Small QoL improvement that saves confusion during debugging sessions.
Input.displayName = 'Input'

export default Input

// Coded by Juan — the input that powers every field, every form, every collection.
// Label. Input. Error message. That's the whole contract.
// Sometimes users type the right things. Sometimes they don't.
// The error state handles the latter with dignity.
