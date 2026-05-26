'use client'

import Image from 'next/image'
import styles from './BrandShowcase.module.css'

export default function BrandShowcase() {
  return (
    <section className={styles.brandShowcase} aria-label="NeXus Logo Showcase">
      <div className={styles.logoWrapper}>
        <Image
          src="/1.5_1logo.png"
          alt="NeXus Logo"
          fill
          className={styles.logoImage}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw"
          style={{
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
      </div>
    </section>
  )
}
