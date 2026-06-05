/**
 * Collections Proxy API Route — GET /api/collections/[slug]
 * Frontend proxy that forwards collection requests to the backend API
 * Because calling the backend directly from the browser has CORS concerns
 * and we like clean, single-origin requests. We're principled like that.
 *
 * Architecture:
 * Browser → /api/collections/[slug] (this file) → NestJS Backend → database
 * The browser never talks to the backend directly. This file is the middleman.
 * All backends need a good middleman. This is ours.
 *
 * What this does:
 * 1. Receives a GET request with a slug in the URL path
 * 2. Forwards it to the backend at NEXT_PUBLIC_BACKEND_URL/api/collections/[slug]
 * 3. Returns the backend's response body and status code unchanged
 *
 * What this does NOT do:
 * - Transform the response (passthrough only)
 * - Cache the response (React Query on the client handles caching)
 * - Authenticate the request (public collection data, no auth needed)
 * - Retry on failure (if the backend is down, the client gets the error, as intended)
 *
 * @author Juan - API proxy builder and CORS-avoider
 * (Coded with care, because proxy routes are unsexy but absolutely necessary)
 */

// NextRequest — the typed incoming request object for Next.js API routes
// Gives us access to URL, headers, body, and all the good stuff
// Without this type, we're using untyped Request. We type things. Always.
import { NextRequest, NextResponse } from 'next/server'

// ── Configuration ─────────────────────────────────────────────────────────────
// BACKEND_URL — the base URL of the NestJS backend
// Reads from environment variables so dev/staging/production use different backends
// Defaults to localhost:8000 for local development
// (If you see localhost:8000 in production: something went very wrong with your env config)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// ── GET Handler ───────────────────────────────────────────────────────────────

/**
 * GET - Proxy handler for collection detail requests
 * Forwards GET /api/collections/[slug] to the backend and returns the response
 *
 * The _req parameter is unused but required by the Next.js API route signature
 * (We receive the request, we don't need to inspect it — the slug is in params)
 * Prefixed with underscore to signal intentional non-use to TypeScript and readers alike
 *
 * params is a Promise in Next.js 15 App Router — we must await it
 * This is a breaking change from Next.js 14 where params was a plain object
 * We learned this from a runtime error. The error was not subtle. We fixed it.
 */
export async function GET(
  _req: NextRequest,
  // params is a Promise — Next.js 15 App Router pattern
  // Must be awaited before accessing slug. No exceptions. No shortcuts.
  { params }: { params: Promise<{ slug: string }> }
) {
  // Await and destructure the slug from the route params
  // encodeURIComponent below protects against special characters in slug values
  const { slug } = await params

  // Forward the request to the backend API
  // encodeURIComponent: protects against slugs containing characters that would break the URL
  // Content-Type: application/json — we expect and return JSON
  // No caching headers added here — the client (React Query) manages its own cache
  const res = await fetch(`${BACKEND_URL}/api/collections/${encodeURIComponent(slug)}`, {
    headers: { 'Content-Type': 'application/json' },
    // No next.revalidate here — this is a dynamic proxy, not ISR
    // The server-side fetch in page.tsx uses ISR; this client-facing proxy does not
  })

  // Parse the response body as JSON
  // We trust the backend to return valid JSON — it's our backend, we wrote it
  // (Mostly. Parts of it were written with hope and caffeine.)
  const body = await res.json()

  // Return the backend's response body with the backend's status code
  // Passthrough: 200 stays 200, 404 stays 404, 500 stays 500
  // The client receives exactly what the backend sent. No transformation. No opinions.
  return NextResponse.json(body, { status: res.status })
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — API proxy architect and "CORS is not a suggestion" believer.
// Browser asks. Proxy forwards. Backend answers. Response returns. Clean loop.
// P.S. — If the backend is down, this returns whatever the fetch throws. Handle it on the client.
