/**
 * IPFS Upload API Route - Proxy to Backend
 * Proxies file uploads to the backend IPFS service so the client never sees BACKEND_URL or API key.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/ipfs/upload
 * Expects multipart/form-data with field "file".
 * Proxies to Backend POST /api/ipfs/upload/file and returns { success, data: { hash, path, gatewayUrl, size, pinned } }.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const backendFormData = new FormData()
    backendFormData.append('file', file)

    const headers: HeadersInit = {
      'x-api-key': getBackendApiKey() || '',
    }

    const response = await fetch(`${BACKEND_URL}/api/ipfs/upload/file`, {
      method: 'POST',
      headers,
      body: backendFormData,
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
