/**
 * Banner Image API Route - Server-side placeholder generation
 * Generates optimized placeholder banners without external dependencies
 * Because waiting for placehold.co is slow, and we're not about that life
 * 
 * This route:
 * - Generates SVG placeholders (fast, no external requests)
 * - Returns optimized images via Next.js Image Optimization
 * - Adds aggressive caching headers
 * - Eliminates DNS/TLS delays from external domains
 * 
 * @author Juan - The developer who eliminated external image dependencies
 * (Coded with care, humor, and probably too much coffee)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBannerPalette } from '@/lib/utils/placeholderBanners'

// Cache for 1 year - these are deterministic placeholders
const CACHE_MAX_AGE = 31536000 // 1 year in seconds

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id') || '0'
  const name = searchParams.get('name') || 'Collection'
  const width = parseInt(searchParams.get('w') || '1200', 10)
  const height = parseInt(searchParams.get('h') || '400', 10)

  // Get color palette for this collection
  const [bgColor, textColor] = getBannerPalette(id)

  // Generate SVG placeholder - fast, no external dependencies
  // SVG is perfect for placeholders: small, scalable, instant
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${bgColor};stop-opacity:1" />
          <stop offset="50%" style="stop-color:#${bgColor}dd;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${bgColor}aa;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="${Math.min(width / 15, 48)}" 
        font-weight="600"
        fill="#${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        opacity="0.9"
      >
        ${name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </text>
    </svg>
  `.trim()

  // Return SVG with aggressive caching headers
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
      'CDN-Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
      'Vary': 'Accept',
    },
  })
}
