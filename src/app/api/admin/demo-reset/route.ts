import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Demo Reset Endpoint
 * 
 * Clears and re-seeds the demo tenant.
 * Secured with token and demo mode check.
 * 
 * POST /api/admin/demo-reset
 * Header: x-demo-reset-token
 */

export async function POST(request: NextRequest) {
  // Safety check 1: Demo mode must be enabled
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo mode not enabled', ok: false },
      { status: 403 }
    )
  }

  // Safety check 2: Not allowed in production
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Not allowed in production', ok: false },
      { status: 403 }
    )
  }

  // Safety check 3: Require reset token
  const resetToken = request.headers.get('x-demo-reset-token')
  const expectedToken = process.env.DEMO_RESET_TOKEN

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Demo reset token not configured', ok: false },
      { status: 500 }
    )
  }

  if (resetToken !== expectedToken) {
    // Log unauthorized attempt
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    console.warn(`⚠️  Unauthorized demo reset attempt from IP: ${ip}`)
    
    return NextResponse.json(
      { error: 'Invalid reset token', ok: false },
      { status: 403 }
    )
  }

  // Execute demo reset
  try {
    console.log('🔄 Demo reset initiated...')
    
    const { stdout, stderr } = await execAsync('npm run demo:reset')
    
    if (stderr && !stderr.includes('npm WARN')) {
      console.error('Demo reset stderr:', stderr)
    }

    console.log('Demo reset output:', stdout)
    console.log('✅ Demo reset completed successfully')

    return NextResponse.json({
      ok: true,
      message: 'Demo reset successful',
      resetAt: new Date().toISOString(),
      tenantId: process.env.DEMO_TENANT_ID,
    })

  } catch (error) {
    console.error('❌ Demo reset failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Demo reset failed', 
        ok: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check for the endpoint
export async function GET() {
  const demoMode = process.env.DEMO_MODE === 'true'
  const hasToken = !!process.env.DEMO_RESET_TOKEN

  return NextResponse.json({
    endpoint: '/api/admin/demo-reset',
    demoMode,
    configured: hasToken,
    method: 'POST',
    headers: ['x-demo-reset-token'],
  })
}

