/**
 * Individual Contact API Route
 * 
 * Handles single contact operations:
 * - GET /api/contacts/[id] - Get contact by ID
 * - PATCH /api/contacts/[id] - Update contact
 * - DELETE /api/contacts/[id] - Delete contact
 * 
 * @module api/contacts/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ContactUpdateSchema, ContactIdSchema, safeValidateContact } from '@/schemas/contact.schema'

/**
 * GET /api/contacts/[id]
 * Get a single contact by ID
 * 
 * SECURITY:
 * - Uses active_tenant_id for organization context
 * - Verifies location access before returning contact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Validate ID format
    const idValidation = safeValidateContact({ id: params.id }, ContactIdSchema)
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid contact ID format' },
        { status: 400 }
      )
    }

    // ✅ SECURITY: Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ CONTEXT: Get active tenant and location from user
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, active_location_id')
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser || !appUser.active_tenant_id) {
      console.error('[API] Error fetching app user:', appUserError)
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      )
    }

    // Fetch contact with tenant filter
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', appUser.active_tenant_id)
      .single()

    if (error || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // ✅ LOCATION ACCESS: Verify user has access to contact's location
    if (contact.location_id) {
      const { data: membership } = await supabase
        .from('user_tenant_memberships')
        .select('all_locations')
        .eq('user_id', user.id)
        .eq('tenant_id', appUser.active_tenant_id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      // If user doesn't have all_locations, verify they have access to this specific location
      if (!membership.all_locations) {
        const { data: hasAccess } = await supabase.rpc(
          'user_has_location_access_rls',
          {
            p_user_id: user.id,
            p_tenant_id: appUser.active_tenant_id,
            p_location_id: contact.location_id
          }
        )

        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Contact not found' }, // Don't reveal it exists
            { status: 404 }
          )
        }
      }
    }

    return NextResponse.json({ contact })

  } catch (error) {
    console.error('[API] Error in GET /api/contacts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/contacts/[id]
 * Update a contact (partial update)
 * 
 * SECURITY:
 * - Uses active_tenant_id for organization context
 * - Verifies location access before updating
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Validate ID format
    const idValidation = safeValidateContact({ id: params.id }, ContactIdSchema)
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid contact ID format' },
        { status: 400 }
      )
    }

    // ✅ SECURITY: Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ CONTEXT: Get active tenant and location from user
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, active_location_id')
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser || !appUser.active_tenant_id) {
      console.error('[API] Error fetching app user:', appUserError)
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = safeValidateContact(body, ContactUpdateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors 
        },
        { status: 400 }
      )
    }

    // Check if contact exists and belongs to tenant
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', appUser.active_tenant_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // ✅ LOCATION ACCESS: Verify user has access to contact's location
    if (existing.location_id) {
      const { data: membership } = await supabase
        .from('user_tenant_memberships')
        .select('all_locations')
        .eq('user_id', user.id)
        .eq('tenant_id', appUser.active_tenant_id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      if (!membership.all_locations) {
        const { data: hasAccess } = await supabase.rpc(
          'user_has_location_access_rls',
          {
            p_user_id: user.id,
            p_tenant_id: appUser.active_tenant_id,
            p_location_id: existing.location_id
          }
        )

        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Contact not found' },
            { status: 404 }
          )
        }
      }
    }

    // Update contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', params.id)
      .eq('tenant_id', appUser.active_tenant_id)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating contact:', error)
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({ contact, updated: true })

  } catch (error) {
    console.error('[API] Error in PATCH /api/contacts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/contacts/[id]
 * Delete a contact
 * 
 * SECURITY:
 * - Uses active_tenant_id for organization context
 * - Verifies location access before deleting
 * - Requires admin permissions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Validate ID format
    const idValidation = safeValidateContact({ id: params.id }, ContactIdSchema)
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid contact ID format' },
        { status: 400 }
      )
    }

    // ✅ SECURITY: Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ CONTEXT: Get active tenant and user role
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, active_location_id, role')
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser || !appUser.active_tenant_id) {
      console.error('[API] Error fetching app user:', appUserError)
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      )
    }

    // Check permissions (only admins and above can delete)
    if (!['admin', 'super_admin', 'owner'].includes(appUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if contact exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', appUser.active_tenant_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // ✅ LOCATION ACCESS: Verify user has access to contact's location
    if (existing.location_id) {
      const { data: membership } = await supabase
        .from('user_tenant_memberships')
        .select('all_locations')
        .eq('user_id', user.id)
        .eq('tenant_id', appUser.active_tenant_id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      if (!membership.all_locations) {
        const { data: hasAccess } = await supabase.rpc(
          'user_has_location_access_rls',
          {
            p_user_id: user.id,
            p_tenant_id: appUser.active_tenant_id,
            p_location_id: existing.location_id
          }
        )

        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Contact not found' },
            { status: 404 }
          )
        }
      }
    }

    // Delete contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', appUser.active_tenant_id)

    if (error) {
      console.error('[API] Error deleting contact:', error)
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: true })

  } catch (error) {
    console.error('[API] Error in DELETE /api/contacts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

