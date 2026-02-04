import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

/**
 * Next.js API Route - Discover Collections Proxy
 * Proxies requests to the backend discover collections endpoint
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * GET /api/collections/discover
 * Proxies GET requests to the backend discover collections endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tab = searchParams.get('tab') || 'trending'
    
    // Validate tab parameter
    const validTabs = ['trending', 'new', 'ending_soon', 'free_mint']
    if (!validTabs.includes(tab)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid tab parameter. Must be one of: ${validTabs.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const url = `${BACKEND_URL}/api/collections/discover?tab=${tab}`

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
