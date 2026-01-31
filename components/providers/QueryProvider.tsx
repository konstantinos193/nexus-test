'use client'

/**
 * QueryProvider - Wraps the app with React Query
 * Because fetching data shouldn't be complicated
 * (Even though it usually is. We try anyway.)
 *
 * We create the QueryClient once (useState initializer) so we don't get a new
 * client on every render. That would wipe the cache and make everyone sad
 *
 * @author Juan - The developer who provided the queries
 * (Coded with care, humor, and probably too much coffee)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient once - useState initializer runs only on mount
  // Because creating a new client on every render would wipe the cache
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - One client. Many queries. We keep it simple.
