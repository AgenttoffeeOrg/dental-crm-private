/**
 * Tenant Context API
 * 
 * GET /api/tenant/context - Get tenant context for current user
 */

import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/services/tenant-context'

export async function GET() {
  try {
    const tenantContext = await getTenantContext()

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'No tenant context found' },
        { status: 404 }
      )
    }

    return NextResponse.json(tenantContext)
  } catch (error: any) {
    console.error('Error getting tenant context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

