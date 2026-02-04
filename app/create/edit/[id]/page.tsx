'use client'

/**
 * Edit Collection Page - Update deployed collection config
 * Loads collection from API, form to update: price, times, freeze, etc.
 * Programs: update_config, update_base_uri, update_mint_fund_splits, update_trading_freeze
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { collectionsApi } from '@/lib/api/client'
import { NFTCollection } from '@/types'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import '@/app/create/create-page.css'

export default function EditCollectionPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  const [collection, setCollection] = useState<NFTCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    collectionsApi
      .getById(id)
      .then((res) => {
        if (res.success && res.data) setCollection(res.data)
        else setError(res.error || 'Failed to load collection')
      })
      .catch((err) => setError(err?.message || 'Network error'))
      .finally(() => setLoading(false))
  }, [id])

  if (!id) {
    return (
      <Layout>
        <div className="nft-create-page">
          <div className="nft-create-container" style={{ padding: '2rem' }}>
            <p>Invalid collection ID</p>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="nft-create-page">
          <div className="nft-create-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#00d4ff' }} />
            <p>Loading collection...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !collection) {
    return (
      <Layout>
        <div className="nft-create-page">
          <div className="nft-create-container" style={{ padding: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>{error || 'Collection not found'}</p>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="nft-create-page">
        <div className="nft-create-container" style={{ padding: '2rem', maxWidth: 640 }}>
          <Link
            href="/dashboard"
            className="nft-create-header"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              textDecoration: 'none',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1
            className="nft-create-hero-title"
            style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}
          >
            Edit: {collection.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Update collection config (price, mint times, freeze settings). Metadata standard cannot
            be changed after deploy.
          </p>
          <Card variant="elevated">
            <CardContent style={{ padding: '1.5rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
                Edit form coming soon. Programs support update_config (price, times, limits, freeze),
                update_base_uri, update_mint_fund_splits, update_allowlist_root.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/drops/${collection.slug ?? collection.id}`}>
                  <Button variant="secondary">View collection</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
