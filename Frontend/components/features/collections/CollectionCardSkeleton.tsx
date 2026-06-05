/**
 * CollectionCardSkeleton – The ghost of a collection card that hasn't loaded yet.
 * Shimmer blocks where the image should be. Gray bars where the name will be.
 * An empty progress bar counting down to nothing in particular.
 *
 * This is what hope looks like before the API responds.
 * (Technically it's just CSS animations on divs, but hope is a strong word and we need it.)
 *
 * If you remove this, users stare at a blank grid while data loads.
 * We tried that once. Nobody liked it. The skeleton stays.
 *
 * @author Juan – The developer who built a skeleton and called it progress
 * (Coded with care, symmetry, and the understanding that loading states are UX too)
 */

// CSS module — the scoped styles that make the skeleton look deliberate, not broken
import styles from './CollectionCardSkeleton.module.css'

/**
 * CollectionCardSkeleton — No props. No data. No soul.
 * Just a placeholder that looks roughly like a CollectionCard until the real thing arrives.
 * (Like a stand-in actor. Same shape, fewer opinions.)
 */
export default function CollectionCardSkeleton() {
  return (
    // Same <article> tag as CollectionCard — consistent DOM structure so the grid doesn't jump
    <article className={styles.card}>

      {/* ── Banner Skeleton ────────────────────────────────────────────────────
          Where the collection image will eventually live.
          For now: a shimmering void with great bone structure. */}
      <div className={styles.banner} />

      {/* ── Content Skeleton ───────────────────────────────────────────────────
          Everything below the image — name, creator, stats, progress.
          All fake. All shimmering. All doing their best. */}
      <div className={styles.content}>

        {/* Header skeleton — where the collection name and creator info will appear
            Two gray bars, standing in for actual identity. Deep. */}
        <div className={styles.header}>
          {/* Collection name bar — wide enough to look like a real title */}
          <div className={styles.collectionName} />

          {/* Creator row — avatar circle + text bar, mimicking the real creator chip */}
          <div className={styles.creator}>
            <div className={styles.avatar} />
            <div className={styles.creatorText} />
          </div>
        </div>

        {/* Stats skeleton — two columns of label + value pairs, both completely fictional */}
        <div className={styles.stats}>
          {/* Price stat placeholder — neither free nor paid. It simply... is. */}
          <div className={styles.stat}>
            <div className={styles.statLabel} />
            <div className={styles.statValue} />
          </div>
          {/* Supply stat placeholder — 0 / 0 in spirit */}
          <div className={styles.stat}>
            <div className={styles.statLabel} />
            <div className={styles.statValue} />
          </div>
        </div>

        {/* Progress skeleton — a bar that represents 0% of absolutely nothing minted
            (The most honest progress bar in this entire codebase.) */}
        <div className={styles.progress}>
          <div className={styles.progressBar} />
        </div>

      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because skeletons deserve as much attention as the real thing.
// (The loading state is the first render. It matters. Fight me.)
// ─────────────────────────────────────────────────────────────────────────────
