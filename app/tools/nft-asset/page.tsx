/**
 * app/tools/nft-asset/page.tsx
 * The /tools/nft-asset route. Layout + NftAssetToolPageContent + the CSS we stole from the old page.
 * Same thin-page pattern: we delegate and weep. The real work happens in the content component.
 *
 * @author Juan – route guardian and CSS importer (we don't ask why, we just import)
 */

import Layout from '@/components/layout/Layout'
import NftAssetToolPageContent from '@/components/features/tools/nft-asset/NftAssetToolPageContent'
import '../tools-page.css'
import './nft-asset-tool.css'

export default function NftAssetToolPage() {
  return (
    <Layout>
      <NftAssetToolPageContent />
    </Layout>
  )
}

// — Juan. /tools/nft-asset. One page. Many layers. Same signature.
