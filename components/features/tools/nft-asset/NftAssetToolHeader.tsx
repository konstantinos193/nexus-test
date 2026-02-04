'use client'

/**
 * NftAssetToolHeader.tsx
 * Breadcrumb, title, one paragraph of instructions. The first thing users see before they
 * drop a folder and realize they organized their traits wrong. We've all been there.
 *
 * @author Juan – header janitor and instruction writer (we tried)
 */

export default function NftAssetToolHeader() {
  return (
    <>
      <nav className="nft-asset-tool-index" aria-label="Tools index">
        <span className="nft-asset-tool-index-label">Tools:</span>
        <span className="nft-asset-tool-index-current">NFT Layer Generator</span>
      </nav>
      <h1 className="nft-asset-tool-title">NFT Layer Generator</h1>
      <p className="nft-asset-tool-sub">
        You have one folder with your trait types inside (e.g. Backgrounds, Body, Eyes, Head,
        Outfits). Select that folder once — each subfolder becomes one layer. Set priority, add
        exclusions, then generate images + metadata for the Create page.
      </p>
    </>
  )
}

// — Juan. Read the instructions. We wrote them for a reason. (Nobody reads them.)
