'use client'

/**
 * AllowlistChecker Component - The gatekeeper for allowlist mints
 * Because not everyone gets early access (and we're checking cryptographically)
 * 
 * This component allows users to check if their wallet is on the allowlist
 * and generates the Merkle proof needed for minting
 * 
 * Features:
 * - Check wallet eligibility
 * - Display allowlist status
 * - Generate proof for minting
 * - Show helpful error messages (because users need guidance)
 * 
 * @author Juan - The developer who built this allowlist checker
 * (Coded with care, humor, and probably too much coffee)
 */

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Wallet, AlertCircle, Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { checkAllowlistEligibility } from '@/lib/utils/merkle'
import styles from './AllowlistChecker.module.css'

interface AllowlistCheckerProps {
  /** Wallet address to check (optional, will prompt if not provided) */
  walletAddress?: string | null
  /** Merkle root from the smart contract (null = public mint) */
  merkleRoot: string | null
  /** Array of wallet addresses in the allowlist */
  allowlist: string[]
  /** Collection slug for display */
  collectionSlug?: string
  /** Callback when proof is generated (for use in minting) */
  onProofGenerated?: (proof: string[], leafIndex: number) => void
}

export default function AllowlistChecker({
  walletAddress,
  merkleRoot,
  allowlist,
  collectionSlug,
  onProofGenerated,
}: AllowlistCheckerProps) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{
    eligible: boolean
    proof: string[] | null
    leafIndex: number | null
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-check when wallet address or merkle root changes
  useEffect(() => {
    if (walletAddress && merkleRoot && allowlist.length > 0) {
      handleCheck()
    } else if (!merkleRoot) {
      // Public mint - no allowlist
      setResult({
        eligible: true,
        proof: null,
        leafIndex: null,
      })
    }
  }, [walletAddress, merkleRoot, allowlist.length])

  const handleCheck = async () => {
    if (!walletAddress) {
      setResult({
        eligible: false,
        proof: null,
        leafIndex: null,
        error: 'Please connect your wallet to check allowlist status',
      })
      return
    }

    if (!merkleRoot) {
      setResult({
        eligible: true,
        proof: null,
        leafIndex: null,
      })
      return
    }

    if (allowlist.length === 0) {
      setResult({
        eligible: false,
        proof: null,
        leafIndex: null,
        error: 'Allowlist is empty',
      })
      return
    }

    setChecking(true)
    
    try {
      // Small delay to show loading state (because UX matters)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const eligibility = await checkAllowlistEligibility(walletAddress, allowlist, merkleRoot)
      setResult(eligibility)
      
      // Call callback if proof was generated
      if (eligibility.eligible && eligibility.proof && eligibility.leafIndex !== null) {
        onProofGenerated?.(eligibility.proof, eligibility.leafIndex)
      }
    } catch (error) {
      console.error('Error checking allowlist:', error)
      setResult({
        eligible: false,
        proof: null,
        leafIndex: null,
        error: 'Failed to check allowlist. Please try again.',
      })
    } finally {
      setChecking(false)
    }
  }

  const copyProof = () => {
    if (result?.proof) {
      const proofJson = JSON.stringify(result.proof)
      navigator.clipboard.writeText(proofJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // If no merkle root, this is a public mint
  if (!merkleRoot) {
    return (
      <div className={styles.container}>
        <div className={styles.publicMint}>
          <CheckCircle2 className={styles.iconSuccess} />
          <div className={styles.content}>
            <h3 className={styles.title}>Public Mint</h3>
            <p className={styles.description}>
              This collection is open to everyone. No allowlist required.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If no wallet connected
  if (!walletAddress) {
    return (
      <div className={styles.container}>
        <div className={styles.notConnected}>
          <Wallet className={styles.iconNeutral} />
          <div className={styles.content}>
            <h3 className={styles.title}>Connect Wallet to Check</h3>
            <p className={styles.description}>
              Connect your wallet to check if you're on the allowlist.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Checking state
  if (checking) {
    return (
      <div className={styles.container}>
        <div className={styles.checking}>
          <Loader2 className={styles.iconLoading} />
          <div className={styles.content}>
            <h3 className={styles.title}>Checking Allowlist...</h3>
            <p className={styles.description}>
              Verifying your wallet address against the allowlist.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Results
  if (!result) {
    return (
      <div className={styles.container}>
        <Button onClick={handleCheck} variant="primary" className={styles.checkButton}>
          <Wallet className="w-4 h-4" />
          Check Allowlist Status
        </Button>
      </div>
    )
  }

  // Eligible
  if (result.eligible) {
    return (
      <div className={styles.container}>
        <div className={styles.eligible}>
          <CheckCircle2 className={styles.iconSuccess} />
          <div className={styles.content}>
            <div className={styles.header}>
              <h3 className={styles.title}>You're on the Allowlist!</h3>
              <Badge className="border-[#10b981]/30 bg-[#10b981]/20 px-2 py-1 text-xs text-[#10b981]">
                Eligible
              </Badge>
            </div>
            <p className={styles.description}>
              Your wallet is eligible for allowlist minting. You can proceed with minting.
            </p>
            {result.proof && result.leafIndex !== null && (
              <div className={styles.proofSection}>
                <div className={styles.proofHeader}>
                  <span className={styles.proofLabel}>Proof Generated</span>
                  <button
                    onClick={copyProof}
                    className={styles.copyButton}
                    title="Copy proof to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={styles.proofDetails}>
                  <div className={styles.proofDetail}>
                    <span className={styles.proofDetailLabel}>Leaf Index:</span>
                    <span className={styles.proofDetailValue}>{result.leafIndex}</span>
                  </div>
                  <div className={styles.proofDetail}>
                    <span className={styles.proofDetailLabel}>Proof Length:</span>
                    <span className={styles.proofDetailValue}>{result.proof.length} hashes</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Not eligible
  return (
    <div className={styles.container}>
      <div className={styles.notEligible}>
        <XCircle className={styles.iconError} />
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.title}>Not on Allowlist</h3>
            <Badge className="border-[#ef4444]/30 bg-[#ef4444]/20 px-2 py-1 text-xs text-[#ef4444]">
              Not Eligible
            </Badge>
          </div>
          <p className={styles.description}>
            {result.error || "Your wallet address is not on the allowlist for this collection."}
          </p>
          <div className={styles.helpSection}>
            <AlertCircle className={styles.helpIcon} />
            <p className={styles.helpText}>
              You can still mint during the public phase when it opens.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
