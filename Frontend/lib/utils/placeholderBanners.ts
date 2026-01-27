/**
 * Placeholder banner color palettes
 * Used by Hero carousel and FeaturedDropsGrid so banners look like distinct artwork
 * rather than identical flat placeholders (because gray is depressing)
 *
 * Each [bg, text] pair gives a unique gradient feel per collection
 *
 * @author Juan - The developer who made banners less boring
 * (Coded with care, humor, and probably too much coffee)
 */

export const BANNER_PALETTES: [string, string][] = [
  ['2d1b2e', 'e07a5f'], // warm sunset / coral
  ['0d3b45', '7dd3fc'], // ocean / sky
  ['3d2463', 'c77dff'], // purple dream
  ['3d2c1e', 'fbbf24'], // amber / gold
  ['1b4332', '95d5b2'], // forest / mint
  ['4a1942', 'f0abfc'], // plum / fuchsia
]

export function getBannerPalette(collectionId: string): [string, string] {
  // Pick palette by collection ID (cycled) - because we need *some* variety
  const idx = parseInt(collectionId, 10) || 0
  return BANNER_PALETTES[idx % BANNER_PALETTES.length]
}

/** Build local API URL for collection banner (width × height, palette, name).
 * Uses our own API route instead of placehold.co for better performance.
 * Because external domains are slow, and we're not about that life. */
export function placeholderBannerUrl(
  collectionId: string,
  collectionName: string,
  width: number,
  height: number
): string {
  // Use local API route - eliminates DNS/TLS delays
  // Next.js will optimize this via Image Optimization API
  const params = new URLSearchParams({
    id: collectionId,
    name: collectionName,
    w: width.toString(),
    h: height.toString(),
  })
  return `/api/images/banner?${params.toString()}`
}

// Coded by Juan - because every good util needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Placeholders: making "no image yet" less sad. 🖼️
