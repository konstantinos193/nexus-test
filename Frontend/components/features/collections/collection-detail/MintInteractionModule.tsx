'use client'

/**
 * MintInteractionModule – Mint quantity, total cost, Mint Now.
 * Optional multi-mint limit; guard rules (WL, NFT-gated) can plug in later.
 */

import { useState, useCallback } from 'react'
import type { CollectionDetail } from '@/types'

export interface MintInteractionModuleProps {
  collection: CollectionDetail
  /** Max mints per tx (default 10) */
  maxPerTx?: number
  isWalletConnected?: boolean
  onMint?: (qty: number) => void
}

export default function MintInteractionModule({
  collection,
  maxPerTx = 10,
  isWalletConnected = false,
  onMint,
}: MintInteractionModuleProps) {
  const [qty, setQty] = useState(1)
  const price = collection.price ?? 0
  const total = price * qty
  const soldOut = collection.status === 'completed'
  const canMint = collection.status === 'minting' && isWalletConnected && !soldOut

  const dec = useCallback(() => {
    setQty((n) => Math.max(1, n - 1))
  }, [])
  const inc = useCallback(() => {
    setQty((n) => Math.min(maxPerTx, n + 1))
  }, [maxPerTx])

  return (
    <section className="cp-mint">
      <div className="cp-container">
        <h2 className="cp-mint-title">Mint</h2>
        <div className="cp-mint-qty">
          <span className="cp-mint-qty-label">Mint Quantity:</span>
          <div className="cp-mint-qty-controls">
            <button
              type="button"
              className="cp-mint-qty-btn"
              onClick={dec}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="cp-mint-qty-value">{qty}</span>
            <button
              type="button"
              className="cp-mint-qty-btn"
              onClick={inc}
              disabled={qty >= maxPerTx}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
        <p className="cp-mint-total">
          Total Cost: <strong>◎ {total.toFixed(2)}</strong> + fees
        </p>
        <button
          type="button"
          className="cp-mint-cta"
          disabled={!canMint}
          onClick={() => onMint?.(qty)}
        >
          {!isWalletConnected ? 'Connect Wallet' : soldOut ? 'Sold Out' : 'Mint Now'}
        </button>
      </div>
    </section>
  )
}
