import { useReducer } from 'react'
import { FilterState } from '@/types'

interface CollectionsPageState {
  filters: FilterState
  statusFilter: string[]
  searchQuery: string
  displayLimit: number
}

type CollectionsPageAction =
  | { type: 'SET_FILTERS'; payload: Partial<FilterState> }
  | { type: 'SET_STATUS_FILTER'; payload: string[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'LOAD_MORE' }
  | { type: 'CLEAR_FILTERS' }

const initialState: CollectionsPageState = {
  filters: {
    sortBy: 'newest'
  },
  statusFilter: [],
  searchQuery: '',
  displayLimit: 12
}

function collectionsPageReducer(state: CollectionsPageState, action: CollectionsPageAction): CollectionsPageState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      }
    
    case 'SET_STATUS_FILTER':
      return {
        ...state,
        statusFilter: action.payload
      }
    
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
        filters: {
          ...state.filters,
          search: action.payload || undefined
        }
      }
    
    case 'LOAD_MORE':
      return {
        ...state,
        displayLimit: state.displayLimit + 12
      }
    
    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: { sortBy: 'newest' },
        statusFilter: [],
        searchQuery: ''
      }
    
    default:
      return state
  }
}

export function useCollectionsPageState(initialSearch?: string) {
  const [state, dispatch] = useReducer(collectionsPageReducer, {
    ...initialState,
    searchQuery: initialSearch || '',
    filters: {
      ...initialState.filters,
      search: initialSearch || undefined
    }
  })

  // Initialize status filter based on initial search
  const initializeStatusFilter = (initialStatus?: string) => {
    if (!initialStatus) return []
    if (initialStatus === 'minting') return ['live']
    if (initialStatus === 'ready' || initialStatus === 'preparing') return ['upcoming']
    if (initialStatus === 'completed') return ['ended']
    return []
  }

  return {
    ...state,
    dispatch,
    initializeStatusFilter
  }
}
