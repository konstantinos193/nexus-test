import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

/**
 * Next.js API Route - Collections Proxy
 * Proxies requests to the backend API to hide the backend URL
 * Because we don't want to expose our backend URL to the client
 * (Security through obscurity? Maybe. But also CORS and stuff)
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * GET /api/collections
 * Proxies GET requests to the backend collections endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    const url = `${BACKEND_URL}/api/collections${queryString ? `?${queryString}` : ''}`

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
      // Don't cache on the proxy level
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
