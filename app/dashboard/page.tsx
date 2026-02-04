/**
 * Dashboard Page - Creator's command center
 * Manage collections, resume drafts, edit mid-way
 * Fetches by creatorAddress when wallet connected
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CollectionGrid from '@/components/features/collections/CollectionGrid'
import ContinueDraftCard from '@/components/features/collections/ContinueDraftCard'
import { collectionsApi } from '@/lib/api/client'
import { NFTCollection } from '@/types'
import { DRAFT_STORAGE_KEY, CreateDraftPayload } from '@/components/features/create/create-types'
import { Plus, TrendingUp, Users, Image as ImageIcon, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { connected, publicKey } = useWallet()
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<CreateDraftPayload | null>(null)

  const creatorAddress = publicKey?.toBase58() ?? null

  const fetchCollections = useCallback(async () => {
    if (!creatorAddress) return
    setLoading(true)
    const res = await collectionsApi.getAll({ creator: creatorAddress, limit: 50 })
    setLoading(false)
    if (res.success && res.data) setCollections(res.data)
  }, [creatorAddress])

  useEffect(() => {
    if (creatorAddress) fetchCollections()
    else setCollections([])
  }, [creatorAddress, fetchCollections])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      const d = raw ? (JSON.parse(raw) as CreateDraftPayload) : null
      setDraft(d && (d.collectionName || d.step) ? d : null)
    } catch {
      setDraft(null)
    }
  }, [])

  const totalCollections = collections.length
  const totalMinted = collections.reduce((sum, c) => sum + c.minted, 0)
  const totalSupply = collections.reduce((sum, c) => sum + c.totalSupply, 0)
  const activeCollections = collections.filter((c) => c.status === 'minting').length

  if (!connected) {
    return (
      <Layout>
        <div className="nft-dashboard-page">
          <div className="nft-dashboard-container">
            <header className="nft-dashboard-header">
              <div>
                <h1>Dashboard</h1>
                <p className="nft-dashboard-header-subtitle">
                  Connect your wallet to manage your collections
                </p>
              </div>
              <Link href="/create">
                <Button variant="primary" className="nft-dashboard-cta">
                  <Plus className="w-5 h-5" />
                  <span>Create Collection</span>
                </Button>
              </Link>
            </header>
            <Card variant="elevated">
              <CardContent className="nft-dashboard-empty-state">
                <Wallet
                  style={{
                    width: '4rem',
                    height: '4rem',
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 auto 1rem',
                    display: 'block',
                  }}
                />
                <h3>Connect Wallet</h3>
                <p>
                  Connect your Solana wallet to view and edit your collections
                </p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Use the connect button in the header to get started.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="nft-dashboard-page">
        <div className="nft-dashboard-container">
          <header className="nft-dashboard-header">
            <div>
              <h1>Dashboard</h1>
              <p className="nft-dashboard-header-subtitle">
                Manage your collections and track your NFT journey
              </p>
            </div>
            <Link href="/create">
              <Button variant="primary" className="nft-dashboard-cta">
                <Plus className="w-5 h-5" />
                <span>Create Collection</span>
              </Button>
            </Link>
          </header>

          <div className="nft-dashboard-stats">
            <Card variant="elevated" className="nft-dashboard-stat-card">
              <CardContent>
                <div className="nft-dashboard-stat-card-inner">
                  <div>
                    <p className="nft-dashboard-stat-label">Total Collections</p>
                    <p className="nft-dashboard-stat-value">{totalCollections}</p>
                  </div>
                  <div className="nft-dashboard-stat-icon-wrap icon-accent-primary">
                    <ImageIcon />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" className="nft-dashboard-stat-card">
              <CardContent>
                <div className="nft-dashboard-stat-card-inner">
                  <div>
                    <p className="nft-dashboard-stat-label">Total Minted</p>
                    <p className="nft-dashboard-stat-value">{totalMinted}</p>
                  </div>
                  <div className="nft-dashboard-stat-icon-wrap icon-accent-success">
                    <TrendingUp />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" className="nft-dashboard-stat-card">
              <CardContent>
                <div className="nft-dashboard-stat-card-inner">
                  <div>
                    <p className="nft-dashboard-stat-label">Total Supply</p>
                    <p className="nft-dashboard-stat-value">{totalSupply}</p>
                  </div>
                  <div className="nft-dashboard-stat-icon-wrap icon-accent-secondary">
                    <Users />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" className="nft-dashboard-stat-card">
              <CardContent>
                <div className="nft-dashboard-stat-card-inner">
                  <div>
                    <p className="nft-dashboard-stat-label">Active</p>
                    <p className="nft-dashboard-stat-value">{activeCollections}</p>
                  </div>
                  <div className="nft-dashboard-stat-icon-wrap icon-accent-warning">
                    <TrendingUp />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <section className="nft-dashboard-collections-section">
            <div className="nft-dashboard-collections-header">
              <h2 className="nft-dashboard-collections-title">Your Collections</h2>
              {(collections.length === 0 && !draft) && (
                <Link href="/create">
                  <Button variant="outline" size="sm">
                    Create Your First Collection
                  </Button>
                </Link>
              )}
            </div>

            {draft && (
              <div className="nft-dashboard-draft-wrap">
                <ContinueDraftCard
                  draftName={draft.collectionName || undefined}
                  step={draft.step ?? 1}
                />
              </div>
            )}

            {collections.length > 0 ? (
              <CollectionGrid collections={collections} loading={loading} mode="dashboard" />
            ) : !draft ? (
              <Card variant="elevated">
                <CardContent className="nft-dashboard-empty-state">
                  <ImageIcon />
                  <h3>No Collections Yet</h3>
                  <p>Start your NFT journey by creating your first collection</p>
                  <Link href="/create">
                    <Button variant="primary">Create Collection</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card variant="elevated">
                <CardContent className="nft-dashboard-empty-state">
                  <ImageIcon />
                  <h3>No deployed collections</h3>
                  <p>Complete your draft above to deploy, or start a new collection</p>
                  <Link href="/create">
                    <Button variant="primary">Create Collection</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}
