import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { TaskUpdateSchema, safeValidateTask } from '@/schemas/task.schema'

const TaskIdSchema = z.object({ id: z.string().uuid('Invalid task id') })

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error('[API:task:id] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = TaskIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: task, error } = await supabase
      .from('tasks')
      .select(
        `
          *,
          contact:contacts(*),
          deal:deals(*),
          assignee:app_users(id, full_name, email)
        `
      )
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      console.error('[API:task:id] Failed to fetch task', error)
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
    }

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!membership.all_locations && task.location_id) {
      if (!accessibleLocationIds?.includes(task.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ task })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = TaskIdSchema.safeParse(params)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
    }

    const payload = await request.json()
    const validation = safeValidateTask(payload, TaskUpdateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user, activeLocationId, membership, accessibleLocationIds } = context

    const { data: existing, error: existingError } = await supabase
      .from('tasks')
      .select('id, location_id, contact_id, deal_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Resolve location: explicit > inherited from contact/deal > existing > active location
    let resolvedLocationId = data.location_id ?? existing.location_id ?? activeLocationId ?? null

    // If contact_id is being updated, inherit location from new contact
    const contactIdToCheck = data.contact_id ?? existing.contact_id
    if (contactIdToCheck && !data.location_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, tenant_id, location_id')
        .eq('id', contactIdToCheck)
        .eq('tenant_id', tenantId)
        .single()

      if (contact && contact.location_id) {
        resolvedLocationId = resolvedLocationId ?? contact.location_id
      }
    }

    // If deal_id is being updated, inherit location from new deal
    const dealIdToCheck = data.deal_id ?? existing.deal_id
    if (dealIdToCheck && !data.location_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, tenant_id, location_id')
        .eq('id', dealIdToCheck)
        .eq('tenant_id', tenantId)
        .single()

      if (deal && deal.location_id) {
        resolvedLocationId = resolvedLocationId ?? deal.location_id
      }
    }

    // Validate location access
    if (resolvedLocationId && !membership.all_locations) {
      if (!accessibleLocationIds?.includes(resolvedLocationId)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    // Validate contact if being updated
    if (data.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, tenant_id, location_id')
        .eq('id', data.contact_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found for tenant' }, { status: 404 })
      }

      // If contact has location and no explicit location provided, inherit it
      if (contact.location_id && !data.location_id) {
        resolvedLocationId = resolvedLocationId ?? contact.location_id
      }
    }

    // Validate deal if being updated
    if (data.deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, tenant_id, location_id')
        .eq('id', data.deal_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found for tenant' }, { status: 404 })
      }

      // If deal has location and no explicit location provided, inherit it
      if (deal.location_id && !data.location_id) {
        resolvedLocationId = resolvedLocationId ?? deal.location_id
      }
    }

    if (data.assignee_user_id) {
      const { data: assignee } = await supabase
        .from('user_tenant_memberships')
        .select('id')
        .eq('user_id', data.assignee_user_id)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single()

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not in tenant' }, { status: 400 })
      }
    }

    const updatePayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updatePayload[key] = value
      }
    }

    // 2b.63 — Free-floating tasks (no location) are allowed per the
    // product spec, same change applied to POST in 2b.58. Don't
    // hard-400 when no location resolves; only write it when known.
    if (resolvedLocationId) {
      updatePayload.location_id = resolvedLocationId
    }

    const { data: updated, error: updateError } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[API:task:id] Failed to update task', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json({ task: updated })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = TaskIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const { data: task } = await supabase
      .from('tasks')
      .select('id, location_id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!membership.all_locations && task.location_id) {
      if (!accessibleLocationIds?.includes(task.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[API:task:id] Failed to delete task', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}



