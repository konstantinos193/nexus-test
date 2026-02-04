'use client'

/**
 * Footer Component - The Bottom of the Page
 * The thing that sits at the bottom and tells you where you can go (again)
 * Because sometimes you scroll all the way down and need links
 * (And we're not going to make you scroll back up - that's just rude)
 * 
 * Desktop: Traditional footer with links and social icons
 * Because desktop users deserve a proper footer
 * (And footers are like the credits at the end of a movie, but for websites)
 * 
 * Mobile: Compact footer that matches desktop
 * Because we learned our lesson about making mobile footers huge
 * (And sometimes less is more - who would've thought?)
 * 
 * Features:
 * - Navigation links (because you might want to navigate from the footer)
 *   (And having links in two places is like having two GPS systems - redundant but helpful)
 * - Social media icons (because we're social creatures, or so they say)
 *   (And clicking these won't make you famous, but it might make us feel better)
 * - Copyright notice (because legal stuff is important)
 *   (And we don't want anyone stealing our code - it's too good to steal)
 * 
 * @author Juan - The developer who built this footer
 * (Coded with care, humor, and probably too much coffee)
 * P.S. - If you've scrolled this far, you're either really interested or really bored.
 */

import Link from 'next/link'
import { Github } from 'lucide-react'
import { siteCopyright } from '@/lib/seo/constants'
import styles from './Footer.module.css'

export default function Footer() {
  // Scroll to top function - because sometimes you want to go back up
  // (And clicking the top of the page is too much work)
  // This smoothly scrolls to the top (because instant teleportation isn't smooth)
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Desktop Footer - The Traditional Approach
          Because desktop users deserve a proper footer
          (And footers are like the credits at the end of a movie, but for websites)
          Shows links and social icons in a clean, organized way
          Because organization is key (unlike my desk) */}
      <footer className={styles.desktopFooter}>
        <div className={styles.desktopFooterContainer}>
          <div className={styles.desktopFooterContent}>
            {/* Footer Links - Navigation links for easy access
                Because sometimes you scroll all the way down and need links
                (And we're not going to make you scroll back up - that's just rude)
                These are the same links as the header, but in the footer
                (Because redundancy is sometimes helpful, unlike my dating advice) */}
            <div className={styles.desktopFooterLinks}>
              <Link href="/collections" className={styles.desktopFooterLink}>
                Collections
              </Link>
              <Link href="/create" className={styles.desktopFooterLink}>
                Create
              </Link>
              <Link href="/dashboard" className={styles.desktopFooterLink}>
                Dashboard
              </Link>
              {/* Divider - the little dot that separates main nav from support/legal
                  Because visual separation is important (unlike my work-life balance)
                  Only shows on larger screens (because on small screens, space is precious) */}
              <span className={styles.desktopFooterDivider}>•</span>
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
            
            {/* Footer Right Side - Social icons and copyright
                Because social media is important (or so they say)
                (And copyright notices are legally required, so we put them here)
                This section sits on the right side (because balance is key) */}
            <div className={styles.desktopFooterRight}>
              {/* Social Media Icons - Connect with us (or don't, we won't judge)
                  Because social media is how we stay connected
                  (And clicking these won't make you famous, but it might make us feel better)
                  Each icon has a hover effect (because interactivity is fun) */}
              <div className={styles.desktopFooterSocial}>
                {/* X (Twitter) - The bird that's now an X
                    Because rebranding is fun (or so Elon thinks)
                    (And we're not going to judge the rebrand, we're just here for the links) */}
                <a 
                  href="https://x.com/MartechNetworks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.desktopFooterSocialLink}
                  aria-label="X (Twitter)"
                >
                  <svg className={styles.desktopFooterSocialIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                
                {/* Discord - The chat app for gamers (and NFT enthusiasts)
                    Because community is important (and Discord is where communities live)
                    (And if you're not on Discord, are you even in Web3?) */}
                <a 
                  href="https://discord.gg/dWTDBzKuXv" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.desktopFooterSocialLink}
                  aria-label="Discord"
                >
                  <svg className={styles.desktopFooterSocialIcon} viewBox="0 0 126.644 96" fill="currentColor">
                    <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                  </svg>
                </a>
                
                {/* GitHub - The code repository (where all the magic happens)
                    Because open source is cool (or so developers say)
                    (And if you're reading this, you might actually check out our code) */}
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.desktopFooterSocialLink}
                  aria-label="GitHub"
                >
                  <Github className={styles.desktopFooterSocialIcon} />
                </a>
              </div>
              
              {/* Copyright Notice - The legal stuff
                  Because we need to protect our intellectual property
                  (And copyright notices are legally required, so we put them here)
                  Shows the current year dynamically (because hardcoding years is for amateurs) */}
              <p className={styles.desktopFooterCopyright}>
                © {new Date().getFullYear()} {siteCopyright}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Footer - Compact Like Desktop
          Because we learned our lesson about making mobile footers huge
          (And sometimes less is more - who would've thought?)
          This is the same as desktop, just smaller and more compact
          Because mobile screens are small (obviously) and we don't want to waste space */}
      <footer className={styles.mobileFooter}>
        <div className={styles.mobileFooterContainer}>
          {/* Footer Links - Compact Layout
              Because mobile users also need links (shocking, I know)
              These wrap nicely on small screens (because we're not monsters)
              Same links as desktop, just arranged differently
              (Because consistency is key, unlike my sleep schedule) */}
          <div className={styles.mobileFooterLinks}>
            <Link href="/collections" className={styles.mobileFooterLink}>
              Collections
            </Link>
            <Link href="/create" className={styles.mobileFooterLink}>
              Create
            </Link>
            <Link href="/dashboard" className={styles.mobileFooterLink}>
              Dashboard
            </Link>
            {/* Divider - the little dot that separates main nav from support/legal
                Because visual separation is important (even on mobile)
                (And dots are cute, unlike my dating life) */}
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

          {/* Social Links and Copyright - The Right Side Stuff
              Because social media is important (or so they say)
              (And copyright notices are legally required, so we put them here)
              This section sits below the links (because vertical stacking is mobile-friendly) */}
          <div className={styles.mobileFooterRight}>
            {/* Social Media Icons - Connect with us (or don't, we won't judge)
                Because social media is how we stay connected
                (And clicking these won't make you famous, but it might make us feel better)
                Same icons as desktop, just smaller (because mobile screens are small) */}
            <div className={styles.mobileFooterSocial}>
              {/* X (Twitter) - The bird that's now an X
                  Because rebranding is fun (or so Elon thinks)
                  (And we're not going to judge the rebrand, we're just here for the links) */}
              <a 
                href="https://x.com/MartechNetworks" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.mobileFooterSocialLink}
                aria-label="X (Twitter)"
              >
                <svg className={styles.mobileFooterSocialIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              
              {/* Discord - The chat app for gamers (and NFT enthusiasts)
                  Because community is important (and Discord is where communities live)
                  (And if you're not on Discord, are you even in Web3?) */}
              <a 
                href="https://discord.gg/dWTDBzKuXv" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.mobileFooterSocialLink}
                aria-label="Discord"
              >
                <svg className={styles.mobileFooterSocialIcon} viewBox="0 0 126.644 96" fill="currentColor">
                  <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                </svg>
              </a>
              
              {/* GitHub - The code repository (where all the magic happens)
                  Because open source is cool (or so developers say)
                  (And if you're reading this, you might actually check out our code) */}
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.mobileFooterSocialLink}
                aria-label="GitHub"
              >
                <Github className={styles.mobileFooterSocialIcon} />
              </a>
            </div>
            
            {/* Copyright Notice - The legal stuff
                Because we need to protect our intellectual property
                (And copyright notices are legally required, so we put them here)
                Shows the current year dynamically (because hardcoding years is for amateurs)
                Same as desktop, just smaller (because mobile screens are small) */}
            <p className={styles.mobileFooterCopyright}>
              © {new Date().getFullYear()} {siteCopyright}
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - If you've scrolled this far, you're either really interested or really bored. 🎯
