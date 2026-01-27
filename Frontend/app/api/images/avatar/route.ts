/**
 * Avatar Image API Route - Server-side avatar generation
 * Generates optimized avatar placeholders without external dependencies
 * Because even tiny avatars deserve fast loading times
 * 
 * @author Juan - The developer who optimized every pixel
 * (Coded with care, humor, and probably too much coffee)
 */

import { NextRequest, NextResponse } from 'next/server'

// Cache for 1 year - these are deterministic
const CACHE_MAX_AGE = 31536000 // 1 year in seconds

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const text = searchParams.get('text') || '?'
  const size = parseInt(searchParams.get('size') || '16', 10)
  const bgColor = searchParams.get('bg') || '00d4ff'
  const textColor = searchParams.get('textColor') || 'ffffff'

  // Generate SVG avatar - fast, no external dependencies
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#${bgColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="${size * 0.6}" 
        font-weight="600"
        fill="#${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${text.charAt(0).toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
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
