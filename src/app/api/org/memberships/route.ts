/**
 * API Route: Get User's Organization Memberships
 * 
 * Returns all organizations the user belongs to with their roles and preferences
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's memberships from user_tenant_memberships table (many-to-many)
    // This is the correct source of truth for multi-org memberships
    // Specify the foreign key relationship explicitly to avoid ambiguity
    const { data: memberships, error: membershipsError } = await supabase
      .from('user_tenant_memberships')
      .select(`
        id,
        user_id,
        tenant_id,
        role,
        status,
        all_locations,
        created_at,
        tenants:tenant_id (
          id,
          name,
          timezone,
          logo_url,
          validation_status,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (membershipsError) {
      console.error('[API] Error fetching memberships:', membershipsError)
      return NextResponse.json(
        { error: 'Failed to fetch memberships' },
        { status: 500 }
      )
    }

    // Transform data for frontend
    const formattedMemberships = (memberships || []).map(m => ({
      id: m.id,
      tenant_id: m.tenant_id,
      tenant_name: (m.tenants as any)?.name || 'Unnamed Organization',
      tenant_logo: (m.tenants as any)?.logo_url || null,
      role: m.role,
      status: m.status || 'active',
      joined_at: m.created_at,
      all_locations: m.all_locations || false,
      validation_status: (m.tenants as any)?.validation_status || 'VALIDATED',
    }))

    return NextResponse.json({
      success: true,
      memberships: formattedMemberships,
      count: formattedMemberships.length,
    })
  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


