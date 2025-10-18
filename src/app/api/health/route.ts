/**
 * Health Check Endpoint
 * 
 * This endpoint is used by Railway and monitoring services
 * to verify that the application is running properly.
 * 
 * Returns:
 * - 200 OK with JSON payload when healthy
 * - Fast response time (no DB calls)
 * - Uptime and timestamp for diagnostics
 */

import { NextResponse } from 'next/server'

// Track process start time
const startTime = Date.now()

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const uptime = Math.floor((Date.now() - startTime) / 1000) // seconds
    const timestamp = new Date().toISOString()
    
    return NextResponse.json(
      {
        ok: true,
        status: 'healthy',
        uptime,
        timestamp,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    // Even if something fails, return a response
    console.error('Health check error:', error)
    
    return NextResponse.json(
      {
        ok: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

// Support HEAD requests for simple health checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

