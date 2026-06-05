'use client'

/**
 * CustomDropdown – A hand-rolled dropdown that refuses to look like a browser default.
 * Native <select> elements are functional but styled like it's 2009.
 * This component achieves the same outcome with 100× more code and dignity.
 *
 * Features: keyboard navigation, click-outside-to-close, size variants, dark variant.
 * What it doesn't have: the simplicity of a native select. Worth it? Juan says yes.
 * (Juan also built it, so he's biased.)
 *
 * @author Juan – The developer who replaced one element with forty lines of behavior
 * (Coded with care, event listeners, and the eternal question: "why not just use <select>?")
 */

// useState — for tracking whether the dropdown is open or closed. Binary. Beautiful.
// useRef — for detecting clicks outside the dropdown (the "is the user done with me?" check)
// useEffect — for attaching and cleaning up the outside-click listener
import { useState, useRef, useEffect } from 'react'
// ChevronDown — the arrow that rotates when the dropdown opens.
// If this icon is missing, users won't know the dropdown is interactive. (Or they'll guess.)
import { ChevronDown } from 'lucide-react'
// CSS module — all the visual styling for the trigger button, option list, and selected state
import styles from './CustomDropdown.module.css'

/** A single selectable option in the dropdown. Value for logic, label for humans. */
interface DropdownOption {
  value: string  // The internal value passed to onChange — what the code cares about
  label: string  // The displayed text — what the human reads and judges
}

/** Props for CustomDropdown — the full configuration surface for this tiny UI kingdom. */
interface CustomDropdownProps {
  value: string                       // Currently selected value — controlled component
  options: DropdownOption[]           // The list of things to choose from
  onChange: (value: string) => void   // Fired when the user makes a selection
  placeholder?: string                // Shown when no option matches the current value
  className?: string                  // Optional extra class for the wrapper div
  fullWidth?: boolean                 // Whether the dropdown takes up its full container width
  size?: 'sm' | 'md' | 'lg'         // T-shirt sizing because we're not specifying px values
  variant?: 'default' | 'dark'       // Visual variant — dark mode superior, default for peasants
}

/**
 * CustomDropdown — A controlled dropdown with keyboard support and click-outside-to-close.
 * Looks nothing like a native select. Behaves exactly like one.
 * That's the trade. We made it consciously.
 */
export default function CustomDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  fullWidth = false,
  size = 'md',
  variant = 'default',
}: CustomDropdownProps) {
  // Open/closed state — the entire dropdown's existence hinges on this boolean
  const [isOpen, setIsOpen] = useState(false)

  // Ref on the wrapper div — needed for outside-click detection
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find the currently selected option object so we can display its label
  // If no option matches, we'll show the placeholder — which is the honest thing to do
  const selectedOption = options.find((opt) => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  // ── Outside Click Handler ────────────────────────────────────────────────────
  // When the dropdown is open and the user clicks anywhere outside the dropdown ref,
  // close it. This is the polite thing to do. Nobody likes a dropdown that won't leave.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Only register this listener when the dropdown is open — no point listening to the
    // entire document for every click when the dropdown isn't even visible
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Return cleanup — remove the listener when isOpen becomes false or component unmounts
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ── Keyboard Navigation ──────────────────────────────────────────────────────
  // Enter and Space toggle the dropdown — consistent with ARIA patterns
  // Escape closes it — universal escape key behavior
  // ArrowDown opens it — because arrow down should open a dropdown, that's just correct
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()         // Prevent space from scrolling the page
      setIsOpen(!isOpen)         // Toggle open/closed
    } else if (e.key === 'Escape') {
      setIsOpen(false)           // Close and move on with life
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault()         // Prevent page scroll
      setIsOpen(true)            // Open — the user is ready to choose
    }
  }

  /**
   * Handles option selection — calls onChange with the selected value and closes the menu.
   * Two responsibilities. Both executed. No debate.
   */
  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)  // Tell the parent what was chosen
    setIsOpen(false)       // Close the menu — mission accomplished
  }

  return (
    // The wrapper div — holds everything, referenced for outside-click detection
    <div className={`${styles.dropdown} ${fullWidth ? styles.dropdownFullWidth : ''} ${className}`} ref={dropdownRef}>

      {/* The trigger button — what the user clicks to open the dropdown.
          Dynamic class names based on size and variant props.
          This is the part users interact with. It must look trustworthy. */}
      <button
        type="button"
        // Dynamic class composition: base + size variant + visual variant
        // The string manipulation is ugly but it maps to CSS module class names correctly
        className={`${styles.trigger} ${styles[`trigger${size.charAt(0).toUpperCase() + size.slice(1)}`]} ${styles[`trigger${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        // ARIA attributes — for accessibility, screen readers, and our collective conscience
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Display text — either the selected option label or the placeholder */}
        <span className={styles.triggerText}>{displayText}</span>
        {/* The chevron — rotates 180deg when open. The only animation on this component.
            It's subtle. It communicates state. It sparks joy. */}
        <ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {/* The options list — only rendered when open.
          Conditional rendering beats display:none here — no ghost DOM when closed. */}
      {isOpen && (
        <div
          className={`${styles.menu} ${styles[`menu${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}
          // listbox role — ARIA semantic for a list of selectable options
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              // aria-selected — tells screen readers which option is currently active
              aria-selected={value === option.value}
              // Add optionSelected class when this is the active choice — visual affordance
              className={`${styles.option} ${value === option.value ? styles.optionSelected : ''}`}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because native selects are an aesthetic crime and we have standards.
// (The irony of 100 lines to replace one element is not lost on me. Worth it.)
// ─────────────────────────────────────────────────────────────────────────────
