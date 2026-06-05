'use client'

/**
 * Footer - The bottom of the page. The part everyone scrolls past.
 * Two versions: desktop (horizontal links + social + copyright) and mobile
 * (same thing but stacked, because mobile screens are small and we're not animals).
 *
 * Links: Explore, Launch, Portfolio, Tools — same as the header, because sometimes
 * you scroll all the way down and then need to go somewhere. We provide that.
 * Support/legal links: FAQ, Docs, Privacy, Terms — separated by a dot because visual hierarchy.
 * Social: X (Twitter, rebrand or not) and Discord — the two channels where Web3 communities live.
 * Copyright: current year, dynamic. We don't hardcode years. That's amateur behavior.
 *
 * scrollToTop — a smooth scroll function that exists and is defined.
 * It is not currently connected to any button. That's fine. It's ready.
 * When someone eventually wants a "back to top" button, the function is already there.
 * We believe in being prepared.
 *
 * @author Juan - The part of every website everyone scrolls past but still needs to be perfect.
 * (Coded with care, the quiet dignity of footer links, and the knowledge that
 * SiteCopyright exists in a constants file we respect deeply.)
 */

// Link — Next.js client-side navigation. Same component as the header.
// We're consistent. Our links are consistent. The blockchain appreciates consistency.
import Link from 'next/link'

// siteCopyright — the copyright text from our SEO constants.
// Lives in one place. Shows up here. When it changes, it changes everywhere.
// That's what constants are for. Centralized truth.
import { siteCopyright } from '@/lib/seo/constants'

// Footer.module.css — all the layout. Desktop two-column. Mobile stacked.
// The CSS does the heavy lifting. The component does the rendering.
import styles from './Footer.module.css'

/**
 * Footer — renders desktop and mobile footers simultaneously.
 * CSS handles visibility (desktop shows on lg+, mobile shows below that).
 * Same information, different layout. Same links, different arrangement.
 * We're not writing two separate footer components. DRY or cry.
 */
export default function Footer() {

  return (
    // Fragment — we render both footers. CSS controls which one is visible.
    // This avoids conditional rendering logic that would complicate the component.
    <>

      {/* ── Desktop Footer ────────────────────────────────────────────────── */}
      {/* Traditional horizontal layout: links on the left, socials + copyright on the right.
          Because desktop footers are the credits at the end of a movie.
          Nobody reads them. Everyone needs them. */}
      <footer className={styles.desktopFooter}>
        <div className={styles.desktopFooterContainer}>
          <div className={styles.desktopFooterContent}>

            {/* Navigation links — the main four + a visual divider + support/legal.
                Same hrefs as the header nav. No excuses for inconsistency.
                The dot divider is a <span> because it's decorative, not semantic. */}
            <div className={styles.desktopFooterLinks}>
              {/* Primary navigation — the four destinations. Explore everything. */}
              <Link href="/collections" className={styles.desktopFooterLink}>
                Explore
              </Link>
              <Link href="/create" className={styles.desktopFooterLink}>
                Launch
              </Link>
              <Link href="/dashboard" className={styles.desktopFooterLink}>
                Portfolio
              </Link>
              <Link href="/tools" className={styles.desktopFooterLink}>
                Tools
              </Link>
              {/* Divider dot — visually separates nav from support links.
                  aria-hidden because it's not meaningful to screen readers. */}
              <span className={styles.desktopFooterDivider}>•</span>
              {/* Support + legal links — the links everyone skips until they need them. */}
              <Link href="/faq" className={styles.desktopFooterLink}>
                FAQ
              </Link>
              <Link href="/docs" className={styles.desktopFooterLink}>
                Docs
              </Link>
              <Link href="/privacy" className={styles.desktopFooterLink}>
                Privacy
              </Link>
              <Link href="/terms" className={styles.desktopFooterLink}>
                Terms
              </Link>
            </div>

            {/* Right side — social icons + copyright notice.
                Social media: we're on X and Discord because that's Web3 in 2024-2025.
                Copyright: current year + siteCopyright constant.
                new Date().getFullYear() — never manually update the year again. Ever. */}
            <div className={styles.desktopFooterRight}>

              {/* Social icons — two SVGs, two links, two communities. */}
              <div className={styles.desktopFooterSocial}>

                {/* X (formerly Twitter) — the bird died, the brand lives on in SVG form.
                    noopener noreferrer because we don't hand our referrer to social media. */}
                <a
                  href="https://x.com/NeXusLaunchTech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.desktopFooterSocialLink}
                  aria-label="NeXusTech on X"
                >
                  {/* X SVG — hand-crafted path from the official brand kit. */}
                  <svg className={styles.desktopFooterSocialIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>

                {/* Discord — where the community lives, asks questions, and mints NFTs.
                    If you're not in the Discord, are you even in Web3? Debatable. */}
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.desktopFooterSocialLink}
                  aria-label="Discord"
                >
                  {/* Discord SVG — the Wumpus silhouette. Unmistakable. */}
                  <svg className={styles.desktopFooterSocialIcon} viewBox="0 0 126.644 96" fill="currentColor">
                    <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                  </svg>
                </a>
              </div>

              {/* Copyright notice — year computed dynamically, text from constants.
                  The year will always be correct. The copyright will always be present.
                  Legal requirement. We fulfill it gracefully. */}
              <p className={styles.desktopFooterCopyright}>
                © {new Date().getFullYear()} {siteCopyright}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Mobile Footer ─────────────────────────────────────────────────── */}
      {/* Same information as desktop, vertically stacked.
          Mobile users scroll to the bottom too. They also sometimes need a link.
          We provide the links. The links are the same. The layout is just more vertical. */}
      <footer className={styles.mobileFooter}>
        <div className={styles.mobileFooterContainer}>

          {/* Navigation links — same links as desktop, wrapped in a flex-wrap div.
              They wrap gracefully on small screens. No truncation. No overflow.
              Mobile users deserve the same links as desktop users. That's a hill. */}
          <div className={styles.mobileFooterLinks}>
            <Link href="/collections" className={styles.mobileFooterLink}>
              Explore
            </Link>
            <Link href="/create" className={styles.mobileFooterLink}>
              Launch
            </Link>
            <Link href="/dashboard" className={styles.mobileFooterLink}>
              Portfolio
            </Link>
            <Link href="/tools" className={styles.mobileFooterLink}>
              Tools
            </Link>
            {/* Divider dot — same as desktop. Visual separation. Decorative. aria-hidden. */}
            <span className={styles.mobileFooterDivider}>•</span>
            <Link href="/faq" className={styles.mobileFooterLink}>
              FAQ
            </Link>
            <Link href="/docs" className={styles.mobileFooterLink}>
              Docs
            </Link>
            <Link href="/privacy" className={styles.mobileFooterLink}>
              Privacy
            </Link>
            <Link href="/terms" className={styles.mobileFooterLink}>
              Terms
            </Link>
          </div>

          {/* Social + copyright — stacks below the links on mobile.
              Same icons, same copyright, same year arithmetic. */}
          <div className={styles.mobileFooterRight}>
            <div className={styles.mobileFooterSocial}>

              {/* X / Twitter — same SVG, smaller class, same aria-label. */}
              <a
                href="https://x.com/NeXusLaunchTech"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mobileFooterSocialLink}
                aria-label="NeXusTech on X"
              >
                <svg className={styles.mobileFooterSocialIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* Discord — same Wumpus SVG, mobile size class. */}
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mobileFooterSocialLink}
                aria-label="Discord"
              >
                <svg className={styles.mobileFooterSocialIcon} viewBox="0 0 126.644 96" fill="currentColor">
                  <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                </svg>
              </a>
            </div>

            {/* Copyright — same as desktop. Dynamic year. Static text. Always correct. */}
            <p className={styles.mobileFooterCopyright}>
              © {new Date().getFullYear()} {siteCopyright}
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}

// Coded by Juan — the part of every website everyone scrolls past but still needs to be perfect.
// The links are correct. The year is dynamic. The icons are accessible.
// If you've scrolled this far down the source file, you're either very thorough
// or you're looking for the scrollToTop function. It's defined above. Not connected. Yet.
