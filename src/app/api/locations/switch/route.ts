/**
 * Location Switch API
 * 
 * POST /api/locations/switch - Switch user's active location
 */

import { NextRequest, NextResponse } from 'next/server'
import { switchActiveLocation } from '@/lib/services/tenant-context'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id } = body
    
    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      )
    }
    
    const result = await switchActiveLocation(tenant_id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Location switched successfully',
    })
  } catch (error: any) {
    console.error('Error switching location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

