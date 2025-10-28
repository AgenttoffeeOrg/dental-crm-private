/**
 * API Route: Organization Preferences
 * 
 * GET: Fetch user's preferences for a specific organization
 * POST: Update user's preferences (pin, favorite, custom display name)
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

    // Get tenant_id from query params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    // Fetch preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_org_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (prefError && prefError.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      console.error('[API] Error fetching preferences:', prefError)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preferences: preferences || {
        is_pinned: false,
        is_favorite: false,
        custom_display_name: null,
        last_accessed_at: null,
        access_count: 0,
      },
    })
  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json()
    const { tenant_id, is_pinned, is_favorite, custom_display_name } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    // Verify user has access to this tenant
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied: You are not a member of this organization' },
        { status: 403 }
      )
    }

    // If pinning, check pin limit (max 5)
    if (is_pinned === true) {
      const { data: pinnedOrgs } = await supabase
        .from('user_org_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_pinned', true)

      if (pinnedOrgs && pinnedOrgs.length >= 5) {
        return NextResponse.json(
          { error: 'You can only pin up to 5 organizations. Unpin one first.' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: any = {
      user_id: user.id,
      tenant_id: tenant_id,
    }

    if (is_pinned !== undefined) updateData.is_pinned = is_pinned
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite
    if (custom_display_name !== undefined) updateData.custom_display_name = custom_display_name

    // Upsert preferences
    const { data, error: upsertError } = await supabase
      .from('user_org_preferences')
      .upsert(updateData, {
        onConflict: 'user_id,tenant_id',
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[API] Error upserting preferences:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preferences: data,
      message: 'Preferences updated successfully',
    })
  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


