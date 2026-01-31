/**
 * Footer Copyright - The legal line at the bottom
 * Because we need to protect our intellectual property
 * (And copyright notices are legally required, so we put them here)
 *
 * One line: © {year} {siteCopyright}. We use new Date().getFullYear()
 * so we don't have to remember to update it every January
 *
 * @author Juan - The developer who added the fine print
 * (Coded with care, humor, and probably too much coffee)
 */

// SEO constants - siteCopyright lives here (single source of truth)
import { siteCopyright } from '@/lib/seo/constants'
// Footer styles - we need the right class for desktop vs mobile
import styles from '../Footer.module.css'

type Variant = 'desktop' | 'mobile'

// Map variant to the right class name from Footer.module.css
const CLASSES: Record<Variant, string> = {
  desktop: styles.desktopFooterCopyright,
  mobile: styles.mobileFooterCopyright,
}

interface FooterCopyrightProps {
  variant: Variant
}

export default function FooterCopyright({ variant }: FooterCopyrightProps) {
  // Dynamic year - because hardcoding the year is for amateurs
  const year = new Date().getFullYear()
  return (
    <p className={CLASSES[variant]}>
      © {year} {siteCopyright}
    </p>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - All rights reserved. Some lefts too.
