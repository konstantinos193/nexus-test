'use client'

/**
 * LaunchpadScrollbar - Applies launchpad class to html/body when on /collections
 * So launchpad-specific scrollbar styles take effect on the collections page
 * Because even scrollbars deserve a little flair
 *
 * @author Juan - The developer who styled the scrollbar
 * (Coded with care, humor, and probably too much coffee)
 */

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const LAUNCHPAD_CLASS = 'launchpad'

export default function LaunchpadScrollbar() {
  const pathname = usePathname()
  const isLaunchpad = pathname === '/collections'

  useEffect(() => {
    if (isLaunchpad) {
      document.documentElement.classList.add(LAUNCHPAD_CLASS)
      document.body.classList.add(LAUNCHPAD_CLASS)
    } else {
      document.documentElement.classList.remove(LAUNCHPAD_CLASS)
      document.body.classList.remove(LAUNCHPAD_CLASS)
    }
    return () => {
      document.documentElement.classList.remove(LAUNCHPAD_CLASS)
      document.body.classList.remove(LAUNCHPAD_CLASS)
    }
  }, [isLaunchpad])

  return null
}

// Coded by Juan - because every good component needs a developer signature
// P.S. - Scrollbars: the unsung heroes of the page.
