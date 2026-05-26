'use client'

/**
 * WalletReadyContext - Single-module context for wallet provider readiness.
 * Isolated in its own file so webpack never creates duplicate instances across chunks.
 * (One context, one truth. The blockchain demands it.)
 *
 * false until SolanaWalletProvider confirms the adapters have mounted client-side.
 * Any component that calls useWallet() should gate on this being true first.
 * (Otherwise you'll get a "useWallet must be within WalletProvider" crash. Fun times.)
 *
 * @author Juan - The developer who learned from the Phantom SDK wars
 * (Coded with care, humor, and probably too much coffee)
 */

import { createContext } from 'react'

// Starts false — only flips to true after SolanaWalletProvider confirms client-side init
export const WalletReadyContext = createContext(false)
