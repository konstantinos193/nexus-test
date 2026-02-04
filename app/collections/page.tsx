/**
 * Collections Page – The grand bazaar of NFT collections
 * Wireframe spec: Header + Search, Filter Bar, Grid, Pagination
 * This is where users discover and browse all collections
 * Because browsing is half the fun (the other half is actually minting)
 * 
 * Complete redesign with modern dark theme and glassmorphism effects
 * Uses its own CSS module - no global dependencies (because we're independent like that)
 * 
 * Now with mobile support! Because mobile users deserve a great experience too
 * (Even if their screens are smaller than our ambitions)
 * 
 * @author Juan - The developer who built this collections page
 * (Coded with care, humor, and probably too much coffee)
 */

import Layout from '@/components/layout/Layout'
import CollectionsPageContent from '@/components/features/collections/CollectionsPageContent'

export default function CollectionsPage() {
  return (
    <Layout>
      <CollectionsPageContent />
    </Layout>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Browse. Filter. Discover. Repeat. 🔍
