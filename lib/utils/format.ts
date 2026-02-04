/**
 * Format utilities - Because formatting is important
 * These functions make data look pretty (unlike my code)
 */

/**
 * Format wallet address - Shorten it so it fits on screen
 * Because full addresses are longer than my grocery list
 */
export function formatAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address || address.length < startLength + endLength) {
    return address
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * Format number with commas - Because big numbers need commas
 * 1000000 looks better as 1,000,000 (obviously)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format date - Make dates readable for humans
 * Because ISO dates are for robots, not people
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format percentage - Show progress in human-readable format
 * Because 0.85 is less clear than 85%
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// Coded by Juan - because every good util needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Formatting: making data readable since... always. ✨
