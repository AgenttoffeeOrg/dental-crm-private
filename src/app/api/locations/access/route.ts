/**
 * Location Access API
 * 
 * GET /api/locations/access - Get user's location access
 * POST /api/locations/access - Grant location access to a user
 * DELETE /api/locations/access - Revoke location access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { 
  getUserLocationAccess,
  grantLocationAccess,
  revokeLocationAccess,
} from '@/lib/services/location-access-service'
import { FeatureFlags } from '@/lib/feature-flags'

/**
 * GET /api/locations/access
 * Get location access for current user or specified user
 */
export async function GET(request: NextRequest) {
  try {
    if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
      return NextResponse.json(
        { error: 'Multi-location feature is not enabled' },
        { status: 403 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get userId from query (for admins viewing other users)
    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('userId') || user.id
    
    // Get location access
    const access = await getUserLocationAccess(targetUserId)
    
    return NextResponse.json({
      access,
    })
  } catch (error: any) {
    console.error('Error fetching location access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/locations/access
 * Grant user access to a location
 */
export async function POST(request: NextRequest) {
  try {
    if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
      return NextResponse.json(
        { error: 'Multi-location feature is not enabled' },
        { status: 403 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const body = await request.json()
    const { user_id, tenant_id, notes } = body
    
    if (!user_id || !tenant_id) {
      return NextResponse.json(
        { error: 'user_id and tenant_id are required' },
        { status: 400 }
      )
    }
    
    // Grant access
    const result = await grantLocationAccess(
      user_id,
      tenant_id,
      user.id,
      notes
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      access_id: result.access_id,
    })
  } catch (error: any) {
    console.error('Error granting location access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/locations/access
 * Revoke user access to a location
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
      return NextResponse.json(
        { error: 'Multi-location feature is not enabled' },
        { status: 403 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const body = await request.json()
    const { user_id, tenant_id, reason } = body
    
    if (!user_id || !tenant_id) {
      return NextResponse.json(
        { error: 'user_id and tenant_id are required' },
        { status: 400 }
      )
    }
    
    // Revoke access
    const result = await revokeLocationAccess(
      user_id,
      tenant_id,
      user.id,
      reason
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Error revoking location access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

