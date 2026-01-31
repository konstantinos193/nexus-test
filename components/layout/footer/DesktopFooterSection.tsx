/**
 * Desktop Footer Section - The traditional footer for big screens
 * Links, social, copyright. One row. Because desktop users deserve a proper footer
 * (And footers are like the credits at the end of a movie, but for websites)
 *
 * Structure: wrapper (desktopFooter) > container > content (links + right block)
 * Right block = social icons + copyright. We use FooterLinks, FooterSocial,
 * FooterCopyright with variant="desktop" so they pick the right classes
 *
 * @author Juan - The developer who laid out the desktop footer
 * (Coded with care, humor, and probably too much coffee)
 */

// Footer styles - we need desktopFooter, container, content, right block classes
import styles from '../Footer.module.css'
// Footer pieces - links row, social icons, copyright line
import FooterLinks from './FooterLinks'
import FooterSocial from './FooterSocial'
import FooterCopyright from './FooterCopyright'

export default function DesktopFooterSection() {
  return (
    <footer className={styles.desktopFooter}>
      <div className={styles.desktopFooterContainer}>
        <div className={styles.desktopFooterContent}>
          {/* Links row - nav + divider + support links */}
          <FooterLinks variant="desktop" />
          <div className={styles.desktopFooterRight}>
            {/* Social icons - X, Discord, GitHub */}
            <FooterSocial variant="desktop" />
            {/* Copyright - © year MarTech Networks */}
            <FooterCopyright variant="desktop" />
          </div>
        </div>
      </div>
    </footer>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Desktop: room to breathe. And links.
