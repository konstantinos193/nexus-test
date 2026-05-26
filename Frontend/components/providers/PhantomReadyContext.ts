'use client'

/**
 * PhantomReadyContext - Single-module context for Phantom SDK readiness.
 * Isolated from PhantomProviderClient so that webpack always resolves this
 * to one chunk — no matter how the bundle splits, provider and consumers
 * import from the same module and share the same context object.
 * (One context to rule them all. One module to find them.)
 */

import { createContext } from 'react'

// false = loading, true = SDK ready, null = no app ID configured
export const PhantomReadyContext = createContext<boolean | null>(false)
