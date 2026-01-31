'use client'

/**
 * Footer Component - The bottom of the page
 * The thing that sits at the bottom and tells you where you can go (again)
 * Because sometimes you scroll all the way down and need links
 * (And we're not going to make you scroll back up. That's just rude)
 *
 * Desktop + mobile sections live in small files (footer/DesktopFooterSection,
 * footer/MobileFooterSection). This just composes them. No logic, no state.
 * Both sections render on every page; CSS hides one or the other by breakpoint
 *
 * @author Juan - The developer who built this footer
 * (Coded with care, humor, and probably too much coffee)
 */

// Desktop footer - links, social, copyright in one row
import DesktopFooterSection from './footer/DesktopFooterSection'
// Mobile footer - same content, stacked for small screens
import MobileFooterSection from './footer/MobileFooterSection'

export default function Footer() {
  return (
    <>
      <DesktopFooterSection />
      <MobileFooterSection />
    </>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - If you've scrolled this far, you're either really interested or really bored.
