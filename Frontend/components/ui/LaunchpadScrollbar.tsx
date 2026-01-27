'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const LAUNCHPAD_CLASS = 'launchpad'

/**
 * Applies the launchpad class to html/body when on /collections
 * so launchpad-specific scrollbar styles take effect.
 */
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
