/**
 * Health Check API Route — GET /api/health
 * Returns the current health status of the Next.js frontend application
 * Used by CI/CD pipelines, uptime monitors, load balancers, and anxious developers
 *
 * "Is the app alive?" This endpoint answers that question.
 * A 200 with status: "healthy" means yes. A 503 means no. Simple. Honest.
 * (The app is almost always healthy. The backend is a different story.)
 *
 * What gets checked here:
 * - Basic response generation (if we get here, Next.js is running)
 * - process.uptime() (how long the Node process has been alive)
 * - NODE_ENV (are we in production? development? the void?)
 * - npm_package_version (what version is deployed?)
 *
 * What does NOT get checked here:
 * - Database connectivity (that's the backend's problem)
 * - Solana RPC health (also the backend's problem)
 * - Whether the collectors are minting (definitely not our problem)
 * - Whether Juan had coffee today (irrelevant to application health. Usually.)
 *
 * @author Juan - Health check author and "is the app alive?" first responder
 * (Coded with care, because a good health endpoint is worth its weight in uptime)
 */

// NextResponse — the Next.js response helper for API routes
// Provides .json() for typed JSON responses with automatic Content-Type headers
// Without this we'd be constructing Response objects manually. We've done that. It's worse.
import { NextResponse } from 'next/server'

// ── GET Handler ───────────────────────────────────────────────────────────────

/**
 * GET - The health check handler
 * Returns 200 with health metrics when the app is functioning
 * Returns 503 when something unexpected goes wrong during health reporting
 *
 * Called by:
 * - CI/CD pipelines confirming deployment success (the intended use)
 * - Load balancers verifying the instance is ready for traffic
 * - Uptime monitoring services (Datadog, UptimeRobot, etc.)
 * - Developers refreshing /api/health at 2 AM wondering if the deploy worked
 *
 * If THIS endpoint throws an error: something is deeply wrong with the Node process
 * A healthy app generating a health response should never fail. That's the point.
 */
export async function GET() {
  try {
    // ── Health Response Object ────────────────────────────────────────────
    // All the fields that matter for "is this app instance healthy?"
    // Lightweight: no DB calls, no external requests, no Solana RPC pings
    // Just process-level introspection. Fast. Always available.
    const health = {
      // status — the boolean summary as a string
      // "healthy" = everything is fine. "unhealthy" = see the 503 response below.
      // CI/CD pipelines parse this field specifically. Keep it simple.
      status: 'healthy',

      // timestamp — when this health check was generated
      // ISO 8601 format because we're not animals
      // Useful for: "was this response cached?" and "is the server clock sane?"
      timestamp: new Date().toISOString(),

      // uptime — how long the Node.js process has been running, in seconds
      // process.uptime() returns a float; consumers should Math.floor() if they want integers
      // Useful for: detecting recent restarts, identifying memory leak patterns over time
      uptime: process.uptime(),

      // environment — NODE_ENV, because "is this production?" is always relevant
      // Defaults to 'development' because an undefined NODE_ENV is a local environment
      // (Nobody deploys without setting NODE_ENV. We assume. We verify anyway.)
      environment: process.env.NODE_ENV || 'development',

      // version — the package.json version of the deployed app
      // npm_package_version is set automatically by npm/pnpm at runtime
      // Allows CI/CD to confirm "the right version is deployed" after a release
      // Defaults to '1.0.0' because an unknown version is still version something
      version: process.env.npm_package_version || '1.0.0'
    }

    // Return the health object with HTTP 200 — "app is alive and well"
    // Content-Type: application/json is set automatically by NextResponse.json()
    return NextResponse.json(health, { status: 200 })

  } catch (error) {
    // ── Error Response ────────────────────────────────────────────────────
    // If we somehow get here, something went wrong during health check generation
    // This is deeply ironic — a health check that can't check health
    // Return 503 Service Unavailable with whatever error message we can extract

    return NextResponse.json(
      {
        // status — "unhealthy" signals the pipeline to fail the health check
        status: 'unhealthy',

        // timestamp — still useful even in error response
        // At least confirms when the failure happened
        timestamp: new Date().toISOString(),

        // error — the error message for debugging
        // Error instanceof check because sometimes it's a string, sometimes it's an object
        // We handle both. Defensively. As Juan does.
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      // 503 Service Unavailable — the correct HTTP status for "app is not healthy"
      // Load balancers use this to route away from unhealthy instances
      { status: 503 }
    )
  }
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — health check author and "click and pray is not a deployment strategy" believer.
// 200 means healthy. 503 means unhealthy. Simple. Clean. CI-friendly.
// P.S. — If this endpoint returns 503, something has gone very wrong. Check the logs. Then panic calmly.
