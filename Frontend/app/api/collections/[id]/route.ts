import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

/**
 * Next.js API Route - Single Collection Proxy
 * Proxies requests to the backend single collection endpoint
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * GET /api/collections/[id]
 * Proxies GET requests to the backend. [id] can be UUID or slug (e.g. nexus-genesis).
 * Slugs are clean and human-readable - no ugly hashes here!
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection ID or slug is required',
        },
        { status: 400 }
      )
    }

    const url = `${BACKEND_URL}/api/collections/${encodeURIComponent(id)}`

    // Prepare headers for backend request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add backend API key if configured
    const backendApiKey = getBackendApiKey()
    if (backendApiKey) {
      headers['x-api-key'] = backendApiKey
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Backend returned ${response.status}: ${response.statusText}`,
      }))
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `Request failed with status ${response.status}`,
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
