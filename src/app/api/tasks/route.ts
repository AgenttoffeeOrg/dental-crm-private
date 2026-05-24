import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { TaskCreateSchema, TaskQuerySchema, safeValidateTask } from '@/schemas/task.schema'

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext()
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const rawParams = Object.fromEntries(request.nextUrl.searchParams)
    const validation = safeValidateTask(rawParams, TaskQuerySchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const {
      status,
      priority,
      task_type,
      assignee_user_id,
      contact_id,
      deal_id,
      location_id,
      due_before,
      due_after,
      limit,
      offset,
    } = validation.data

    let query = supabase
      .from('tasks')
      .select(
        `
          id,
          tenant_id,
          title,
          description,
          status,
          priority,
          task_type,
          assignee_user_id,
          due_at,
          contact_id,
          deal_id,
          location_id,
          auto_created,
          created_at,
          updated_at
        `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)

    if (!membership.all_locations) {
      if (!accessibleLocationIds || accessibleLocationIds.length === 0) {
        return NextResponse.json({
          tasks: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
        })
      }

      query = query.in('location_id', accessibleLocationIds)
    }

    if (location_id) {
      if (!membership.all_locations && !accessibleLocationIds?.includes(location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
      query = query.eq('location_id', location_id)
    }

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (task_type) query = query.eq('task_type', task_type)
    if (assignee_user_id) query = query.eq('assignee_user_id', assignee_user_id)
    if (contact_id) query = query.eq('contact_id', contact_id)
    if (deal_id) query = query.eq('deal_id', deal_id)
    if (due_before) query = query.lte('due_at', due_before)
    if (due_after) query = query.gte('due_at', due_after)

    query = query
      .range(offset, offset + limit - 1)
      .order('due_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })

    const { data: tasks, error, count } = await query

    if (error) {
      console.error('[API:tasks] Failed to fetch tasks', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({
      tasks: tasks ?? [],
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count ?? 0),
      },
    })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[API:tasks] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const validation = safeValidateTask(payload, TaskCreateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const context = await getApiRequestContext()
    const { supabase, tenantId, user, activeLocationId, membership, accessibleLocationIds } = context
    const data = validation.data

    let resolvedLocationId = data.location_id ?? activeLocationId ?? null

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

      resolvedLocationId = resolvedLocationId ?? contact.location_id ?? null
    }

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

      resolvedLocationId = resolvedLocationId ?? deal.location_id ?? null
    }

    // 2b.58 — Free-floating tasks (no contact, no deal, no location)
    // are allowed per the product spec. The previous hard 400 blocked
    // operators from creating "general practice" tasks like "call
    // dental supplies vendor". Schema already permits NULL; the API
    // was the only enforcement point. Location access still gated for
    // tasks that DO carry a location.
    if (resolvedLocationId && !membership.all_locations) {
      if (!accessibleLocationIds?.includes(resolvedLocationId)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
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

    const insertPayload = {
      tenant_id: tenantId,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? 'open',
      priority: data.priority ?? 'normal',
      task_type: data.task_type ?? 'todo',
      assignee_user_id: data.assignee_user_id ?? null,
      due_at: data.due_at ?? null,
      contact_id: data.contact_id ?? null,
      deal_id: data.deal_id ?? null,
      location_id: resolvedLocationId,
      auto_created: false,
      created_by_user_id: user.id,
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([insertPayload])
      .select('*')
      .single()

    if (error) {
      console.error('[API:tasks] Failed to create task', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[API:tasks] Unexpected error creating task', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



