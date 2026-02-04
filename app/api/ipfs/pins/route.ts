/**
 * IPFS Pins API Route - Proxy to Backend
 * GET /api/ipfs/pins returns all pinned CIDs (files we've posted to IPFS).
 * Public endpoint; no API key required.
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * GET /api/ipfs/pins
 * Proxies to Backend GET /api/ipfs/pins.
 * Returns { success, data: { pins: Array<{ cid, type, gatewayUrl }> } }.
 */
export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ipfs/pins`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Backend returned ${response.status}: ${response.statusText}`,
      }))
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || errorData.error || `Failed to list pins: ${response.status}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      },
      { status: 500 }
    )
  }
}
