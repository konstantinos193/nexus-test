import { useState, useCallback, useEffect } from 'react'
import { NFTCollection, FilterState } from '@/types'

/**
 * Custom hook for managing collection filtering logic
 * Because filtering is what separates us from animals
 *
 * Returns: filteredCollections, loading, handleFilterChange
 * Used by CollectionsPageContent + CollectionFilters
 *
 * @author Juan - The developer who built this hook
 * (Coded with care, humor, and probably too much coffee)
 */
export function useCollectionFilters(collections: NFTCollection[]) {
  const [filteredCollections, setFilteredCollections] = useState<NFTCollection[]>(collections)
  const [loading, setLoading] = useState(false)

  // Update filtered collections when collections prop changes
  // Because we're not going to ignore new data (that would be rude)
  useEffect(() => {
    setFilteredCollections(collections)
  }, [collections])

  // Apply filters - search, status, sort
  // Because filtering is what separates us from animals (and unfiltered lists)
  const handleFilterChange = useCallback((filters: FilterState) => {
    setLoading(true)
    
    // Simulate API delay - because we're fancy like that (and it feels more "real")
    setTimeout(() => {
      let filtered = [...collections]

      // Search filter - because finding things is important
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower)
        )
      }

      // Status filter - draft, minting, completed, etc.
      if (filters.status) {
        filtered = filtered.filter((c) => c.status === filters.status)
      }

      // Sort - because order matters (newest, oldest, name, most minted)
      // Default to sorting by minted count (volume) for pyramid layout
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          switch (filters.sortBy) {
            case 'newest':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            case 'oldest':
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            case 'name':
              return a.name.localeCompare(b.name)
            case 'minted':
              return b.minted - a.minted
            default:
              return 0
          }
        })
      } else {
        // Default sort by minted count (volume) for pyramid layout
        filtered.sort((a, b) => b.minted - a.minted)
      }

      setFilteredCollections(filtered)
      setLoading(false)
    }, 300) // Fake delay for realism (because instant feels too good to be true)
  }, [collections])

  return {
    filteredCollections,
    loading,
    handleFilterChange,
  }
}

// Coded by Juan - because every good hook needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Filtering: making chaos slightly less chaotic. 🧹
