/**
 * Dashboard Page - The creator's command center
 * This is where creators manage their collections and see their stats
 * Because everyone needs a dashboard (even if they don't know what to do with it)
 * (Stats, grids, "Create Collection" — it's all here. Command center energy.)
 *
 * @author Juan - The developer who built this creator HQ
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { useState } from 'react'
// Card, CardHeader, CardTitle, CardContent - the boxes we put stats and collections in
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
// Button - for "Create Collection" and such. Clickable. Fancy.
import Button from '@/components/ui/Button'
// CollectionGrid - displays creator's collections. The main attraction.
import CollectionGrid from '@/components/features/collections/CollectionGrid'
// NFTCollection - the type. We're TypeScript people. We type things.
import { NFTCollection } from '@/types'
// Plus, TrendingUp, Users, Image - icons for stats and CTAs. Lucide knows what's up.
import { Plus, TrendingUp, Users, Image as ImageIcon } from 'lucide-react'
// Link - Next.js routing. "Create Collection" goes places. We send 'em there.
import Link from 'next/link'

// Mock user collections - Because we don't have real data yet
const mockUserCollections: NFTCollection[] = [
  {
    id: '1',
    name: 'My First Collection',
    description: 'The collection that started it all',
    imageUrl: '/NeXus_Web3_Logo.png',
    creator: 'You',
    creatorAddress: '0xYourAddressHere',
    blockchain: 'solana',
    totalSupply: 1000,
    minted: 342,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function DashboardPage() {
  const [collections] = useState<NFTCollection[]>(mockUserCollections)

  // Calculate stats - Because numbers are fun
  const totalCollections = collections.length
  const totalMinted = collections.reduce((sum, c) => sum + c.minted, 0)
  const totalSupply = collections.reduce((sum, c) => sum + c.totalSupply, 0)
  const activeCollections = collections.filter((c) => c.status === 'minting').length

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header - Because every page needs a title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-dark-text-primary mb-2">
              Dashboard
            </h1>
            <p className="text-dark-text-secondary">
              Manage your collections and track your NFT journey
            </p>
          </div>
          <Link href="/create">
            <Button variant="primary" className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Create Collection</span>
            </Button>
          </Link>
        </div>

        {/* Stats cards - Because we need to show off numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1">Total Collections</p>
                  <p className="text-3xl font-bold text-dark-text-primary">{totalCollections}</p>
                </div>
                <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                  <ImageIcon className="w-6 h-6 text-dark-accent-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1">Total Minted</p>
                  <p className="text-3xl font-bold text-dark-text-primary">{totalMinted}</p>
                </div>
                <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                  <TrendingUp className="w-6 h-6 text-dark-accent-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1">Total Supply</p>
                  <p className="text-3xl font-bold text-dark-text-primary">{totalSupply}</p>
                </div>
                <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                  <Users className="w-6 h-6 text-dark-accent-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1">Active</p>
                  <p className="text-3xl font-bold text-dark-text-primary">{activeCollections}</p>
                </div>
                <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                  <TrendingUp className="w-6 h-6 text-dark-accent-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Collections section - Where the actual collections live */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark-text-primary">Your Collections</h2>
            {collections.length === 0 && (
              <Link href="/create">
                <Button variant="outline" size="sm">
                  Create Your First Collection
                </Button>
              </Link>
            )}
          </div>

          {collections.length > 0 ? (
            <CollectionGrid collections={collections} />
          ) : (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <ImageIcon className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
                  No Collections Yet
                </h3>
                <p className="text-dark-text-secondary mb-6">
                  Start your NFT journey by creating your first collection
                </p>
                <Link href="/create">
                  <Button variant="primary">Create Collection</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

// Coded by Juan - dashboard architect and "numbers are fun" truther
// (Even if they don't know what to do with it, they've got a dashboard. We tried.)
// P.S. - Manage those collections. Track those stats. You've got this. 📊

