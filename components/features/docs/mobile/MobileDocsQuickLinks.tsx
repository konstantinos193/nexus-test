/**
 * Mobile Docs Quick Links - Touch-friendly link cards
 */

'use client'

import Link from 'next/link'
import type { QuickLink } from '@/lib/data/docs'
import styles from './MobileDocs.module.css'

interface MobileDocsQuickLinksProps {
  links: QuickLink[]
}

export default function MobileDocsQuickLinks({ links }: MobileDocsQuickLinksProps) {
  return (
    <section className={styles.mobileDocsQuickLinks} aria-labelledby="mobile-docs-quick-links">
      <h2 id="mobile-docs-quick-links" className={styles.mobileDocsQuickLinksTitle}>
        Quick Links
      </h2>
      <div className={styles.mobileDocsQuickLinksList}>
        {links.map((link, index) => {
          const isExternal = Boolean(link.external)
          const LinkComponent = isExternal ? 'a' : Link
          const linkProps = isExternal
            ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: link.href }

          return (
            <LinkComponent
              key={index}
              {...linkProps}
              className={styles.mobileDocsQuickLink}
            >
              <div className={styles.mobileDocsQuickLinkContent}>
                <h3 className={styles.mobileDocsQuickLinkTitle}>{link.title}</h3>
                <p className={styles.mobileDocsQuickLinkDescription}>{link.description}</p>
              </div>
            </LinkComponent>
          )
        })}
      </div>
    </section>
  )
}
