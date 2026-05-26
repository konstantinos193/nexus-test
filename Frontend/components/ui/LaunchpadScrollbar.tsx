'use client'

// React hooks - because we need to know where the user is
// And manipulate the DOM (because sometimes you gotta)
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const LAUNCHPAD_CLASS = 'launchpad'

/**
 * Launchpad Scrollbar Component - DOM manipulation for custom scrollbars
 * Adds launchpad class to html/body when on /collections page
 * Because custom scrollbars need custom classes (and we're fancy)
 * 
 * This component is a necessary evil for styling scrollbars on specific pages
 * Without it, we'd be stuck with browser defaults (the horror)
 * 
 * @author Juan - The developer who built this scrollbar hack
 * (Coded with care, humor, and probably too much coffee)
 */
export default function LaunchpadScrollbar() {
  const pathname = usePathname()
  const isLaunchpad = pathname === '/collections'

  // Add launchpad class when entering launchpad page
  // Because we need those custom scrollbar styles (can't use browser defaults)
  useEffect(() => {
    if (isLaunchpad) {
      document.documentElement.classList.add(LAUNCHPAD_CLASS)
      document.body.classList.add(LAUNCHPAD_CLASS)
    }
  }, [isLaunchpad])

  // Remove launchpad class when leaving launchpad page
  // Clean up after ourselves (because we're not animals)
  useEffect(() => {
    if (!isLaunchpad) {
      document.documentElement.classList.remove(LAUNCHPAD_CLASS)
      document.body.classList.remove(LAUNCHPAD_CLASS)
    }
  }, [isLaunchpad])

  // Cleanup on unmount - because memory leaks are for amateurs
  // This ensures we don't leave classes hanging around like bad guests
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove(LAUNCHPAD_CLASS)
      document.body.classList.remove(LAUNCHPAD_CLASS)
    }
  }, [])

  // Return null because this component is all side effects
  // It's like a ghost - you can't see it, but it's doing work
  return null
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Scrollbars: the final frontier of CSS customization. 🎨
