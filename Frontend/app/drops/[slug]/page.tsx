'use client'

/**
 * Drop Detail Page – /drops/[slug]
 * Fetches collection by slug (or UUID) and renders the same detail view as /collections.
 * Because humans deserve readable URLs, not UUIDs that look like someone forgot their password.
 */

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import CollectionHero from '@/components/features/collections/collection-detail/CollectionHero'
import MintInteractionModule from '@/components/features/collections/collection-detail/MintInteractionModule'
import CollectionStatsBar from '@/components/features/collections/collection-detail/CollectionStatsBar'
import AboutSection from '@/components/features/collections/collection-detail/AboutSection'
import UtilityRoadmapSection from '@/components/features/collections/collection-detail/UtilityRoadmapSection'
import TraitsSection from '@/components/features/collections/collection-detail/TraitsSection'
import NFTGalleryGrid from '@/components/features/collections/collection-detail/NFTGalleryGrid'
import ActivityFeed from '@/components/features/collections/collection-detail/ActivityFeed'
import CollectionPageFooter from '@/components/features/collections/collection-detail/CollectionPageFooter'
import type { CollectionDetail, NFTCollection } from '@/types'

import '@/app/collections/collection-page.css'

/** Map API response to CollectionDetail; extra fields (utility, roadmap, etc.) are optional. */
function toCollectionDetail(c: NFTCollection): CollectionDetail {
  return {
    ...c,
    slug: c.slug,
  }
}

export default function DropPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string | undefined
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError('Missing slug')
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/collections/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Collection not found')
          throw new Error(res.statusText || 'Failed to load collection')
        }
        return res.json()
      })
      .then((data: { success: boolean; data?: NFTCollection }) => {
        if (!data.success || !data.data) throw new Error('Invalid response')
        setCollection(toCollectionDetail(data.data))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false))
  }, [slug])

  const isWalletConnected = false
  const handleMint = () => {
    /* TODO: connect wallet + mint */
  }
  const handleMintQty = (_qty: number) => {
    /* TODO: mint qty */
  }

  if (loading) {
    return (
      <Layout>
        <div className="cp-page flex min-h-[50vh] items-center justify-center">
          <p className="text-dark-fg-muted">Loading drop…</p>
        </div>
      </Layout>
    )
  }

  if (error || !collection) {
    return (
      <Layout>
        <div className="cp-page flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <p className="text-red-400">{error ?? 'Collection not found'}</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded bg-dark-accent px-4 py-2 text-dark-fg hover:opacity-90"
          >
            Back to home
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="cp-page">
        <CollectionHero
          collection={collection}
          isWalletConnected={isWalletConnected}
          onMint={handleMint}
        />
        <MintInteractionModule
          collection={collection}
          maxPerTx={10}
          isWalletConnected={isWalletConnected}
          onMint={handleMintQty}
        />
        <CollectionStatsBar collection={collection} />
        <AboutSection collection={collection} />
        <UtilityRoadmapSection collection={collection} />
        <TraitsSection collection={collection} />
        <NFTGalleryGrid collection={collection} />
        <ActivityFeed collection={collection} />
        <CollectionPageFooter collection={collection} />
      </div>
    </Layout>
  )
}
