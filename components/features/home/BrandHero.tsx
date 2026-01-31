/**
 * Brand Hero Component - The 3:1 Banner
 * Full-width brand banner with image as CSS background
 * Works perfectly on both mobile and desktop with responsive aspect ratio
 */

'use client'

import styles from './BrandHero.module.css'

export default function BrandHero() {
  return (
    <section
      className={styles.brandHero}
      role="img"
      aria-label="NeXus WEB3 Launchpad by Martech Networks"
    >
      {/* Image is applied as CSS background on .brandHero */}
    </section>
  )
}
