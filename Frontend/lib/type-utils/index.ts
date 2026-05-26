/**
 * Type utilities - Safe type assertions and conversions
 * Because 'as any' is the root of all TypeScript evil
 */

// Safe type assertion with runtime check
export function assertType<T>(value: unknown, checker: (v: unknown) => v is T): T {
  if (!checker(value)) {
    throw new TypeError(`Type assertion failed: expected ${typeof value} to match predicate`)
  }
  return value
}

// Safe collection status type assertion
export function isCollectionStatus(value: unknown): value is 'draft' | 'preparing' | 'ready' | 'minting' | 'completed' | 'paused' {
  return typeof value === 'string' && 
    ['draft', 'preparing', 'ready', 'minting', 'completed', 'paused'].includes(value)
}

// Safe display status to internal status conversion
export function mapDisplayStatusToInternal(displayStatus: string): 'draft' | 'preparing' | 'ready' | 'minting' | 'completed' | 'paused' | undefined {
  switch (displayStatus) {
    case 'live': 
      return 'minting'
    case 'upcoming': 
      return 'ready' // Default to 'ready' for upcoming
    case 'ended': 
      return 'completed'
    default: 
      return undefined
  }
}

// Safe internal status to display status conversion  
export function mapInternalStatusToDisplay(internalStatus?: string): string {
  switch (internalStatus) {
    case 'minting': 
      return 'live'
    case 'ready':
    case 'preparing': 
      return 'upcoming'
    case 'completed': 
      return 'ended'
    default: 
      return ''
  }
}
