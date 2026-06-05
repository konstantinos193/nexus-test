/**
 * Avatar Image API Route — GET /api/images/avatar
 * Server-side SVG avatar generation — deterministic, fast, no external dependencies
 * Because even tiny profile pictures deserve to load instantly
 *
 * What this does:
 * Generates a circular SVG avatar with a single letter initial on a colored background
 * Returns it with aggressive 1-year caching headers because the output is deterministic
 * Same inputs always produce the same output. Cache forever. Serve from edge. Done.
 *
 * Why server-side instead of a third-party service like ui-avatars.com?
 * - No external DNS resolution (saves ~100ms per cold request)
 * - No TLS handshake to a foreign server (saves another ~50ms)
 * - No dependency on a service we don't control (no "their API is down" incidents)
 * - Works offline in development (no internet required for a letter in a circle)
 * - Infinitely cacheable at the CDN layer (no one else's cache policies to fight)
 *
 * Query parameters:
 * - text: the text to extract the initial from (default: '?')
 * - size: the pixel dimensions of the square SVG (default: 16)
 * - bg: the background color hex WITHOUT the # (default: '00d4ff')
 * - textColor: the letter color hex WITHOUT the # (default: 'ffffff')
 *
 * @author Juan - Avatar generator and "no external dependencies for tiny images" purist
 * (Coded with care, SVG knowledge, and a strong opinion about loading performance)
 */

// NextRequest — the typed request object, gives us access to URL search params
// NextResponse — the response helper, handles headers and Content-Type automatically
// We use new NextResponse(svg, ...) instead of NextResponse.json() because this is SVG, not JSON
import { NextRequest, NextResponse } from 'next/server'

// ── Configuration ─────────────────────────────────────────────────────────────
// Cache duration: 1 year in seconds
// These avatars are deterministic — same params, same output, always
// Cache them as long as possible. They don't change. Ever.
// (Unless someone changes the default color. Then we'd need to purge. Don't change the default color.)
const CACHE_MAX_AGE = 31536000 // 365 days × 24 hours × 60 minutes × 60 seconds = this number

// ── GET Handler ───────────────────────────────────────────────────────────────

/**
 * GET - Avatar SVG generation handler
 * Reads query params, generates an SVG, returns it with long-lived cache headers
 *
 * Example requests:
 * /api/images/avatar?text=Juan&size=40&bg=6c47ff&textColor=ffffff
 * → 40×40 purple circle with "J" in white
 *
 * /api/images/avatar?text=CryptoKitty&size=64
 * → 64×64 cyan circle with "C" in white (defaults)
 *
 * The initial is always uppercase. Always the first character.
 * Special characters in text are HTML-escaped to prevent SVG injection.
 * (SVG injection is a real thing. We prevent it. You're welcome.)
 */
export async function GET(request: NextRequest) {
  // Extract query parameters from the request URL
  // All params have sensible defaults so the route works with minimal input
  const searchParams = request.nextUrl.searchParams

  // text — the source string for the initial. Can be a name, wallet address, whatever.
  // We take the first character, uppercase it, and that's the avatar.
  // '?' as default because an unknown user is a mystery and mysteries get question marks.
  const text = searchParams.get('text') || '?'

  // size — the width and height of the circular SVG in pixels
  // parseInt with radix 10 because we're rigorous like that
  // Default 16: small but visible, good for tiny UI elements like wallet address chips
  const size = parseInt(searchParams.get('size') || '16', 10)

  // bgColor — the hex color for the circle background WITHOUT the # prefix
  // Default '00d4ff' — the platform's primary accent cyan color
  // Users can override this for custom theming or collection-specific colors
  const bgColor = searchParams.get('bg') || '00d4ff'

  // textColor — the hex color for the letter text WITHOUT the # prefix
  // Default 'ffffff' — white text on any colored background is safe for readability
  // (High contrast. Accessibility. Juan cares about WCAG even in tiny avatars.)
  const textColor = searchParams.get('textColor') || 'ffffff'

  // ── SVG Generation ────────────────────────────────────────────────────────
  // Build the SVG string — a circle with centered text
  // Font size at 60% of the avatar size looks right at any scale
  // font-weight 600 — semibold. Bold enough to read, not so bold it looks chunky.
  // text-anchor="middle" + dominant-baseline="middle" — true visual centering
  // (Not approximated centering. Actual mathematical centering. We did the math.)
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Circle background — the colored disc that holds the letter -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#${bgColor}"/>
      <!-- Text — the initial letter, centered horizontally and vertically -->
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
        ${text.charAt(0)      // Take only the first character
              .toUpperCase()  // Always uppercase — consistency across all avatars
              .replace(/&/g, '&amp;')  // Escape & to prevent malformed SVG
              .replace(/</g, '&lt;')   // Escape < to prevent SVG tag injection
              .replace(/>/g, '&gt;')}  // Escape > to prevent SVG tag injection
      </text>
    </svg>
  `.trim() // .trim() removes leading/trailing whitespace — clean SVG output

  // ── Response with Caching Headers ────────────────────────────────────────
  // SVG content type — tell browsers this is an image, not HTML or JSON
  // Cache-Control: public + max-age + immutable — cache this forever at every layer
  // "immutable" tells the browser: don't even bother revalidating. It will never change.
  // CDN-Cache-Control: same instruction for CDN edge nodes (Vercel, Cloudflare, etc.)
  // Vary: Accept — technically correct for content negotiation
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',                                // SVG, not HTML
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`, // Cache everywhere, forever
      'CDN-Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,        // CDN-specific instruction
      'Vary': 'Accept',                                               // Content negotiation header
    },
  })
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — avatar generator, external-dependency avoider, and SVG injection preventer.
// No external calls. No DNS. No TLS handshakes to someone else's server. Just a letter in a circle.
// P.S. — 1-year cache. Same input, same output. Forever. That's the promise.
