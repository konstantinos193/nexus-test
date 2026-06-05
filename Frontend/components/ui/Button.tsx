// React's forwardRef — lets parent components hold a ref to the underlying <button> element.
// Without this, you can't focus the button programmatically.
// ButtonHTMLAttributes — extends the full native button API so nothing gets lost.
import { ButtonHTMLAttributes, forwardRef } from 'react'

// cn — classnames utility. Merges base styles + variant + size + custom className.
// Without cn, we'd be doing string concatenation with template literals and crying.
import { cn } from '@/lib/utils'

/**
 * Button - The shared clickable primitive for the entire application.
 * Every CTA, every form submit, every "Cancel" link that's actually a button —
 * they all live here. One component. Four variants. Three sizes. One loading state.
 *
 * Variants:
 * - primary: gradient background, glowing hover, the important button.
 * - secondary: secondary action. Muted. Present but not dominant.
 * - outline: bordered. The "Cancel" variant. Still matters, just less urgently.
 * - ghost: text-only hover state. For actions that are almost links.
 *
 * Sizes:
 * - sm: compact, for tight layouts or secondary actions.
 * - md: standard, the default. Most buttons are md.
 * - lg: the deploy button. The submit button. The "this matters" button.
 *
 * isLoading: swaps the gradient for a flat border + muted text.
 * Why? Because gradient + opacity-50 on a loading state looks terrible.
 * We've seen it. We fixed it. The loading state has its own class now.
 * (Some bugs are aesthetic. We still fix them.)
 *
 * @author Juan - The developer who built this button and then used it everywhere.
 * Every form. Every CTA. Every "Next Step". They all go through here.
 * (Coded with care, a healthy respect for disabled states, and the knowledge
 * that cursor-not-allowed is not just for decoration — it communicates.)
 */

// ButtonProps — extends all native button HTML attributes.
// variant, size, isLoading are our additions. Everything else is native.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // variant — which visual style to apply. Defaults to 'primary'. Think before changing defaults.
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  // size — which size to use. Defaults to 'md'. The Deploy button uses 'lg'. Everything else is 'md'.
  size?: 'sm' | 'md' | 'lg'
  // isLoading — when true, disables the button and applies the loading styles.
  // Also overrides the gradient so opacity-50 doesn't make it look like a muddy rainbow.
  isLoading?: boolean
}

/**
 * Button — the forwardRef component. Ref passthrough for programmatic focus.
 * All native button props pass through via {...props} spread.
 * className merges with our generated styles via cn(). Custom overrides win.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, ...props }, ref) => {

    // baseStyles — applied to every button, every time.
    // inline-flex so icons inside align correctly.
    // font-semibold because buttons should look intentional.
    // focus:ring with offset for keyboard navigation visibility.
    // disabled:cursor-not-allowed because users need to know they can't click.
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-dark-accent-primary focus:ring-offset-2 focus:ring-offset-dark-bg-primary'

    // variants — one string per variant. Mutually exclusive.
    // primary: gradient + glow on hover. This is the "do the thing" button.
    // secondary: muted background, border. The "also available" button.
    // outline: accent border + transparent bg. Hover fills with accent color.
    // ghost: invisible background. Just text. Hover gives a soft bg.
    const variants = {
      primary: 'bg-gradient-accent text-white hover:shadow-glow-lg hover:opacity-90 active:opacity-75 disabled:opacity-50',
      secondary: 'bg-dark-bg-secondary border border-dark-border-primary text-dark-text-primary hover:bg-dark-bg-tertiary hover:border-dark-border-accent disabled:opacity-50',
      outline: 'border-2 border-dark-accent-primary text-dark-accent-primary hover:bg-dark-accent-primary hover:text-white bg-transparent disabled:opacity-50',
      ghost: 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-bg-secondary disabled:opacity-50',
    }

    // loadingStyles — completely overrides the gradient variant when isLoading is true.
    // Flat border + muted text + cursor-wait. Users know something is happening.
    // !opacity-100 prevents the disabled prop's opacity-50 from kicking in on top.
    // We control loading opacity explicitly. No double-applying.
    const loadingStyles = 'bg-dark-bg-tertiary border border-dark-accent-primary/25 text-dark-text-tertiary cursor-wait !opacity-100'

    // sizes — padding and font-size per size tier.
    // sm: compact. md: standard. lg: the important button on Step 4.
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
          // Loading style overrides the variant. Loading takes visual priority.
          // The gradient can wait. Feedback cannot.
          isLoading ? loadingStyles : variants[variant],
          sizes[size],
          // Custom className last — allows callers to override specific styles if needed.
          className,
        )}
        // disabled when either isLoading is true OR props.disabled is true.
        // Both conditions render the button unclickable. Belt and suspenders.
        disabled={isLoading || props.disabled}
        {...props}
      />
    )
  }
)

// displayName — shows "Button" in React DevTools instead of "ForwardRef".
// Small thing. Makes debugging 10% less miserable.
Button.displayName = 'Button'

export default Button

// Coded by Juan — four variants, three sizes, one loading state, zero gradient-plus-opacity atrocities.
// Every CTA in this application goes through this component.
// Next Step. Back. Cancel. Deploy on Solana. Upload to IPFS. Save as Draft.
// They all end up here. They all exit looking sharp.
