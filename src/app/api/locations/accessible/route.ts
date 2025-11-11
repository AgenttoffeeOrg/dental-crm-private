/**
 * Accessible Locations API
 * 
 * GET /api/locations/accessible - Get all locations accessible to current user
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getLocationsForSwitcher } from '@/lib/services/tenant-context'

export async function GET(request: NextRequest) {
  try {
    const locations = await getLocationsForSwitcher(request)
    
    return NextResponse.json({
      locations,
      count: locations.length,
    })
  } catch (error: any) {
    console.error('Error fetching accessible locations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

