import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const API_KEY = process.env.BACKEND_API_KEY

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration: BACKEND_API_KEY is not set' },
      { status: 500 },
    )
  }
  try {
    const form = await req.formData()
    const headers: Record<string, string> = { 'x-api-key': API_KEY }

    const res = await fetch(`${BACKEND_URL}/api/ipfs/upload/file`, {
      method: 'POST',
      headers,
      body: form,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
