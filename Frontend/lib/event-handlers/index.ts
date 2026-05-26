/**
 * Event handler utilities - Extract inline handlers to prevent re-creation
 * Because inline functions in JSX create performance issues
 */

// Navigation utilities
export const navigationUtils = {
  goBack: () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  },
  
  scrollToTop: () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

// Form event handlers
export const formUtils = {
  preventDefault: (e: React.FormEvent) => {
    e.preventDefault()
  },
  
  stopPropagation: (e: React.MouseEvent) => {
    e.stopPropagation()
  }
}

// Common input change handlers
export const inputUtils = {
  createTextChangeHandler: (setter: (value: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value)
    }
  },
  
  createSelectChangeHandler: (setter: (value: string) => void) => {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value)
    }
  }
}
