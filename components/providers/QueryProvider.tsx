'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * QueryProvider - Wraps the app with React Query
 * Because fetching data shouldn't be complicated
 * (Even though it usually is)
 */

interface QueryProviderProps {
  children: React.ReactNode
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance
  // We use useState to ensure it's only created once
  // Because creating a new client on every render is wasteful
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time - how long data is considered fresh
            staleTime: 30 * 1000, // 30 seconds
            // Refetch on window focus - don't refetch when user switches tabs
            refetchOnWindowFocus: false,
            // Retry failed requests
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
