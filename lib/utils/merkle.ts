/**
 * Merkle Tree Utilities
 * Because allowlists need cryptographic proof (and we're not trusting anyone)
 * 
 * This handles Merkle tree proof generation and verification for allowlists
 * Uses Keccak256 hashing (matching the smart contract implementation)
 * 
 * NOTE: For production, you may want to use @noble/hashes for better performance
 * Install with: npm install @noble/hashes
 */

// Simple Keccak256 implementation using Web Crypto API
// In production, consider using @noble/hashes for better performance
async function keccak256(data: Uint8Array): Promise<Uint8Array> {
  // Web Crypto API doesn't support Keccak256 directly
  // For now, we'll use SHA-256 as a placeholder
  // TODO: Replace with actual Keccak256 implementation or use @noble/hashes
  // Cast to BufferSource to satisfy TypeScript's type requirements
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return new Uint8Array(hashBuffer)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Hash a wallet address using Keccak256
 * Because the smart contract uses Keccak256, not SHA256 (and we need to match)
 * 
 * NOTE: This is async because we're using Web Crypto API
 * In production with @noble/hashes, this can be synchronous
 */
export async function hashWalletAddress(address: string): Promise<Uint8Array> {
  // Convert address to bytes (Solana addresses are base58, but we work with bytes)
  // In practice, we'll receive the address as a string and need to work with it
  const addressBytes = new TextEncoder().encode(address)
  return keccak256(addressBytes)
}

/**
 * Hash two nodes together (for Merkle tree construction)
 * Because Merkle trees need parent nodes (and we're building them properly)
 */
export async function hashPair(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  // Sort to ensure deterministic hashing (left < right)
  const sorted = left < right ? [left, right] : [right, left]
  const combined = new Uint8Array(sorted[0].length + sorted[1].length)
  combined.set(sorted[0], 0)
  combined.set(sorted[1], sorted[0].length)
  return keccak256(combined)
}

/**
 * Generate Merkle proof for a wallet address
 * Returns the proof array and leaf index
 * 
 * @param walletAddress - The wallet address to generate proof for
 * @param allowlist - Array of wallet addresses in the allowlist
 * @returns Object with proof array and leaf index, or null if not in allowlist
 */
export async function generateMerkleProof(
  walletAddress: string,
  allowlist: string[]
): Promise<{ proof: string[]; leafIndex: number } | null> {
  if (allowlist.length === 0) {
    return null
  }

  // Find the wallet in the allowlist
  const leafIndex = allowlist.findIndex(addr => addr.toLowerCase() === walletAddress.toLowerCase())
  if (leafIndex === -1) {
    return null // Wallet not in allowlist
  }

  // Build Merkle tree and generate proof
  const leaves = await Promise.all(allowlist.map(addr => hashWalletAddress(addr)))
  const proof: string[] = []
  
  let currentIndex = leafIndex
  let currentLevel = leaves
  
  // Build tree level by level until we reach the root
  while (currentLevel.length > 1) {
    const nextLevel: Uint8Array[] = []
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Pair exists - hash them together
        const parent = await hashPair(currentLevel[i], currentLevel[i + 1])
        nextLevel.push(parent)
        
        // If current node is part of this pair, add sibling to proof
        if (Math.floor(currentIndex / 2) === Math.floor(i / 2)) {
          const siblingIndex = currentIndex % 2 === 0 ? i + 1 : i
          proof.push(bytesToHex(currentLevel[siblingIndex]))
        }
      } else {
        // Odd number of nodes - promote the last one
        nextLevel.push(currentLevel[i])
      }
    }
    
    currentLevel = nextLevel
    currentIndex = Math.floor(currentIndex / 2)
  }
  
  return {
    proof: proof.reverse(), // Reverse to get proof from leaf to root
    leafIndex,
  }
}

/**
 * Verify a Merkle proof
 * Checks if a wallet address is valid for a given Merkle root
 * 
 * @param root - The Merkle root (32 bytes as hex string)
 * @param proof - Array of proof hashes (hex strings)
 * @param walletAddress - The wallet address to verify
 * @param leafIndex - The index of the leaf in the original allowlist
 * @returns True if proof is valid, false otherwise
 */
export async function verifyMerkleProof(
  root: string,
  proof: string[],
  walletAddress: string,
  leafIndex: number
): Promise<boolean> {
  try {
    let currentHash = await hashWalletAddress(walletAddress)
    let currentIndex = leafIndex
    
    // Reconstruct the path from leaf to root
    for (const proofHash of proof) {
      const proofBytes = hexToBytes(proofHash)
      
      // Determine if current node is left or right child
      if (currentIndex % 2 === 0) {
        // Current is left, proof is right
        currentHash = await hashPair(currentHash, proofBytes)
      } else {
        // Current is right, proof is left
        currentHash = await hashPair(proofBytes, currentHash)
      }
      
      currentIndex = Math.floor(currentIndex / 2)
    }
    
    // Compare computed root with provided root
    const computedRoot = bytesToHex(currentHash)
    return computedRoot.toLowerCase() === root.toLowerCase()
  } catch (error) {
    console.error('Error verifying Merkle proof:', error)
    return false
  }
}

/**
 * Convert hex string to Uint8Array
 * Because we need bytes, not strings (and hex is just a representation)
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * Check if a wallet is eligible for allowlist minting
 * This is a convenience function that combines proof generation and verification
 * 
 * @param walletAddress - The wallet address to check
 * @param allowlist - Array of wallet addresses
 * @param merkleRoot - The Merkle root from the smart contract
 * @returns Object with eligibility status and proof data
 */
export async function checkAllowlistEligibility(
  walletAddress: string,
  allowlist: string[],
  merkleRoot: string | null
): Promise<{
  eligible: boolean
  proof: string[] | null
  leafIndex: number | null
  error?: string
}> {
  if (!merkleRoot) {
    return {
      eligible: true, // No allowlist = public mint
      proof: null,
      leafIndex: null,
    }
  }

  if (allowlist.length === 0) {
    return {
      eligible: false,
      proof: null,
      leafIndex: null,
      error: 'Allowlist is empty',
    }
  }

  const proofData = await generateMerkleProof(walletAddress, allowlist)
  if (!proofData) {
    return {
      eligible: false,
      proof: null,
      leafIndex: null,
      error: 'Wallet not found in allowlist',
    }
  }

  // Verify the proof matches the root
  const isValid = await verifyMerkleProof(merkleRoot, proofData.proof, walletAddress, proofData.leafIndex)
  
  return {
    eligible: isValid,
    proof: proofData.proof,
    leafIndex: proofData.leafIndex,
    error: isValid ? undefined : 'Proof verification failed',
  }
}
