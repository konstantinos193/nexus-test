/**
 * BigInt Polyfill - Because Turbopack and BigInt don't play well together
 * 
 * This polyfill patches Math.pow to handle BigInt values gracefully
 * It's needed because Solana wallet adapters use BigInt operations
 * that get transpiled to Math.pow, which doesn't support BigInt
 * 
 * We patch Math.pow to detect BigInt values and handle them appropriately
 * This prevents the "Cannot convert a BigInt value to a number" error
 * 
 * @author Juan - The developer who built this polyfill
 * (Coded with care, humor, and probably too much coffee)
 */

// Only run in browser environment (client-side)
if (typeof window !== 'undefined') {
  // Store the original Math.pow
  const originalMathPow = Math.pow

  // Patch Math.pow to handle BigInt values
  // If either argument is a BigInt, we need to handle it differently
  // Using type assertion because we're extending the type signature
  ;(Math as any).pow = function (base: number | bigint, exponent: number | bigint): number | bigint {
    // If both are regular numbers, use the original implementation
    if (typeof base === 'number' && typeof exponent === 'number') {
      return originalMathPow(base, exponent)
    }

    // If we have BigInt values, we need to handle them
    // For BigInt exponentiation, we use the ** operator which is native
    if (typeof base === 'bigint' || typeof exponent === 'bigint') {
      // Convert to BigInt if needed
      const bigBase = typeof base === 'bigint' ? base : BigInt(base)
      const bigExponent = typeof exponent === 'bigint' ? exponent : BigInt(exponent)
      
      // Use native BigInt exponentiation
      return bigBase ** bigExponent
    }

    // Fallback to original for edge cases
    return originalMathPow(Number(base), Number(exponent))
  }
}

// Export nothing - this is a side-effect polyfill
export {}
