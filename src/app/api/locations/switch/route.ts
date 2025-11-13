/**
 * Location Switch API
 *
 * POST /api/locations/switch - Switch user's active location within current organization
 *
 * ARCHITECTURE:
 * - Validates location belongs to user's active tenant
 * - Validates user has access via membership_locations OR all_locations=true
 * - Persists to app_users.active_location_id
 * - Sets cookie for immediate context
 * - Emits audit event
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { location_id } = body;

    if (!location_id) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
    }

    // Get user's active tenant and role
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, role')
      .eq('id', user.id)
      .single();

    if (appUserError || !appUser || !appUser.active_tenant_id) {
      return NextResponse.json(
        { error: 'No active organization. Please switch to an organization first.' },
        { status: 400 }
      );
    }

    const active_tenant_id = appUser.active_tenant_id;
    const isSuperAdmin = appUser.role === 'super_admin' || appUser.role === 'owner';

    // VALIDATION 1: Verify location exists and belongs to active tenant
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, tenant_id, name, is_active')
      .eq('id', location_id)
      .single();

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.tenant_id !== active_tenant_id) {
      return NextResponse.json(
        { error: 'Location does not belong to your active organization' },
        { status: 403 }
      );
    }

    if (!location.is_active) {
      return NextResponse.json({ error: 'Location is inactive' }, { status: 400 });
    }

    // VALIDATION 2: Verify user has access to this location
    // Super admins/owners have access to all locations
    let hasAccess = isSuperAdmin;

    if (!hasAccess) {
      // Check if user has all_locations=true OR explicit access via membership_locations
      const { data: membership, error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .select('id, all_locations')
        .eq('user_id', user.id)
        .eq('tenant_id', active_tenant_id)
        .eq('status', 'active')
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'No active membership found for current organization' },
          { status: 403 }
        );
      }

      // If user has all_locations=true, they can access any location
      hasAccess = membership.all_locations === true;

      // Otherwise, check membership_locations table
      if (!hasAccess) {
        const { data: locationAccess, error: accessError } = await supabase
          .from('membership_locations')
          .select('id')
          .eq('membership_id', membership.id)
          .eq('location_id', location_id)
          .eq('is_active', true)
          .single();

        if (accessError || !locationAccess) {
          return NextResponse.json(
            { error: 'Access denied: You do not have permission to access this location' },
            { status: 403 }
          );
        }

        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this location' }, { status: 403 });
    }

    // Get current location for audit trail
    const { data: currentAppUser } = await supabase
      .from('app_users')
      .select('active_location_id')
      .eq('id', user.id)
      .single();

    const from_location_id = currentAppUser?.active_location_id || null;

    // PERSIST: Update app_users.active_location_id
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        active_location_id: location_id,
        last_context_switch_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[API] Error updating active_location_id:', updateError);
      return NextResponse.json({ error: 'Failed to switch location' }, { status: 500 });
    }

    // Set cookie for immediate context
    const cookieStore = await cookies();
    cookieStore.set('active_location_id', location_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // AUDIT: Log location switch event
    try {
      await supabase.from('audits').insert({
        tenant_id: active_tenant_id,
        location_id: location_id,
        user_id: user.id,
        action: 'user.location_switched',
        resource_type: 'location',
        resource_id: location_id,
        metadata: {
          from_location_id,
          to_location_id: location_id,
          location_name: location.name,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditError) {
      // Don't fail the request if audit fails
      console.error('[API] Failed to write audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      location_id,
      location_name: location.name,
      message: `Switched to ${location.name}`,
    });
  } catch (error: any) {
    console.error('[API] Unexpected error in location switch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
