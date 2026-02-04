import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn – merge Tailwind classes (clsx + twMerge)
 * Because stacking conditional classes without this is a mess
 * (And we're not masochists)
 *
 * @author Juan - The developer who merged the merge
 * (Coded with care, humor, and probably too much coffee)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Coded by Juan - because every good util needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - cn: making className manageable since... forever. 🧹
