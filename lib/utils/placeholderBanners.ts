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

/** Build placeholder image URL (width × height).
 * Milestone 1: use placehold.net directly so homepage images work without /api/images.
 * Next.js images.remotePatterns already allows placehold.net. */
export function placeholderBannerUrl(
  _collectionId: string,
  _collectionName: string,
  width: number,
  height: number
): string {
  return `https://placehold.net/${width}x${height}.png`
}

// Coded by Juan - because every good util needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Placeholders: making "no image yet" less sad.
