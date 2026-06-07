export const endpoints = {
  collections: {
    list: '/api/collections',
    byId: (id: string) => `/api/collections/${id}`,
    sync: '/api/collections/sync',
    onchain: (address: string) => `/api/collections/onchain/${address}`,
  },
  admin: {
    stats: '/api/admin/stats',
    creators: '/api/admin/creators',
    updateCollection: (id: string) => `/api/admin/collections/${id}`,
    deleteCollection: (id: string) => `/api/admin/collections/${id}`,
  },
  infrastructure: {
    health: '/health',
    ipfsHealth: '/api/ipfs/health',
    ipfsPins: '/api/ipfs/pins',
    ipfsCheck: (hash: string) => `/api/ipfs/check/${hash}`,
    ipfsView: (hash: string) => `/api/ipfs/view/${hash}`,
    solanaNetwork: '/api/solana/network',
    solanaConfig: '/api/solana/config',
    contractStatus: '/api/solana/contracts/status',
  },
  activity: {
    list: '/api/activity',
  },
} as const
