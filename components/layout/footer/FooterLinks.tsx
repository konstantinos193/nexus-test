/**
 * Footer Links - Nav + support links for desktop and mobile footer
 * Same links as the header, but at the bottom
 * Because redundancy is sometimes helpful (unlike my dating advice)
 *
 * Nav: Collections, Create, Dashboard. Divider. Support: FAQ, Docs, Privacy, Terms.
 * We use a variant (desktop | mobile) so one component serves both footers
 * and picks the right CSS classes from Footer.module.css
 *
 * @author Juan - The developer who put links in two places
 * (Coded with care, humor, and probably too much coffee)
 */

// Next link - for client-side nav (no full reload)
import Link from 'next/link'
// Footer styles - we need the right class names for links, wrapper, divider
import styles from '../Footer.module.css'

type Variant = 'desktop' | 'mobile'

// Map variant to the right class names from Footer.module.css
// Because we're not duplicating the same JSX twice with different class names
const CLASSES: Record<Variant, { links: string; link: string; divider: string }> = {
  desktop: {
    links: styles.desktopFooterLinks,
    link: styles.desktopFooterLink,
    divider: styles.desktopFooterDivider,
  },
  mobile: {
    links: styles.mobileFooterLinks,
    link: styles.mobileFooterLink,
    divider: styles.mobileFooterDivider,
  },
}

// Main nav links - Collections, Create, Dashboard
// Because these are the same as the header (redundancy, but helpful)
const NAV_LINKS = [
  { href: '/collections', label: 'Collections' },
  { href: '/create', label: 'Create' },
  { href: '/dashboard', label: 'Dashboard' },
]
// Support/legal links - FAQ, Docs, Privacy, Terms
// Because sometimes you scroll to the bottom and need these (and we're not rude)
const SUPPORT_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/docs', label: 'Docs' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

interface FooterLinksProps {
  variant: Variant
}

export default function FooterLinks({ variant }: FooterLinksProps) {
  const c = CLASSES[variant]
  return (
    <div className={c.links}>
      {NAV_LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className={c.link}>
          {label}
        </Link>
      ))}
      {/* Divider - the little dot between main nav and support links */}
      <span className={c.divider}>•</span>
      {SUPPORT_LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className={c.link}>
          {label}
        </Link>
      ))}
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Two places for links. We're thorough.
