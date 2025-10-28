import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/onboarding/admin/field-config?stepId=xxx
 * 
 * Returns field configuration for a specific step (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const stepId = searchParams.get('stepId')

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser || !['owner', 'super_admin', 'admin'].includes(appUser.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    // Get field configurations for this step
    const { data: fields, error: fieldsError } = await supabase
      .from('onboarding_field_config')
      .select('*')
      .eq('step_id', stepId)
      .or(`tenant_id.eq.${appUser.tenant_id},tenant_id.is.null`)
      .order('display_order', { ascending: true })

    if (fieldsError) {
      console.error('[API] Error fetching fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to load fields' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      fields: fields || []
    })

  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/admin/field-config:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/onboarding/admin/field-config
 * 
 * Adds a custom field to an onboarding step
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser || !['owner', 'super_admin', 'admin'].includes(appUser.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { stepId, field_name, is_required, help_text, validation_rules, display_order } = body

    if (!stepId || !field_name) {
      return NextResponse.json(
        { error: 'stepId and field_name are required' },
        { status: 400 }
      )
    }

    // Check if field already exists
    const { data: existing } = await supabase
      .from('onboarding_field_config')
      .select('id')
      .eq('step_id', stepId)
      .eq('field_name', field_name)
      .eq('tenant_id', appUser.tenant_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Field already exists for this step' },
        { status: 400 }
      )
    }

    // Insert new field
    const { data: newField, error: insertError } = await supabase
      .from('onboarding_field_config')
      .insert({
        step_id: stepId,
        field_name,
        is_required: is_required || false,
        help_text: help_text || '',
        validation_rules: validation_rules || {},
        display_order: display_order || 999,
        tenant_id: appUser.tenant_id,  // Tenant-specific custom field
        is_custom: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error inserting field:', insertError)
      return NextResponse.json(
        { error: 'Failed to create field' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      field: newField
    })

  } catch (error: any) {
    console.error('[API] Error in POST /api/onboarding/admin/field-config:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/onboarding/admin/field-config
 * 
 * Updates field configurations (required/optional, help text, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser || !['owner', 'super_admin', 'admin'].includes(appUser.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { stepId, fields } = body

    if (!stepId || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'stepId and fields array are required' },
        { status: 400 }
      )
    }

    // Update each field
    for (const field of fields) {
      // First, check if tenant-specific override exists
      const { data: existing } = await supabase
        .from('onboarding_field_config')
        .select('id')
        .eq('step_id', stepId)
        .eq('field_name', field.field_name)
        .eq('tenant_id', appUser.tenant_id)
        .single()

      if (existing) {
        // Update existing tenant-specific config
        await supabase
          .from('onboarding_field_config')
          .update({
            is_required: field.is_required,
            help_text: field.help_text,
            validation_rules: field.validation_rules || {},
            display_order: field.display_order
          })
          .eq('id', existing.id)
      } else {
        // Create tenant-specific override
        await supabase
          .from('onboarding_field_config')
          .insert({
            step_id: stepId,
            field_name: field.field_name,
            is_required: field.is_required,
            help_text: field.help_text,
            validation_rules: field.validation_rules || {},
            display_order: field.display_order,
            tenant_id: appUser.tenant_id
          })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Field configurations updated successfully'
    })

  } catch (error: any) {
    console.error('[API] Error in PUT /api/onboarding/admin/field-config:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/onboarding/admin/field-config
 * 
 * Deletes a custom field (only custom fields can be deleted)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser || !['owner', 'super_admin', 'admin'].includes(appUser.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { stepId, fieldName } = body

    if (!stepId || !fieldName) {
      return NextResponse.json(
        { error: 'stepId and fieldName are required' },
        { status: 400 }
      )
    }

    // Only allow deletion of tenant-specific custom fields
    const { error: deleteError } = await supabase
      .from('onboarding_field_config')
      .delete()
      .eq('step_id', stepId)
      .eq('field_name', fieldName)
      .eq('tenant_id', appUser.tenant_id)
      .eq('is_custom', true)

    if (deleteError) {
      console.error('[API] Error deleting field:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete field' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Field deleted successfully'
    })

  } catch (error: any) {
    console.error('[API] Error in DELETE /api/onboarding/admin/field-config:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
