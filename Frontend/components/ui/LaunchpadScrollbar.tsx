'use client'

/**
 * LaunchpadScrollbar - The component that does one thing and is unashamed about it.
 * Adds the 'launchpad' CSS class to both <html> and <body> when on the /collections page.
 * Removes it when leaving. Returns null because it renders nothing visible.
 *
 * Why a component? Because custom scrollbar CSS requires a class on a specific ancestor
 * and CSS modules/Tailwind can't target html/body from inside a component's scope.
 * So we add the class imperatively, with useEffect, like adults who accept the browser's rules.
 *
 * Why both html and body? Because browsers disagree about which element scrolls.
 * Some browsers scroll the body. Some scroll the documentElement (html).
 * We add to both so we don't have to care about the answer.
 * (Belt AND suspenders. We've been burned before. Twice. Same bug. Two browsers.)
 *
 * Why three useEffect hooks? Three cleanup scenarios:
 * 1. Enter /collections: add class.
 * 2. Leave /collections: remove class.
 * 3. Component unmounts (e.g., navigating away): remove class.
 * Three effects, three guarantees. The class is always cleaned up.
 *
 * This component renders null. It has no UI.
 * It is a ghost that manages CSS class state on the document root.
 * We're comfortable with this. The scrollbar is not comfortable without it.
 *
 * @author Juan - The developer who built a component that returns null
 * and still ships it proudly because the scrollbar looked terrible without it.
 * (Coded with care, browser cross-compatibility testing, and the acceptance that
 * sometimes the correct solution is a invisible component that kicks the DOM.)
 */

// usePathname — tells us the current route. When it's '/collections', we activate.
// Not a hook we chose for fun. It's the cleanest way to react to navigation events.
import { usePathname } from 'next/navigation'

// useEffect — side effects on the document. Mount, update, unmount. All covered.
import { useEffect } from 'react'

// LAUNCHPAD_CLASS — the CSS class we add and remove.
// Defined as a constant so we can't typo it in three different places.
// Typos in class names are silent failures. Constants prevent silent failures.
const LAUNCHPAD_CLASS = 'launchpad'

/**
 * LaunchpadScrollbar — a pure side-effect component.
 * No props. No local state. No return value.
 * Three effects manage class addition, removal, and unmount cleanup.
 * Returns null because this component has nothing to render.
 * That's not a weakness. That's scope clarity.
 */
export default function LaunchpadScrollbar() {
  // pathname — current URL path. Re-runs effects when this changes.
  // usePathname is the correct hook here. useRouter().pathname is deprecated.
  const pathname = usePathname()

  // isLaunchpad — true only on /collections. Exact match.
  // We don't want to add this class on /collections/[id] or any other route.
  // Exact match. Discipline. Scope.
  const isLaunchpad = pathname === '/collections'

  // Effect 1: Add class when entering the collections page.
  // Both html (documentElement) and body because browser scroll behavior is inconsistent.
  // Cleanup: this effect doesn't need cleanup because Effect 2 handles removal.
  // But we still need this separate from Effect 2 because React runs effects in order
  // and we want the add/remove to happen in two clearly separated effects.
  useEffect(() => {
    if (isLaunchpad) {
      document.documentElement.classList.add(LAUNCHPAD_CLASS)
      document.body.classList.add(LAUNCHPAD_CLASS)
    }
  }, [isLaunchpad])

  // Effect 2: Remove class when leaving the collections page.
  // When isLaunchpad flips from true to false, this removes the class immediately.
  // No stale class on a route that doesn't need custom scrollbars.
  useEffect(() => {
    if (!isLaunchpad) {
      document.documentElement.classList.remove(LAUNCHPAD_CLASS)
      document.body.classList.remove(LAUNCHPAD_CLASS)
    }
  }, [isLaunchpad])

  // Effect 3: Cleanup on unmount.
  // If the LaunchpadScrollbar component itself unmounts while on /collections
  // (e.g., layout change, error boundary, unmount for any reason),
  // we still remove the class. No orphaned launchpad classes on the html element.
  // We're responsible. We clean up after ourselves.
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove(LAUNCHPAD_CLASS)
      document.body.classList.remove(LAUNCHPAD_CLASS)
    }
  }, [])

  // null — this component renders nothing.
  // It exists purely for the side effects above.
  // You cannot see it. You can only see what it does.
  // Like a good infrastructure engineer: you only notice it when it's gone.
  return null
}

// Coded by Juan — the invisible component that makes the scrollbar look good on /collections.
// Returns null. Manages a CSS class. Cleans up after itself.
// Three effects for three scenarios. No leaks. No orphaned classes.
// It's a ghost. A helpful, tidy, scrollbar-managing ghost.
