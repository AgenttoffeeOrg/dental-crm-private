import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { ActivityUpdateSchema, safeValidateActivity } from '@/schemas/activity.schema'

const ActivityIdSchema = z.object({ id: z.string().uuid('Invalid activity id') })

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error('[API:activity:id] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = ActivityIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const context = await getApiRequestContext()
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: activity, error } = await supabase
      .from('activities')
      .select(
        `
          *,
          contact:contacts(*),
          deal:deals(*),
          agent:app_users(id, full_name, email)
        `
      )
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }
      console.error('[API:activity:id] Failed to fetch activity', error)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (!membership.all_locations && activity.location_id) {
      if (!accessibleLocationIds?.includes(activity.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ activity })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = ActivityIdSchema.safeParse(params)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const payload = await request.json()
    const validation = safeValidateActivity(payload, ActivityUpdateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    const context = await getApiRequestContext()
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: existing, error: existingError } = await supabase
      .from('activities')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const targetLocation = data.location_id ?? existing.location_id ?? null

    if (targetLocation && !membership.all_locations) {
      if (!accessibleLocationIds?.includes(targetLocation)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    if (data.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', data.contact_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found for tenant' }, { status: 404 })
      }
    }

    if (data.deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id')
        .eq('id', data.deal_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found for tenant' }, { status: 404 })
      }
    }

    const updatePayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updatePayload[key] = value
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('activities')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[API:activity:id] Failed to update activity', updateError)
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    return NextResponse.json({ activity: updated })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = ActivityIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const context = await getApiRequestContext()
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: activity } = await supabase
      .from('activities')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (!membership.all_locations && activity.location_id) {
      if (!accessibleLocationIds?.includes(activity.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('activities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[API:activity:id] Failed to delete activity', error)
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}







