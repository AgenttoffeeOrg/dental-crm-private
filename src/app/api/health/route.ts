import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint for Railway
 * 
 * This endpoint is used by Railway to monitor application health.
 * It returns a simple JSON response with application status.
 * 
 * NO DATABASE CALLS - this must be fast and not depend on external services.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';
  const version = process.env.npm_package_version || '1.0.0';

  return NextResponse.json({
    ok: true,
    status: 'healthy',
    uptime: Math.floor(uptime),
    timestamp,
    environment,
    version,
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

