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

    // Return null/empty context instead of 404 for users without tenants
    // This is expected behavior for users who haven't created an org yet
    if (!tenantContext) {
      return NextResponse.json({
        primaryTenant: null,
        accessibleTenants: [],
        isMultiLocation: false,
        locationCount: 0,
        dentalGroup: null
      })
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

