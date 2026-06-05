/**
 * Textarea - For when a single line isn't enough and the user has things to say.
 * Collection descriptions. Allowlist wallet dumps. Phase notes that nobody will read
 * but the form requires anyway.
 *
 * The textarea does not resize. resize-none is intentional.
 * We control the layout. The textarea fits the layout.
 * If the user needs more space, they can type smaller. (We're kidding. Use rows prop.)
 *
 * Features:
 * - Optional label above the textarea.
 * - Optional error state: red border + error message below.
 * - forwardRef for programmatic focus.
 * - Full TypeScript: extends all native TextareaHTMLAttributes.
 * - Consistent styling with Input and Select. They're a family. They look alike.
 *
 * @author Juan - The developer who built this textarea for collection descriptions
 * and then watched users write 250 characters in it, which is exactly 250 characters
 * more than the blockchain technically requires but exactly the right amount for
 * collectors to decide whether to mint.
 * (Coded with care, a hard-coded resize-none, and respect for the maxLength prop.)
 */

// forwardRef — exposes the textarea DOM node for programmatic control.
// TextareaHTMLAttributes — the full native textarea API.
import { TextareaHTMLAttributes, forwardRef } from 'react'

// cn — classnames. Error border. Custom className. The usual.
import { cn } from '@/lib/utils'

// ── Props interface ────────────────────────────────────────────────────────────
// TextareaProps: all native textarea attributes + label + error.
// Same pattern as Input and Select. If you know one, you know all three.
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

/**
 * Textarea — renders an optional label, the textarea element, and an optional error message.
 * resize-none is hardcoded because we control the layout.
 * If you need a resizable textarea, extend this with a className override.
 * (Or add a resize prop. We didn't. But you can. That's the beauty of {...props}.)
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      // Wrapper div — full-width, same structure as Input and Select.
      // Three siblings in a family. All wrapped in w-full divs. It's who they are.
      <div className="w-full">
        {/* Label — conditional, same pattern as Input and Select.
            Same font-medium, same secondary color, same 8px bottom margin.
            Visual consistency across all form primitives. They're siblings. */}
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}

        {/* The textarea — no resize because we control the layout.
            Rows are controlled via the rows prop (native HTML). Default is browser-default.
            For CollectionForm description: rows={4}. For allowlist: rows={4} or rows={6}.
            Callers decide. We just don't let users override the height by dragging.
            Because "dragged-out textarea" in a tightly-designed form is visual chaos. */}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg',
            'text-dark-text-primary placeholder-dark-text-tertiary',
            'focus:outline-none focus:border-dark-border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
            // Error state — red border. Same treatment as Input. Same visual language.
            error && 'border-dark-accent-error',
            className
          )}
          {...props}
        />

        {/* Error message — only when error prop is provided.
            Inline validation feedback. Consistent with Input and Select.
            The user wrote something wrong. We tell them. Below the textarea. In red. */}
        {error && (
          <p className="mt-2 text-sm text-dark-accent-error">{error}</p>
        )}
      </div>
    )
  }
)

// displayName — "Textarea" in DevTools. "ForwardRef" told us nothing useful.
Textarea.displayName = 'Textarea'

export default Textarea

// Coded by Juan — for when one line simply won't cut it.
// Descriptions, allowlists, notes, manifestos.
// resize-none. We mean it. The layout is a contract. The contract holds.
// If you break the layout contract by resizing a textarea, you're on your own.
