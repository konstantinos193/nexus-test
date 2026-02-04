'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './CustomDropdown.module.css'

interface DropdownOption {
  value: string
  label: string
}

interface CustomDropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'dark'
}

/**
 * CustomDropdown Component - A custom-styled dropdown that doesn't look like a browser default
 * Because native selects are ugly and we have standards (even if they're low)
 * Styles: CustomDropdown.module.css (standalone, no global dependency).
 *
 * @author Juan - The developer who built this custom dropdown
 * (Coded with care, humor, and probably too much coffee)
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
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find the selected option's label
  const selectedOption = options.find((opt) => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`${styles.dropdown} ${fullWidth ? styles.dropdownFullWidth : ''} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.trigger} ${styles[`trigger${size.charAt(0).toUpperCase() + size.slice(1)}`]} ${styles[`trigger${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerText}>{displayText}</span>
        <ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={`${styles.menu} ${styles[`menu${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
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

// Coded by Juan - because every good dropdown needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Custom dropdowns: making selects less terrible since... today. 📋
