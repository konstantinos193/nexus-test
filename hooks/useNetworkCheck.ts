'use client'

import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { getSolanaConfig, getNetworkDisplayName } from '@/lib/solana/config'

/**
 * Validates that the wallet/RPC network matches the expected launchpad network.
 * Only runs when a wallet is connected; no "wrong network" or connection errors
 * are shown until the user has connected a wallet.
 */
export function useNetworkCheck() {
  const { connection } = useConnection()
  const { connected } = useWallet()
  const config = getSolanaConfig()
  const expectedHash = config.expectedGenesisHash
  const expectedNetworkName = getNetworkDisplayName()

  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!connected) {
      setIsCorrectNetwork(null)
      setIsChecking(false)
      setError(null)
      return
    }

    let cancelled = false

    async function check() {
      setIsChecking(true)
      setError(null)
      try {
        const genesisHash = await connection.getGenesisHash()
        const match = genesisHash === expectedHash
        if (!cancelled) {
          setIsCorrectNetwork(match)
          if (!match) {
            setError(`Wrong network. This launchpad uses ${expectedNetworkName}. Switch your wallet/RPC to ${expectedNetworkName}.`)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setIsCorrectNetwork(false)
          setError('Could not verify network. Check your connection.')
        }
      } finally {
        if (!cancelled) setIsChecking(false)
      }
    }

    check()
    return () => { cancelled = true }
  }, [connected, connection, expectedHash, expectedNetworkName])

  return {
    isCorrectNetwork: isCorrectNetwork === true,
    isWrongNetwork: isCorrectNetwork === false,
    isChecking,
    error,
    expectedNetworkName,
  }
}
