/**
 * Health Check API Endpoint
 * Returns the health status of the application
 * Used by CI/CD pipeline to verify deployment success
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if basic app functionality is working
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 503 }
    )
  }
}
