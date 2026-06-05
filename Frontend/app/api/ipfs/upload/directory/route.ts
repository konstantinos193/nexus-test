import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const API_KEY = process.env.BACKEND_API_KEY

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const headers: Record<string, string> = {}
    if (API_KEY) headers['x-api-key'] = API_KEY

    const res = await fetch(`${BACKEND_URL}/api/ipfs/upload/directory`, {
      method: 'POST',
      headers,
      body: form,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Directory upload failed' },
      { status: 500 }
    )
  }
}
