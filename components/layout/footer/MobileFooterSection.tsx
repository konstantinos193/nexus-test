/**
 * Mobile Footer Section - Compact footer for small screens
 * Same links and social, just stacked. Because mobile screens are small
 * (And sometimes less is more. Who would've thought?)
 *
 * Structure: wrapper (mobileFooter) > container > links row + right block
 * Right block = social icons + copyright. We use the same FooterLinks,
 * FooterSocial, FooterCopyright with variant="mobile" so they pick mobile classes
 *
 * @author Juan - The developer who made the footer fit
 * (Coded with care, humor, and probably too much coffee)
 */

// Footer styles - we need mobileFooter, container, right block classes
import styles from '../Footer.module.css'
// Footer pieces - links row, social icons, copyright line
import FooterLinks from './FooterLinks'
import FooterSocial from './FooterSocial'
import FooterCopyright from './FooterCopyright'

export default function MobileFooterSection() {
  return (
    <footer className={styles.mobileFooter}>
      <div className={styles.mobileFooterContainer}>
        {/* Links row - nav + divider + support links (wraps on small screens) */}
        <FooterLinks variant="mobile" />
        <div className={styles.mobileFooterRight}>
          {/* Social icons - X, Discord, GitHub (same as desktop, smaller) */}
          <FooterSocial variant="mobile" />
          {/* Copyright - © year MarTech Networks */}
          <FooterCopyright variant="mobile" />
        </div>
      </div>
    </footer>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Mobile: same info, less real estate.
