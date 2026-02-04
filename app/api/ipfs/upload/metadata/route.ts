/**
 * IPFS Metadata Upload API Route - Proxy to Backend
 * Uploads JSON metadata to IPFS and returns hash, path, gatewayUrl.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/ipfs/upload/metadata
 * Expects JSON body: { metadata: Record<string, unknown>, pin?: boolean }.
 * Proxies to Backend POST /api/ipfs/upload/metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metadata, pin } = body

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { success: false, error: 'metadata object is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/ipfs/upload/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getBackendApiKey() || '',
      },
      body: JSON.stringify({ metadata, pin: pin ?? true }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Backend returned ${response.status}: ${response.statusText}`,
      }))
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || errorData.error || `Upload failed: ${response.status}`,
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
