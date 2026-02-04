/**
 * IPFS Bulk Upload API Route - Proxy to Backend
 * Accepts multiple files (e.g. from folder drop) and proxies to backend POST /api/ipfs/upload/files.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiKey } from '@/lib/api/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/ipfs/upload/files
 * Expects multipart/form-data with field "files" (array of File).
 * Proxies to Backend POST /api/ipfs/upload/files.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files').filter((f): f is File => f instanceof File)

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      )
    }

    const backendFormData = new FormData()
    for (const file of files) {
      backendFormData.append('files', file)
    }

    const headers: HeadersInit = {
      'x-api-key': getBackendApiKey() || '',
    }

    const response = await fetch(`${BACKEND_URL}/api/ipfs/upload/files`, {
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
