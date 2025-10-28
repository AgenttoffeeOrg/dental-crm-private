/**
 * Location Context API
 * 
 * GET /api/locations/context - Get location context for current user
 * Returns active location, accessible locations, and multi-location flag
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's active context
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, active_location_id')
      .eq('id', user.id)
      .single()
    
    if (appUserError || !appUser?.active_tenant_id) {
      return NextResponse.json(
        { error: 'No active tenant context' },
        { status: 404 }
      )
    }
    
    // Get accessible locations
    const { data: locations, error: locationsError } = await supabase.rpc(
      'get_user_accessible_locations',
      {
        p_user_id: user.id,
        p_tenant_id: appUser.active_tenant_id,
      }
    )
    
    if (locationsError) {
      console.error('Error fetching accessible locations:', locationsError)
      return NextResponse.json(
        { error: 'Failed to fetch accessible locations' },
        { status: 500 }
      )
    }
    
    // Determine if multi-location
    const isMultiLocation = (locations?.length || 0) > 1
    
    // Find active location details
    const activeLocation = locations?.find((loc: any) => loc.id === appUser.active_location_id)
    
    return NextResponse.json({
      activeLocation: activeLocation || null,
      accessibleLocations: locations || [],
      isMultiLocation,
      locationCount: locations?.length || 0,
      activeTenantId: appUser.active_tenant_id,
    })
  } catch (error: any) {
    console.error('[API] Error getting location context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

