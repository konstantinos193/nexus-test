'use client'

/**
 * Discover Section Component - The Curated Discovery Zone
 * Minimal curated picks below Hot Collections (because we're not trying to overwhelm users)
 * Tabs + small grid (max 6) + "Browse all" — no endless scroll
 * Because endless scroll is like a black hole - once you start, you never escape
 * (And we're not trying to trap users, we're trying to help them discover things)
 * 
 * This is where users can discover new collections based on different criteria
 * Because discovery is important (and manually searching is too much work)
 * It's like a Netflix recommendation engine, but for NFTs
 * (And hopefully it's better than Netflix's recommendations, which are questionable at best)
 * 
 * Features:
 * - Tab navigation (Trending, New, Ending Soon, Free Mint)
 *   Because different users want different things (and we're accommodating like that)
 * - Small grid layout (max 6 items) - enough to show variety, not enough to overwhelm
 *   Because decision paralysis is real, and we're not trying to torture users
 * - "Browse all" link - for when 6 items isn't enough (which is probably always)
 *   Because sometimes you need more, and we're not going to stop you
 * - No endless scroll - because endless scroll is the enemy of productivity
 *   (And we're not trying to make users lose hours of their life, just minutes)
 * 
 * @author Juan - The developer who built this discovery masterpiece
 * (Coded with care, humor, and probably too much coffee)
 * P.S. - Discover something new, or don't. We're not your boss. 🔍
 */

import { useState } from 'react'
import Link from 'next/link'
import { NFTCollection } from '@/types'
import { CollectionCard } from '../collections/CollectionCard'
import { useDiscoverCollections } from '@/hooks/useCollections'
import styles from './DiscoverSection.module.css'

// Discover tab types - the different ways users can discover collections
// Because one size doesn't fit all (and neither does one discovery method)
type DiscoverTab = 'trending' | 'new' | 'ending_soon' | 'free_mint'

// Tab configuration - the tabs users can click to discover different collections
// Because tabs are like doors - each one leads to a different room
// (And we're giving users 4 doors, because 1 door is boring)
const TABS: { id: DiscoverTab; label: string }[] = [
  { id: 'trending', label: 'Trending' }, // The popular stuff (because popularity matters)
  { id: 'new', label: 'New' }, // The fresh stuff (because new is exciting)
  { id: 'ending_soon', label: 'Ending Soon' }, // The urgent stuff (because FOMO is real)
  { id: 'free_mint', label: 'Free Mint' }, // The free stuff (because free is always good)
]

// Maximum number of collections to display
// Because 6 is a nice number (and 10 would be too many, 3 would be too few)
// It's like Goldilocks - not too many, not too few, just right
const MAX_DISPLAY = 6

/**
 * Discover Section Component - The main discovery component
 * This is what gets rendered on the homepage below Hot Collections
 * It's simple, clean, and helps users discover new collections
 * Because discovery is important (and manually searching is too much work)
 */
export default function DiscoverSection() {
  // Active tab state - tracks which tab is currently selected
  // Because users need to know where they are (and we need to know what to show them)
  // Defaults to 'trending' because trending is usually what people want to see
  // (And if they don't want to see trending, they can click another tab)
  const [activeTab, setActiveTab] = useState<DiscoverTab>('trending')

  // Fetch collections from backend based on active tab
  // Because different tabs show different collections (obviously)
  // And we're fetching from the backend because that's where the data lives
  // (And the backend is like a database, except it's a server, and servers are cool)
  const { data: collections = [], isLoading } = useDiscoverCollections(activeTab)

  // Display up to MAX_DISPLAY collections
  // Because we don't want to show everything (that would be overwhelming)
  // And 6 is a nice number (not too many, not too few, just right)
  // It's like a sampler platter - enough to taste, not enough to get full
  const display = collections.slice(0, MAX_DISPLAY)

  return (
    // Main section - the container for all discovery content
    // Because every section needs a container (and containers are like boxes, but for content)
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header section - title and tabs
            Because headers are important (and without them, users wouldn't know what this is)
            It's like a sign on a door - tells you what's inside */}
        <div className={styles.header}>
          {/* Section title - "Discover" because that's what this section is about
              Because titles are important (and "Untitled Section" is not a good title) */}
          <h3 className={styles.title}>Discover</h3>
          
          {/* Tab navigation - the different ways to discover collections
              Because tabs are like doors - each one leads to a different room
              And we're giving users 4 doors, because 1 door is boring
              role="tablist" for accessibility (because keyboard users matter too) */}
          <div className={styles.tabs} role="tablist">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Grid section - displays the collections
            Because grids are like tables, except they're for displaying cards
            And cards are like business cards, except they're for collections
            role="tabpanel" for accessibility (because screen readers matter) */}
        <div className={styles.grid} role="tabpanel">
          {/* Empty state - when there are no collections to show
              Because empty grids are sadder than a birthday party with no guests
              And we're not going to leave users hanging (we're nice like that) */}
          {display.length === 0 ? (
            <p className={styles.empty}>
              No collections in this category yet. Check back soon!
            </p>
          ) : (
            // Collection cards - the actual collections being displayed
            // Because cards are like business cards, except they're for collections
            // And we're showing up to 6 of them, because 6 is a nice number
            display.map((collection: NFTCollection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))
          )}
        </div>
        
        {/* Footer section - "Browse all" link
            Because sometimes 6 items isn't enough (which is probably always)
            And we're not going to stop users from seeing more (we're accommodating like that)
            It's like a "see more" button, except it's a link, and links are cooler */}
        <div className={styles.footer}>
          <Link href="/collections" className={styles.browseAll}>
            Browse all collections
            {/* Arrow icon - points to the right because that's where the link goes
                Because arrows are like GPS directions - they tell you where to go
                aria-hidden="true" because it's decorative (and screen readers don't need it) */}
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Discover something new, or don't. We're not your boss. 🔍
