'use client'

/**
 * HeaderSearch - The pill-shaped search bar that lives in the header
 * Desktop: inline pill, dropdown pops below. Mobile: overlay mode, full-width glory.
 * LMNFTs-style vibes: dark bg, live dropdown, highlighted matches. Our accent, our layout.
 *
 * This is where users type "ape" and finally find that one collection they forgot the name of.
 * We debounce, we fetch, we highlight. We try not to rage at the API. Mostly we succeed.
 *
 * @author Juan - Search bar architect and "did you try searching?" evangelist
 * (Coded with hope that autocomplete > endless scrolling. So far, so good.)
 */

// React basics - state, effects, refs, callbacks. The usual suspects.
import { useState, useEffect, useRef, useCallback } from 'react'
// Link - Next.js navigation. We send users to /collections/:id and call it a day.
import Link from 'next/link'
import Image from 'next/image'
// Note: Using regular img tags for SVG API routes (Next.js Image doesn't support API routes)
// Search icon - the magnifying glass. Universally understood. No translation needed.
import { Search } from 'lucide-react'
// cn - classnames utility. Because we conditionally style overlay vs inline. You know the drill.
import { cn } from '@/lib/utils'
// collectionsApi - where we beg the backend for search results. "limit: 12" and we pray.
import { collectionsApi } from '@/lib/api/client'
// NFTCollection - the type. The contract. The source of truth for what a collection looks like.
import { NFTCollection } from '@/types'
// placeholderBannerUrl - when collection images fail, we still show *something*. Graceful degradation, baby.
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
// styles - the CSS module. Pill, popover, overlay, highlight. All the good stuff.
import styles from './HeaderSearch.module.css'

// Thumb size - 56×56. Big enough to recognize, small enough to not dominate. Goldilocks zone.
const THUMB_SIZE = 56

/**
 * SearchThumb - Tiny collection image next to each search result
 * Uses blur placeholder, falls back to generated banner if image 404s.
 * Desktop and mobile both use this; sizes prop handles responsive loading.
 */
function SearchThumb({ collection }: { collection: NFTCollection }) {
  // Fallback = our generated placeholder. When the internet disappoints, we don't.
  const fallback = placeholderBannerUrl(collection.id, collection.name, THUMB_SIZE, THUMB_SIZE)
  // useFallback - flipped on Image onError. "Fine, we'll do it ourselves."
  const [useFallback, setUseFallback] = useState(false)
  const src = useFallback
    ? fallback
    : (collection.imageUrl || fallback)

  return (
    <div className={styles.thumb}>
      {/* Use regular img tag for SVG API routes - Next.js Image doesn't support API routes */}
      <img
        src={src}
        alt=""
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        className={styles.thumbImg}
        loading="lazy"
        onError={() => setUseFallback(true)}
      />
    </div>
  )
}

// Debounce - 280ms. Not too fast (API spam), not too slow (feels laggy). Just right.
const DEBOUNCE_MS = 280
// Min query length - 1 char. We could do 2, but "a" is a valid search. Let them live.
const MIN_QUERY_LENGTH = 1

/**
 * highlightMatch - Wraps matching substrings in <mark>
 * Split capture gives [text, match, text, match, ...]. Even index = plain, odd = highlighted.
 * Escapes regex special chars so ".*" doesn't break everything. We've been burned before.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className={styles.highlight}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export interface HeaderSearchProps {
  /** onResultSelect - Called when user picks a result. Mobile: close the overlay. Desktop: just close dropdown. */
  onResultSelect?: () => void
  /** variant - 'inline' = desktop pill in header. 'overlay' = mobile full-width, popover open by default. Same component, different outfit. */
  variant?: 'inline' | 'overlay'
  /** autoFocus - Focus input on mount. Overlay opens → keyboard ready. Mobile users tap search, we hand them the keys. */
  autoFocus?: boolean
}

/**
 * HeaderSearch - Main component. Serves desktop (inline) and mobile (overlay) from one codebase.
 * One search bar to rule them all. We're not writing this twice. DRY or cry.
 */
export default function HeaderSearch({
  onResultSelect,
  variant = 'inline',
  autoFocus = false,
}: HeaderSearchProps) {
  // query - what the user typed. The source of all our API calls. Handle with care.
  const [query, setQuery] = useState('')
  // open - popover visible? Overlay mode starts true (mobile sheet opens → show results). Inline starts false.
  const [open, setOpen] = useState(variant === 'overlay')
  // results - collections from API. We cap at 12. Don't @ us.
  const [results, setResults] = useState<NFTCollection[]>([])
  // loading - "Searching…" state. Brief but honest. We're trying.
  const [loading, setLoading] = useState(false)
  // containerRef - for click-outside. Desktop: close dropdown when you click away. Overlay: we skip this.
  const containerRef = useRef<HTMLDivElement>(null)
  // inputRef - for autoFocus (mobile overlay) and general input DOM access.
  const inputRef = useRef<HTMLInputElement>(null)
  // searchForRef - races. User types "a" → "ap" → "ape". We only care about "ape". This ref keeps us sane.
  const searchForRef = useRef<string | null>(null)

  /** searchCollections - Hit the API, filter by search param, limit 12.
   * If a newer request finishes first, we ignore stale results. searchForRef is our bouncer. */
  const searchCollections = useCallback(async (q: string) => {
    if (!q || q.length < MIN_QUERY_LENGTH) {
      setResults([])
      return
    }
    searchForRef.current = q
    setLoading(true)
    const res = await collectionsApi.getAll({ search: q, limit: 12 })
    if (searchForRef.current !== q) return
    searchForRef.current = null
    setLoading(false)
    if (res.success && res.data) {
      setResults(res.data)
    } else {
      setResults([])
    }
  }, [])

  // Debounced search: query changes → wait DEBOUNCE_MS → fetch. Empty query → clear results, no fetch.
  useEffect(() => {
    if (!query.trim()) {
      searchForRef.current = null
      setResults([])
      setLoading(false)
      return
    }
    const t = setTimeout(() => searchCollections(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, searchCollections])

  // autoFocus: overlay opens → focus input. Mobile users expect to type immediately. We deliver.
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Click-outside + Escape: desktop only. Overlay doesn't use these; sheet close handles it.
  useEffect(() => {
    if (variant === 'overlay') return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [variant])

  const showPopover = open
  const hasQuery = query.length >= MIN_QUERY_LENGTH

  return (
    // Wrapper: overlay = full-width mobile style. inline = desktop pill in header. Same component, different CSS.
    <div
      ref={containerRef}
      className={variant === 'overlay' ? styles.wrapperOverlay : styles.wrapper}
    >
      {/* Pill - the actual search bar. Combobox, expandable, accessible. Desktop + mobile both use this. */}
      <div
        className={styles.pill}
        role="combobox"
        aria-expanded={showPopover}
        aria-haspopup="listbox"
        aria-label="Search collections"
      >
        <Search className={styles.icon} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search"
          className={styles.input}
          aria-label="Search collections"
          aria-controls="header-search-results"
          aria-autocomplete="list"
        />
      </div>

      {/* Popover - dropdown (desktop) or flowing results (mobile overlay). Same list, different layout. */}
      {showPopover && (
        <div
          id="header-search-results"
          className={cn(
            styles.popover,
            variant === 'overlay' && styles.popoverFlowing
          )}
          role="listbox"
          aria-label="Search results"
        >
          {/* loading → "Searching…". !hasQuery → "Type to search...". No results → "No collections found." Otherwise → list. Desktop + mobile, same UX. */}
          {loading && <div className={styles.status}>Searching…</div>}
          {!loading && !hasQuery && <div className={styles.status}>Type to search collections</div>}
          {!loading && hasQuery && results.length === 0 && <div className={styles.status}>No collections found</div>}
          {!loading && hasQuery && results.length > 0 && (
            <ul className={styles.list}>
              {results.map((c) => (
                <li key={c.id} className={styles.item}>
                  <Link
                    href={`/collections/${c.id}`}
                    className={styles.link}
                    onClick={() => {
                      setOpen(false)
                      onResultSelect?.()
                    }}
                    role="option"
                  >
                    <SearchThumb collection={c} />
                    <span className={styles.name}>
                      {highlightMatch(c.name, query)}
                    </span>
                    <div className={styles.meta}>
                      <div
                        className={styles.progressBar}
                        title={`${((c.minted / (c.totalSupply || 1)) * 100).toFixed(1)}% minted`}
                      >
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${Math.min(100, ((c.minted / (c.totalSupply || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className={styles.chainBadge}>
                        <Image
                          src="/svg/solana-sol-logo.svg"
                          alt="Solana"
                          width={12}
                          height={12}
                          unoptimized
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Coded by Juan - search bar enthusiast and "just type it in the box" advocate
// Desktop: inline pill, click outside to close. Mobile: overlay, autoFocus, popover flowing.
// P.S. - If you can't find it, we tried. The API has limits. We have limits. It's fine.
