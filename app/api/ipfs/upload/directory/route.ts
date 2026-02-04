/**
 * IPFS Directory Upload API Route - Proxy to Backend
 * Uploads multiple files as one IPFS directory and returns base_uri for the contract.
 * Form field names = path (e.g. 0.json, 1.png).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/ipfs/upload/directory
 * Expects multipart/form-data: each field name = path (e.g. 0.json, 1.png), value = file.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const backendFormData = new FormData()
    let count = 0
    for (const [path, value] of formData.entries()) {
      if (value instanceof File) {
        backendFormData.append(path, value)
        count += 1
      }
    }
    if (count === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      )
    }

    const headers: HeadersInit = {
      'x-api-key': getBackendApiKey() || '',
    }

    const response = await fetch(`${BACKEND_URL}/api/ipfs/upload/directory`, {
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
