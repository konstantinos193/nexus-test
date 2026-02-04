'use client'

/**
 * Solana NFT Rarity Tool
 * Enter a collection mint (DAS-compatible RPC) or paste mint addresses,
 * then load on-chain metadata and see trait rarities (count, %, rarity score).
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Layout from '@/components/layout/Layout'
import { ArrowLeft, BarChart3, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { getRpcUrl } from '@/lib/solana/rpc-url'
import '../tools-page.css'
import './nft-rarity-tool.css'

const DAS_PAGE_SIZE = 1000

interface DASAsset {
  id: string
  content?: {
    json_uri?: string
    metadata?: {
      name?: string
      symbol?: string
      attributes?: Array<{ trait_type?: string; value?: string | number }>
    }
  }
}

interface TraitValueStats {
  count: number
  pct: number
  /** Rarity score: total / count (higher = rarer) */
  rarityScore: number
}

interface RarityResult {
  collectionName: string
  totalNfts: number
  byTrait: Record<string, Record<string, TraitValueStats>>
  traitOrder: string[]
}

function normalizeTraitValue(v: string | number): string {
  if (typeof v === 'number') return String(v)
  return String(v ?? '').trim() || '—'
}

function normalizeTraitType(t: string | undefined): string {
  return String(t ?? 'Unknown').trim() || 'Unknown'
}

/** Fetch attributes for one asset: from DAS content.metadata or by fetching json_uri */
async function getAttributesForAsset(asset: DASAsset): Promise<Array<{ trait_type: string; value: string }>> {
  const meta = asset.content?.metadata
  if (meta?.attributes && Array.isArray(meta.attributes)) {
    return meta.attributes
      .map((a) => ({
        trait_type: normalizeTraitType(a.trait_type),
        value: normalizeTraitValue(a.value ?? ''),
      }))
      .filter((a) => a.value && a.trait_type !== 'Unknown')
  }
  const uri = asset.content?.json_uri
  if (!uri) return []
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return []
    const json = (await res.json()) as { attributes?: Array<{ trait_type?: string; value?: string | number }> }
    const attrs = json?.attributes
    if (!Array.isArray(attrs)) return []
    return attrs
      .map((a) => ({
        trait_type: normalizeTraitType(a.trait_type),
        value: normalizeTraitValue(a.value ?? ''),
      }))
      .filter((a) => a.value && a.trait_type !== 'Unknown')
  } catch {
    return []
  }
}

/** DAS getAssetsByGroup with pagination */
async function fetchAssetsByGroup(rpcUrl: string, collectionMint: string): Promise<DASAsset[]> {
  const all: DASAsset[] = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const body = {
      jsonrpc: '2.0',
      id: `rarity-${page}`,
      method: 'getAssetsByGroup',
      params: {
        groupKey: 'collection',
        groupValue: collectionMint,
        limit: DAS_PAGE_SIZE,
        page,
      },
    }
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    const data = (await res.json()) as { result?: { items?: DASAsset[]; total?: number }; error?: { message?: string } }
    if (data.error) throw new Error(data.error.message || 'DAS request failed')
    const items = data.result?.items ?? []
    all.push(...items)
    if (items.length < DAS_PAGE_SIZE) hasMore = false
    else page += 1
  }
  return all
}

/** DAS getAsset for a single mint */
async function fetchAsset(rpcUrl: string, mint: string): Promise<DASAsset | null> {
  const body = {
    jsonrpc: '2.0',
    id: 'getAsset',
    method: 'getAsset',
    params: { id: mint },
  }
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await res.json()) as { result?: DASAsset; error?: { message?: string } }
  if (data.error || !data.result) return null
  return data.result
}

function computeRarity(assets: DASAsset[], attributesPerMint: Map<string, Array<{ trait_type: string; value: string }>>): RarityResult {
  const byTrait: Record<string, Record<string, { count: number }>> = {}
  let collectionName = ''

  for (const asset of assets) {
    const attrs = attributesPerMint.get(asset.id) ?? []
    if (attrs.length === 0) continue
    if (!collectionName && asset.content?.metadata?.name) {
      collectionName = asset.content.metadata.name.replace(/\s*#\d+\s*$/, '').trim() || collectionName
    }
    for (const { trait_type, value } of attrs) {
      if (!byTrait[trait_type]) byTrait[trait_type] = {}
      const slot = byTrait[trait_type][value] ?? { count: 0 }
      slot.count += 1
      byTrait[trait_type][value] = slot
    }
  }

  const totalNfts = assets.length
  const traitOrder = Object.keys(byTrait).sort((a, b) => a.localeCompare(b))
  const result: RarityResult = {
    collectionName: collectionName || 'Unknown collection',
    totalNfts,
    byTrait: {},
    traitOrder,
  }

  for (const trait of traitOrder) {
    const valueCounts = byTrait[trait]
    result.byTrait[trait] = {}
    for (const [value, { count }] of Object.entries(valueCounts)) {
      result.byTrait[trait][value] = {
        count,
        pct: totalNfts > 0 ? (count / totalNfts) * 100 : 0,
        rarityScore: count > 0 ? totalNfts / count : 0,
      }
    }
  }

  return result
}

export default function NftRarityPage() {
  const [collectionMint, setCollectionMint] = useState('')
  const [mintList, setMintList] = useState('')
  const [mode, setMode] = useState<'collection' | 'paste'>('collection')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RarityResult | null>(null)
  const [openTraits, setOpenTraits] = useState<Set<string>>(new Set())

  const toggleTrait = useCallback((trait: string) => {
    setOpenTraits((prev) => {
      const next = new Set(prev)
      if (next.has(trait)) next.delete(trait)
      else next.add(trait)
      return next
    })
  }, [])

  const loadRarities = useCallback(async () => {
    setError(null)
    setResult(null)
    const rpcUrl = getRpcUrl()

    if (mode === 'collection') {
      const mint = collectionMint.trim()
      if (!mint) {
        setError('Enter a collection mint address.')
        return
      }
      setLoading(true)
      setProgress('Fetching collection via DAS…')
      try {
        const assets = await fetchAssetsByGroup(rpcUrl, mint)
        setProgress(`Loaded ${assets.length} NFTs. Fetching metadata…`)
        if (assets.length === 0) {
          setError('No NFTs found for this collection. Use a DAS-compatible RPC (e.g. Helius) or paste mint addresses.')
          return
        }
        const attributesPerMint = new Map<string, Array<{ trait_type: string; value: string }>>()
        for (let i = 0; i < assets.length; i++) {
          setProgress(`Metadata ${i + 1}/${assets.length}…`)
          const attrs = await getAttributesForAsset(assets[i])
          attributesPerMint.set(assets[i].id, attrs)
        }
        setResult(computeRarity(assets, attributesPerMint))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load collection. Use a DAS-compatible RPC (e.g. Helius) or paste mint addresses.')
      } finally {
        setLoading(false)
        setProgress('')
      }
      return
    }

    const lines = mintList
      .split(/[\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) {
      setError('Paste at least one mint address (one per line).')
      return
    }
    setLoading(true)
    setProgress('Fetching NFTs…')
    try {
      const assets: DASAsset[] = []
      for (let i = 0; i < lines.length; i++) {
        setProgress(`Fetching ${i + 1}/${lines.length}…`)
        const a = await fetchAsset(rpcUrl, lines[i])
        if (a) assets.push(a)
      }
      if (assets.length === 0) {
        setError('No valid NFT metadata found. Check mints and RPC (DAS-compatible RPC recommended).')
        setLoading(false)
        setProgress('')
        return
      }
      setProgress('Fetching metadata…')
      const attributesPerMint = new Map<string, Array<{ trait_type: string; value: string }>>()
      for (let i = 0; i < assets.length; i++) {
        setProgress(`Metadata ${i + 1}/${assets.length}…`)
        const attrs = await getAttributesForAsset(assets[i])
        attributesPerMint.set(assets[i].id, attrs)
      }
      setResult(computeRarity(assets, attributesPerMint))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load NFTs.')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }, [mode, collectionMint, mintList])

  return (
    <Layout>
      <div className="nft-rarity-tool tools-page">
        <div className="tools-page-container">
          <Link href="/tools" className="nft-rarity-tool-back" aria-label="Back to Tools">
            <ArrowLeft size={18} />
            Tools
          </Link>
          <h1 className="nft-rarity-tool-title">Solana NFT Rarity</h1>
          <p className="nft-rarity-tool-sub">
            View on-chain trait rarities for a Solana NFT collection. Enter a collection mint (DAS-compatible RPC) or paste mint addresses.
          </p>

          <section className="nft-rarity-tool-section" aria-labelledby="rarity-input-heading">
            <h2 id="rarity-input-heading" className="nft-rarity-tool-section-title">
              Collection or mints
            </h2>
            <div style={{ marginBottom: '1rem' }}>
              <label className="nft-rarity-tool-label">Mode</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="rarity-mode"
                    checked={mode === 'collection'}
                    onChange={() => setMode('collection')}
                  />
                  <span>Collection mint (DAS)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="rarity-mode"
                    checked={mode === 'paste'}
                    onChange={() => setMode('paste')}
                  />
                  <span>Paste mint addresses</span>
                </label>
              </div>
            </div>

            {mode === 'collection' ? (
              <>
                <label className="nft-rarity-tool-label" htmlFor="rarity-collection-mint">
                  Collection mint address
                </label>
                <input
                  id="rarity-collection-mint"
                  type="text"
                  className="nft-rarity-tool-input"
                  placeholder="e.g. J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w"
                  value={collectionMint}
                  onChange={(e) => setCollectionMint(e.target.value)}
                  disabled={loading}
                />
                <p className="nft-rarity-tool-hint">
                  Requires a DAS-compatible RPC (e.g. Helius). Set <code>NEXT_PUBLIC_RPC_URL</code> to your provider.
                </p>
              </>
            ) : (
              <>
                <label className="nft-rarity-tool-label" htmlFor="rarity-mint-list">
                  Mint addresses (one per line)
                </label>
                <textarea
                  id="rarity-mint-list"
                  className="nft-rarity-tool-textarea"
                  placeholder="Paste mint addresses here…"
                  value={mintList}
                  onChange={(e) => setMintList(e.target.value)}
                  disabled={loading}
                />
                <p className="nft-rarity-tool-hint">
                  Works best with a DAS-compatible RPC. Public RPC may not support <code>getAsset</code>.
                </p>
              </>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="nft-rarity-tool-btn"
                onClick={loadRarities}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="nft-rarity-spinner" aria-hidden />
                    Loading…
                  </>
                ) : (
                  <>
                    <BarChart3 size={18} aria-hidden />
                    Load rarities
                  </>
                )}
              </button>
              {progress && <span className="nft-rarity-progress">{progress}</span>}
            </div>
          </section>

          {error && (
            <div className="nft-rarity-tool-section nft-rarity-error" role="alert">
              {error}
            </div>
          )}

          {result && (
            <section className="nft-rarity-tool-section" aria-labelledby="rarity-results-heading">
              <h2 id="rarity-results-heading" className="nft-rarity-tool-section-title">
                Rarity results
              </h2>
              <div className="nft-rarity-summary">
                <div className="nft-rarity-summary-item">
                  <div className="nft-rarity-summary-value">{result.collectionName}</div>
                  <div className="nft-rarity-summary-label">Collection</div>
                </div>
                <div className="nft-rarity-summary-item">
                  <div className="nft-rarity-summary-value">{result.totalNfts}</div>
                  <div className="nft-rarity-summary-label">NFTs</div>
                </div>
                <div className="nft-rarity-summary-item">
                  <div className="nft-rarity-summary-value">{result.traitOrder.length}</div>
                  <div className="nft-rarity-summary-label">Trait types</div>
                </div>
              </div>

              <p className="nft-rarity-tool-hint" style={{ marginBottom: '0.75rem' }}>
                Rarity score = total NFTs ÷ count (higher = rarer). Expand a trait to see value breakdown.
              </p>

              <ul className="nft-rarity-trait-list">
                {result.traitOrder.map((trait) => {
                  const values = result.byTrait[trait]
                  const valueEntries = Object.entries(values).sort((a, b) => a[1].count - b[1].count)
                  const isOpen = openTraits.has(trait)
                  return (
                    <li key={trait} className="nft-rarity-trait-item">
                      <button
                        type="button"
                        className="nft-rarity-trait-header"
                        onClick={() => toggleTrait(trait)}
                        aria-expanded={isOpen}
                      >
                        <span className="nft-rarity-trait-name">{trait}</span>
                        <span className="nft-rarity-trait-count">
                          {valueEntries.length} value{valueEntries.length !== 1 ? 's' : ''}
                          {isOpen ? <ChevronDown size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} aria-hidden /> : <ChevronRight size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} aria-hidden />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="nft-rarity-trait-values">
                          <div className="nft-rarity-value-row" style={{ fontWeight: 600, color: 'var(--rarity-text-dim)' }}>
                            <span>Value</span>
                            <span>Count</span>
                            <span className="nft-rarity-value-pct">%</span>
                            <span className="nft-rarity-value-score">Score</span>
                          </div>
                          {valueEntries.map(([value, stats]) => (
                            <div key={value} className="nft-rarity-value-row">
                              <span className="nft-rarity-value-name">{value}</span>
                              <span className="nft-rarity-value-count">{stats.count}</span>
                              <span className="nft-rarity-value-pct">{stats.pct.toFixed(2)}%</span>
                              <span className="nft-rarity-value-score">{stats.rarityScore.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {!result && !loading && !error && (
            <div className="nft-rarity-tool-section nft-rarity-empty">
              Enter a collection mint or paste mint addresses, then click &quot;Load rarities&quot;.
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
