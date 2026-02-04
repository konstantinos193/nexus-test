'use client'

/**
 * CollectionPageFooter – Same look as homepage footer: Docs, Terms, Privacy, Support, socials, © collection name.
 */

import Link from 'next/link'
import { Github } from 'lucide-react'
import type { CollectionDetail } from '@/types'
import styles from '@/components/layout/Footer.module.css'

export interface CollectionPageFooterProps {
  collection: CollectionDetail
}

export default function CollectionPageFooter({ collection }: CollectionPageFooterProps) {
  const year = new Date().getFullYear()

  const linkClass = styles.desktopFooterLink
  const dividerClass = styles.desktopFooterDivider
  const linksRow = (
    <div className={styles.desktopFooterLinks}>
      <Link href="/docs" className={linkClass}>Docs</Link>
      <Link href="/terms" className={linkClass}>Terms</Link>
      <Link href="/privacy" className={linkClass}>Privacy</Link>
      <span className={dividerClass}>•</span>
      <a href="https://discord.gg/dWTDBzKuXv" target="_blank" rel="noopener noreferrer" className={linkClass}>Support</a>
    </div>
  )
  const socialRow = (
    <div className={styles.desktopFooterSocial}>
      <a href="https://x.com/MartechNetworks" target="_blank" rel="noopener noreferrer" className={styles.desktopFooterSocialLink} aria-label="X (Twitter)">
        <svg className={styles.desktopFooterSocialIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>
      <a href="https://discord.gg/dWTDBzKuXv" target="_blank" rel="noopener noreferrer" className={styles.desktopFooterSocialLink} aria-label="Discord">
        <svg className={styles.desktopFooterSocialIcon} viewBox="0 0 126.644 96" fill="currentColor">
          <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
        </svg>
      </a>
      <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.desktopFooterSocialLink} aria-label="GitHub">
        <Github className={styles.desktopFooterSocialIcon} />
      </a>
    </div>
  )
  const copyright = <p className={styles.desktopFooterCopyright}>© {year} {collection.name}</p>

  return (
    <>
      <footer className={styles.desktopFooter}>
        <div className={styles.desktopFooterContainer}>
          <div className={styles.desktopFooterContent}>
            {linksRow}
            <div className={styles.desktopFooterRight}>
              {socialRow}
              {copyright}
            </div>
          </div>
        </div>
      </footer>
      <footer className={styles.mobileFooter}>
        <div className={styles.mobileFooterContainer}>
          <div className={styles.mobileFooterLinks}>
            <Link href="/docs" className={styles.mobileFooterLink}>Docs</Link>
            <Link href="/terms" className={styles.mobileFooterLink}>Terms</Link>
            <Link href="/privacy" className={styles.mobileFooterLink}>Privacy</Link>
            <span className={styles.mobileFooterDivider}>•</span>
            <a href="https://discord.gg/dWTDBzKuXv" target="_blank" rel="noopener noreferrer" className={styles.mobileFooterLink}>Support</a>
          </div>
          <div className={styles.mobileFooterRight}>
            <div className={styles.mobileFooterSocial}>
              <a href="https://x.com/MartechNetworks" target="_blank" rel="noopener noreferrer" className={styles.mobileFooterSocialLink} aria-label="X (Twitter)">
                <svg className={styles.mobileFooterSocialIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://discord.gg/dWTDBzKuXv" target="_blank" rel="noopener noreferrer" className={styles.mobileFooterSocialLink} aria-label="Discord">
                <svg className={styles.mobileFooterSocialIcon} viewBox="0 0 126.644 96" fill="currentColor">
                  <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                </svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.mobileFooterSocialLink} aria-label="GitHub">
                <Github className={styles.mobileFooterSocialIcon} />
              </a>
            </div>
            <p className={styles.mobileFooterCopyright}>© {year} {collection.name}</p>
          </div>
        </div>
      </footer>
    </>
  )
}
