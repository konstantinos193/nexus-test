import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

/**
 * Next.js API Route - Featured Collections Proxy
 * Proxies requests to the backend featured collections endpoint
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * GET /api/collections/featured
 * Proxies GET requests to the backend featured collections endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const url = `${BACKEND_URL}/api/collections/featured`

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
