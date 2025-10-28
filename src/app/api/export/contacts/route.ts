/**
 * Export Contacts API
 * 
 * SECURITY: Uses authenticated user context, not client-supplied tenant_id
 * Respects location-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // ✅ SECURITY: Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ SECURITY: Get active tenant from user context (NOT from query params)
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, active_location_id')
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser || !appUser.active_tenant_id) {
      console.error('[EXPORT] Error fetching app user:', appUserError)
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      )
    }

    // ✅ SECURITY: Check if user has all_locations access
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .select('all_locations')
      .eq('user_id', user.id)
      .eq('tenant_id', appUser.active_tenant_id)
      .eq('status', 'active')
      .single()

    if (membershipError) {
      console.error('[EXPORT] Error fetching membership:', membershipError)
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build query with tenant filter
    let contactsQuery = supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', appUser.active_tenant_id)
      .order('created_at', { ascending: false })

    // ✅ LOCATION FILTERING: If user doesn't have all_locations, filter by accessible locations
    if (!membership.all_locations) {
      const { data: accessibleLocations, error: locationsError } = await supabase.rpc(
        'get_user_accessible_locations',
        {
          p_user_id: user.id,
          p_tenant_id: appUser.active_tenant_id
        }
      )

      if (locationsError) {
        console.error('[EXPORT] Error fetching accessible locations:', locationsError)
        return NextResponse.json(
          { error: 'Failed to determine accessible locations' },
          { status: 500 }
        )
      }

      if (!accessibleLocations || accessibleLocations.length === 0) {
        // User has no location access - return empty export
        return new NextResponse('', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=contacts_${new Date().toISOString().split('T')[0]}.csv`
          }
        })
      }

      // Filter by accessible location IDs
      const locationIds = accessibleLocations.map((l: any) => l.id)
      contactsQuery = contactsQuery.in('location_id', locationIds)
    }

    // Execute query
    const { data: contacts, error } = await contactsQuery

    if (error) {
      console.error('[EXPORT] Error fetching contacts:', error)
      throw error
    }

    // Convert to CSV
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Status', 'Location', 'Created At']
    const rows = contacts.map(c => [
      c.first_name || '',
      c.last_name || '',
      c.primary_email || '',
      c.primary_phone || '',
      c.source || '',
      c.status || '',
      c.location_id || '',
      new Date(c.created_at).toLocaleDateString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // ✅ TODO: Add audit log entry for export
    // await supabase.from('audits').insert({
    //   user_id: user.id,
    //   tenant_id: appUser.active_tenant_id,
    //   event_type: 'contacts.exported',
    //   metadata: { count: contacts.length, location_filtered: !membership.all_locations }
    // })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=contacts_${new Date().toISOString().split('T')[0]}.csv`
      }
    })
  } catch (error: any) {
    console.error('[EXPORT] Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



