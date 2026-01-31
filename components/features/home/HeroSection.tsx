'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { NFTCollection } from '@/types'
import { featuredCollections } from '@/lib/data/collections'
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import { avatarUrl } from '@/lib/utils/avatarUrl'
import styles from './HeroSection.module.css'

/** Match .carouselTrack transition in CSS - used for clone jump timeout */
const CAROUSEL_TRANSITION_MS = 500

/**
 * Hero Section Component - Featured Drops Carousel
 * The big kahuna that greets visitors when they land on the page
 * This is the first thing they see, so it better be impressive
 * Because if this doesn't hook them, nothing will (and we'll have to resort to clickbait)
 * 
 * Features:
 * - Auto-playing carousel (because users are lazy and won't click)
 * - Hover to pause (because we're not monsters)
 * - Smooth transitions (because janky animations are for peasants)
 * - Navigation arrows that appear on hover (because mystery is fun)
 * - Standalone CSS module (because global styles are for the weak)
 * 
 * @author Juan - The developer who built this carousel
 * (Coded with care, humor, and probably too much coffee)
 */
interface HeroSectionProps {
  collections?: NFTCollection[]
}

export default function HeroSection({ collections = [] }: HeroSectionProps) {
  // Use provided collections
  const sourceCollections = collections
  
  // Get featured collections - prioritize the ones that are actually minting
  // Because showing completed collections in the hero is like advertising a sold-out concert
  const mintingCollections = sourceCollections.filter(c => c.status === 'minting')
  const otherCollections = sourceCollections.filter(c => c.status !== 'minting')
  
  // Take up to 5 collections - enough to show variety, not enough to overwhelm
  // Because decision paralysis is real and we're not trying to torture users
  const displayCollections: NFTCollection[] = [
    ...mintingCollections.slice(0, 5),
    ...otherCollections.slice(0, 5 - mintingCollections.length)
  ].slice(0, 5)

  const n = displayCollections.length

  // Infinite loop: we use clones. Track is [clone(last), ...real, clone(first)].
  // Position 0 = clone of last, 1..n = real 0..n-1, n+1 = clone of first.
  // We animate to the clone when wrapping, then instantly jump back to the real slide
  // so it looks like a smooth loop instead of flying backwards through 5 slides.
  const useClones = n > 1
  const extendedCollections: NFTCollection[] = useClones
    ? [
        displayCollections[n - 1],
        ...displayCollections,
        displayCollections[0]
      ]
    : displayCollections
  const totalSlides = extendedCollections.length

  // Position in extended track. Start at 1 (first real) when using clones, else 0.
  const [position, setPosition] = useState(useClones ? 1 : 0)
  // When true, we disable transition for the instant "jump back" from clone to real.
  const [skipTransition, setSkipTransition] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Keep position in sync if we switch from multi to single slide (edge case).
  useEffect(() => {
    if (!useClones && position !== 0) setPosition(0)
  }, [useClones])

  // Track if user is hovering - so we can pause the auto-play
  const [isHovered, setIsHovered] = useState(false)

  // Touch/swipe handling for mobile
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const minSwipeDistance = 50

  // After animating to a clone, jump back to the real slide without transition.
  // This creates the illusion of infinite scrolling - we animate to the clone,
  // then instantly (but invisibly) jump back to the real slide, so it loops forever
  // The magic trick: user sees smooth infinite loop, but we're actually jumping back invisibly
  // We use direct DOM manipulation to ensure the jump is truly instant and invisible
  useEffect(() => {
    if (!useClones || totalSlides < 3 || !trackRef.current) return
    // Only jump when we're at a clone (position 0 = clone of last, totalSlides-1 = clone of first)
    if (position !== 0 && position !== totalSlides - 1) return
    
    const track = trackRef.current
    
    // Wait for the transition to complete, then jump back invisibly
    const t = setTimeout(() => {
      // Directly manipulate the DOM to make the jump truly instant
      // This bypasses React's render cycle to avoid any visible transition
      const newPosition = position === 0 ? n : 1
      
      // Disable transition on the element directly
      track.style.transition = 'none'
      
      // Jump to the new position immediately
      track.style.transform = `translate3d(-${newPosition * 100}%, 0, 0)`
      
      // Update React state to keep it in sync (but this won't cause a visible change)
      setSkipTransition(true)
      setPosition(newPosition)
      
      // Re-enable transition after a frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = ''
          setSkipTransition(false)
        })
      })
    }, CAROUSEL_TRANSITION_MS)
    
    return () => clearTimeout(t)
  }, [useClones, totalSlides, position, n])

  // Re-enable transition after we've painted the instant jump.
  useEffect(() => {
    if (!skipTransition) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSkipTransition(false))
    })
    return () => cancelAnimationFrame(id)
  }, [skipTransition])

  // Navigate previous: wrap to clone of last when on first real, then jump to real last.
  // The magic of infinite loops: we can go to position 0 (clone of last) even from position 1
  // Then the useEffect will smoothly jump us back to the real last slide
  const goToPrevious = useCallback(() => {
    if (!useClones) {
      setPosition((p) => (p === 0 ? n - 1 : p - 1))
      return
    }
    // Allow going to clone of last (position 0) from first real (position 1)
    setPosition((p) => (p === 0 ? totalSlides - 1 : p - 1))
  }, [useClones, n, totalSlides])

  // Navigate next: wrap to clone of first when on last real, then jump to real first.
  // The infinite loop magic: we can go to the clone of first (position totalSlides - 1)
  // Then the useEffect will smoothly jump us back to the real first slide
  const goToNext = useCallback(() => {
    if (!useClones) {
      setPosition((p) => (p === n - 1 ? 0 : p + 1))
      return
    }
    // Allow going to clone of first (position totalSlides - 1) from last real (position n)
    setPosition((p) => (p === totalSlides - 1 ? 0 : p + 1))
  }, [useClones, n, totalSlides])

  // Auto-play carousel
  useEffect(() => {
    if (n <= 1) return
    const interval = setInterval(() => {
      if (!isHovered) goToNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [n, isHovered, goToNext])

  // If we have no collections to show, don't render anything
  if (n === 0) return null

  // Handle touch start - record where the user started swiping
  // Mobile infinite loop support: touch handlers use the same goToNext/goToPrevious
  // functions that support infinite looping, so mobile swiping works seamlessly
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0) // Reset touch end
    setTouchStart(e.targetTouches[0].clientX)
  }

  // Handle touch move - update the touch end position as user moves
  // Track horizontal movement for swipe detection (vertical scrolling is allowed)
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  // Handle touch end - determine if it was a swipe and in which direction
  // Mobile infinite loop: uses goToNext/goToPrevious which support infinite looping
  // So swiping left/right on mobile will loop smoothly just like desktop
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext() // This supports infinite looping on mobile too
    }
    if (isRightSwipe) {
      goToPrevious() // This supports infinite looping on mobile too
    }
  }

  return (
    <div className={styles.heroSectionBackdrop}>
      <section className={styles.heroSection}>
        <div className={styles.carouselWrapper}>
          {/* Border overlay - because every good carousel needs a border
              This is purely decorative, like a fancy frame on a painting
              (Except this frame doesn't cost $500) */}
          <div className={styles.borderOverlay}></div>
          
          {/* Carousel container - the heart of the operation
              This is where the magic happens (or at least the sliding) */}
          <div 
            className={styles.carouselContainer}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Carousel track - the container that holds all slides
                Uses transform for smooth sliding (because position: absolute is so 2010)
                With clones for infinite loop: we animate to clone then jump back
                so it doesn't yeet backwards through 5 slides like a time machine gone wrong */}
            <div 
              ref={trackRef}
              className={`${styles.carouselTrack} ${skipTransition ? styles.carouselTrackNoTransition : ''}`}
              style={{ transform: `translate3d(-${position * 100}%, 0, 0)` }}
            >
              {/* Map through extended list (includes clones when looping)
                  Each collection gets its moment in the spotlight */}
              {extendedCollections.map((collection, index) => (
                <div
                  key={useClones && index === 0 ? `clone-last-${collection.id}` : useClones && index === totalSlides - 1 ? `clone-first-${collection.id}` : collection.id}
                  className={styles.carouselSlide}
                  role="group"
                  aria-roledescription="slide"
                >
                  {/* Link wrapper - makes the entire card clickable
                      Because clicking should be easy, not a precision sport */}
                  <Link href={`/drops/${collection.slug ?? collection.id}`} className={styles.slideLink}>
                    <div className={styles.featuredCard}>
                      {/* Banner Image Container - where the visual magic happens
                          This is what draws users in (or repels them, depending on the art) */}
                      <div className={styles.bannerContainer}>
                        <div className={styles.bannerImageWrapper}>
                          <img
                            src={collection.bannerUrl || collection.imageUrl || placeholderBannerUrl(collection.id, collection.name, 1200, 400)}
                            alt="Featured drop banner"
                            className={styles.bannerImage}
                            fetchPriority="high"
                            loading="eager"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        {/* Top overlay - currently empty (Solana badge was removed)
                            Left here in case we want to add something later
                            Like a time capsule, but for code */}
                        <div className={styles.topOverlay}>
                        </div>

                        {/* Bottom overlay - where we show the collection info
                            This is the text overlay that makes the banner readable
                            Because reading text over a busy image is like trying to read a book in a hurricane */}
                        <div className={styles.bottomOverlay}>
                          <div className={styles.bottomContent}>
                            {/* Collection Info - the actual content users care about
                                Name, creator, all that good stuff
                                Because pretty pictures are nice, but context is king */}
                            <div className={styles.collectionInfo}>
                              <div className={styles.collectionHeader}>
                                {/* Collection Name - the big, bold title
                                    This is what users see first (after the image)
                                    So it better be good */}
                                <h1 className={styles.collectionName}>{collection.name}</h1>
                                
                                {/* Creator Info - who made this masterpiece
                                    Shows avatar, "by", and creator name
                                    Because credit where credit is due (and we're not thieves) */}
                                <div className={styles.creatorInfo}>
                                  <div className={styles.creatorAvatar}>
                                    {/* Use regular img tag for SVG API routes */}
                                    <img
                                      src={avatarUrl(collection.creator, 16)}
                                      alt="creator avatar"
                                      width={16}
                                      height={16}
                                      className={styles.avatarImage}
                                      loading="lazy"
                                    />
                                  </div>
                                  <span className={styles.creatorLabel}>by</span>
                                  <span className={styles.creatorName}>{collection.creator}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Desktop Live Badge - shows "Live" status for minting collections
                                Only visible on desktop (mobile shows it in top overlay)
                                Because screen real estate is precious and we're not wasteful
                                The pulsing dot is there to catch your eye
                                (Like a notification badge, but less annoying) */}
                            {collection.status === 'minting' && (
                              <div className={styles.desktopLiveBadge}>
                                <div className={styles.liveDotContainer}>
                                  <div className={styles.liveDot}></div>
                                  <div className={styles.liveDotPing}></div>
                                </div>
                                <div>Live</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Navigation Buttons - appear on hover (because mystery is fun)
                Only show if we have more than one slide
                Because a "next" button with nowhere to go is like a door to nowhere */}
            {n > 1 && (
              <>
                {/* Previous Button - go back in time (or at least to the previous slide)
                    Positioned on the left, slides in on hover
                    Because subtlety is key (unlike my ex's hints) */}
                <button
                  className={styles.navButton}
                  onClick={(e) => {
                    e.preventDefault()
                    goToPrevious()
                  }}
                  aria-label="Previous slide"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={styles.navIcon}
                    aria-hidden="true"
                  >
                    <path d="m12 19-7-7 7-7"></path>
                    <path d="M19 12H5"></path>
                  </svg>
                  <span className={styles.srOnly}>Previous slide</span>
                </button>
                
                {/* Next Button - move forward into the future (or just the next slide)
                    Positioned on the right, slides in on hover
                    Because symmetry is pleasing (unlike my life) */}
                <button
                  className={`${styles.navButton} ${styles.navButtonRight}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goToNext()
                  }}
                  aria-label="Next slide"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={styles.navIcon}
                    aria-hidden="true"
                  >
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                  <span className={styles.srOnly}>Next slide</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - If you're reading this, you've made it to the end. Congrats.
