/**
 * Banner Image API Route — GET /api/images/banner
 * Server-side SVG placeholder banner generation — fast, branded, zero external dependencies
 * Because waiting 300ms for placehold.co to render a colored rectangle is not a trade-off we accept
 *
 * What this does:
 * Generates a gradient SVG banner with the collection name centered over it
 * Returns it with aggressive 1-year cache headers because placeholders are deterministic
 * Same collection ID and name always produce the same banner. Cache it. Ship it.
 *
 * The placeholder pipeline:
 * 1. Collection has a real bannerUrl → use the real image (not this route)
 * 2. Collection has no bannerUrl → this route generates a placeholder
 * 3. This route is called from CollectionCard, CollectionHero, and anywhere else that needs a banner
 *
 * Why not placehold.co / picsum / lorempixel?
 * - External DNS lookups add latency (~100ms) on every cold request
 * - External services go down. They have outages. Our placeholders never have outages.
 * - CDN caching is simpler for first-party routes vs. third-party resources
 * - We can brand the placeholder (gradient palette, collection name) — they can't
 * - Works offline in development. Always. No internet required to see a colored rectangle.
 *
 * Query parameters:
 * - id: collection identifier used to deterministically select a color palette (default: '0')
 * - name: the collection name displayed in the banner center (default: 'Collection')
 * - w: banner width in pixels (default: 1200)
 * - h: banner height in pixels (default: 400)
 *
 * @author Juan - Banner generator, external-dependency eliminator, and placeholder purist
 * (Coded with care, because even placeholder images deserve to be fast and pretty)
 */

// NextRequest — typed request object for reading URL search params
// NextResponse — response helper with full header control
// new NextResponse(svg, options) for SVG responses (not NextResponse.json() — that's for JSON)
import { NextRequest, NextResponse } from 'next/server'

// getBannerPalette — deterministic color palette selector based on collection ID
// Returns [bgColor, textColor] hex strings (without # prefix) for the given ID
// The same ID always returns the same palette — determinism is the feature
// Without this utility we'd hash the ID ourselves. It does it for us. We're grateful.
import { getBannerPalette } from '@/lib/utils/placeholderBanners'

// ── Configuration ─────────────────────────────────────────────────────────────
// Cache for 1 year — these banners are deterministic placeholders
// The output is always the same for the same inputs. Cache it everywhere. Cache it always.
// (If a collection gets a real banner, it stops hitting this route. The cache is moot for those.)
const CACHE_MAX_AGE = 31536000 // 1 year in seconds. 365 × 24 × 3600. The math checks out.

// ── GET Handler ───────────────────────────────────────────────────────────────

/**
 * GET - Placeholder banner SVG generation handler
 * Reads query params, generates a gradient SVG banner, returns it with cache headers
 *
 * Example requests:
 * /api/images/banner?id=42&name=CryptoKitties&w=1200&h=630
 * → 1200×630 gradient banner with "CryptoKitties" centered, palette derived from id=42
 *
 * /api/images/banner?id=7&name=Degen%20Apes
 * → 1200×400 gradient banner (default size) for collection id=7
 *
 * The collection name is HTML-escaped to prevent SVG injection
 * (Someone WILL name their collection "<script>evil</script>". We handle that preemptively.)
 */
export async function GET(request: NextRequest) {
  // Extract query parameters — all have defaults so minimal input is required
  const searchParams = request.nextUrl.searchParams

  // id — the collection identifier for deterministic palette selection
  // String '0' as default — palette 0 is the first in the series, always defined
  // The ID doesn't need to be numeric; getBannerPalette hashes it anyway
  const id = searchParams.get('id') || '0'

  // name — the collection name to display centered on the banner
  // Used as the visual label: "This is what you're looking at"
  // Default 'Collection' for cases where no name is provided (shouldn't happen, but handled)
  const name = searchParams.get('name') || 'Collection'

  // width — banner width in pixels, parsed as integer
  // 1200px default: the standard OG image width, also good for card banners
  const width = parseInt(searchParams.get('w') || '1200', 10)

  // height — banner height in pixels, parsed as integer
  // 400px default: a typical collection card banner ratio (3:1)
  // For OG images: pass h=630 to get the 1.91:1 standard ratio
  const height = parseInt(searchParams.get('h') || '400', 10)

  // ── Color Palette ─────────────────────────────────────────────────────────
  // getBannerPalette returns [bgColor, textColor] based on the collection ID
  // bgColor: the gradient base color. textColor: the text/label color over it.
  // Deterministic: id=42 always returns the same [bgColor, textColor] pair
  // Array destructuring for clean variable assignment
  const [bgColor, textColor] = getBannerPalette(id)

  // ── SVG Generation ────────────────────────────────────────────────────────
  // Build the gradient banner SVG
  // Gradient: diagonal (x1=0%,y1=0% to x2=100%,y2=100%) with three stops
  // Stop 1: full opacity base color
  // Stop 2: slightly transparent (dd suffix = ~87% opacity) — mid-fade
  // Stop 3: more transparent (aa suffix = ~67% opacity) — end-fade
  // This creates a subtle directional gradient that looks designed, not default
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Diagonal gradient definition — gives the banner depth and visual interest -->
        <!-- Same base color across all stops but with varying opacity -->
        <!-- The result: a monochromatic gradient that's distinct but not garish -->
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   style="stop-color:#${bgColor};stop-opacity:1" />
          <stop offset="50%"  style="stop-color:#${bgColor}dd;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${bgColor}aa;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Background rectangle — fills the entire SVG with the gradient -->
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <!-- Collection name text — centered horizontally and vertically -->
      <!-- Font size: smaller of (width÷15) or 48px — scales with banner width up to 48px cap -->
      <!-- font-weight 600 (semibold) — readable at any size without looking heavy -->
      <!-- opacity 0.9 — slightly softened to look integrated, not stamped on -->
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
        ${name
          .replace(/&/g, '&amp;')   // Escape & — prevents malformed SVG XML
          .replace(/</g, '&lt;')    // Escape < — prevents SVG tag injection attacks
          .replace(/>/g, '&gt;')}   // Escape > — close the injection prevention triangle
      </text>
    </svg>
  `.trim() // .trim() removes leading/trailing whitespace for clean SVG output

  // ── Response with Caching Headers ────────────────────────────────────────
  // Content-Type: image/svg+xml — critical. Without it, browsers render the SVG as XML text.
  // Cache-Control: public + max-age + immutable — cache this at every layer, forever
  // "immutable" tells browsers: don't even revalidate. The output will not change.
  // CDN-Cache-Control: same signal for CDN edge nodes — Vercel, Cloudflare, whatever is in front
  // Vary: Accept — correct for content negotiation, even if we only serve one format
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',                                // SVG, not HTML, not JSON
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`, // 1 year, everywhere, forever
      'CDN-Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,        // Explicit CDN instruction
      'Vary': 'Accept',                                               // Content negotiation
    },
  })
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — banner generator, placehold.co escapee, and SVG injection preventer.
// No DNS lookups. No TLS handshakes to external servers. No outage dependencies.
// Just a colored gradient with a name on it. Fast. Branded. Deterministic. Juan-approved.
// P.S. — If a collection has a real banner, they never see this. We're the understudy. We're okay with that.
