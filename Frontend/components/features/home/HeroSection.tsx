'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { NFTCollection } from '@/types'
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import { avatarUrl } from '@/lib/utils/avatarUrl'
import styles from './HeroSection.module.css'

const CAROUSEL_TRANSITION_MS = 500

interface HeroSectionProps {
  collections?: NFTCollection[]
}

export default function HeroSection({ collections = [] }: HeroSectionProps) {
  const sourceCollections = collections

  const mintingCollections = sourceCollections.filter(c => c.status === 'minting')
  const otherCollections = sourceCollections.filter(c => c.status !== 'minting')

  const displayCollections: NFTCollection[] = [
    ...mintingCollections.slice(0, 5),
    ...otherCollections.slice(0, 5 - mintingCollections.length)
  ].slice(0, 5)

  const n = displayCollections.length

  const useClones = n > 1
  const extendedCollections: NFTCollection[] = useClones
    ? [
        displayCollections[n - 1],
        ...displayCollections,
        displayCollections[0]
      ]
    : displayCollections
  const totalSlides = extendedCollections.length

  const [position, setPosition] = useState(useClones ? 1 : 0)
  const [skipTransition, setSkipTransition] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!useClones && position !== 0) setPosition(0)
  }, [useClones])

  const [isHovered, setIsHovered] = useState(false)

  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const minSwipeDistance = 50

  useEffect(() => {
    if (!useClones || totalSlides < 3 || !trackRef.current) return
    if (position !== 0 && position !== totalSlides - 1) return

    const track = trackRef.current

    const t = setTimeout(() => {
      const newPosition = position === 0 ? n : 1

      track.style.transition = 'none'
      track.style.transform = `translate3d(-${newPosition * 100}%, 0, 0)`

      setSkipTransition(true)
      setPosition(newPosition)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = ''
          setSkipTransition(false)
        })
      })
    }, CAROUSEL_TRANSITION_MS)

    return () => clearTimeout(t)
  }, [useClones, totalSlides, position, n])

  useEffect(() => {
    if (!skipTransition) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSkipTransition(false))
    })
    return () => cancelAnimationFrame(id)
  }, [skipTransition])

  const goToPrevious = useCallback(() => {
    if (!useClones) {
      setPosition((p) => (p === 0 ? n - 1 : p - 1))
      return
    }
    setPosition((p) => (p === 0 ? totalSlides - 1 : p - 1))
  }, [useClones, n, totalSlides])

  const goToNext = useCallback(() => {
    if (!useClones) {
      setPosition((p) => (p === n - 1 ? 0 : p + 1))
      return
    }
    setPosition((p) => (p === totalSlides - 1 ? 0 : p + 1))
  }, [useClones, n, totalSlides])

  useEffect(() => {
    if (n <= 1) return
    const interval = setInterval(() => {
      if (!isHovered) goToNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [n, isHovered, goToNext])

  if (n === 0) return null

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) goToNext()
    if (isRightSwipe) goToPrevious()
  }

  return (
    <div className={styles.heroSectionBackdrop}>
      <section className={styles.heroSection}>
        <div className={styles.carouselWrapper}>
          <div className={styles.borderOverlay}></div>

          <div
            className={styles.carouselContainer}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              ref={trackRef}
              className={`${styles.carouselTrack} ${skipTransition ? styles.carouselTrackNoTransition : ''}`}
              style={{ transform: `translate3d(-${position * 100}%, 0, 0)` }}
            >
              {extendedCollections.map((collection, index) => (
                <div
                  key={
                    useClones && index === 0
                      ? `clone-last-${collection.id}`
                      : useClones && index === totalSlides - 1
                      ? `clone-first-${collection.id}`
                      : collection.id
                  }
                  className={styles.carouselSlide}
                  role="group"
                  aria-roledescription="slide"
                >
                  <Link href={`/drops/${collection.slug ?? collection.id}`} className={styles.slideLink}>
                    <div className={styles.featuredCard}>
                      <div className={styles.bannerContainer}>
                        <div className={styles.bannerImageWrapper}>
                          <img
                            src={placeholderBannerUrl(collection.id, collection.name, 1200, 400)}
                            alt="Featured drop banner"
                            className={styles.bannerImage}
                            fetchPriority="high"
                            loading="eager"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div className={styles.topOverlay}></div>

                        <div className={styles.bottomOverlay}>
                          <div className={styles.bottomContent}>
                            <div className={styles.collectionInfo}>
                              <div className={styles.collectionHeader}>
                                <h1 className={styles.collectionName}>{collection.name}</h1>

                                <div className={styles.creatorInfo}>
                                  <div className={styles.creatorAvatar}>
                                    <img
                                      src={avatarUrl(collection.creator, 16)}
                                      alt="creator avatar"
                                      width={16}
                                      height={16}
                                      className={styles.avatarImage}
                                      loading="lazy"
                                    />
                                  </div>
                                  <span className={styles.creatorName}>{collection.creator}</span>
                                </div>
                              </div>
                            </div>

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

            {n > 1 && (
              <>
                <button
                  className={styles.navButton}
                  onClick={(e) => { e.preventDefault(); goToPrevious() }}
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

                <button
                  className={`${styles.navButton} ${styles.navButtonRight}`}
                  onClick={(e) => { e.preventDefault(); goToNext() }}
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
