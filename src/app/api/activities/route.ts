import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { ActivityCreateSchema, ActivityQuerySchema, safeValidateActivity } from '@/schemas/activity.schema'

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext()
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const rawParams = Object.fromEntries(request.nextUrl.searchParams)
    const validation = safeValidateActivity(rawParams, ActivityQuerySchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const {
      type,
      direction,
      contact_id,
      deal_id,
      location_id,
      script_version_id,
      conversation_session_id,
      occurred_before,
      occurred_after,
      limit,
      offset,
    } = validation.data

    let query = supabase
      .from('activities')
      .select(
        `
          id,
          tenant_id,
          type,
          direction,
          contact_id,
          deal_id,
          location_id,
          occurred_at,
          agent_user_id,
          subject,
          snippet,
          outcome,
          duration_seconds,
          metadata,
          created_at
        `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)

    if (!membership.all_locations) {
      if (!accessibleLocationIds || accessibleLocationIds.length === 0) {
        return NextResponse.json({
          activities: [],
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

    if (type) query = query.eq('type', type)
    if (direction) query = query.eq('direction', direction)
    if (contact_id) query = query.eq('contact_id', contact_id)
    if (deal_id) query = query.eq('deal_id', deal_id)
    if (script_version_id) query = query.eq('script_version_id', script_version_id)
    if (conversation_session_id) query = query.eq('conversation_session_id', conversation_session_id)
    if (occurred_before) query = query.lte('occurred_at', occurred_before)
    if (occurred_after) query = query.gte('occurred_at', occurred_after)

    query = query
      .range(offset, offset + limit - 1)
      .order('occurred_at', { ascending: false })

    const { data: activities, error, count } = await query

    if (error) {
      console.error('[API:activities] Failed to fetch activities', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    return NextResponse.json({
      activities: activities ?? [],
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

    console.error('[API:activities] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const validation = safeValidateActivity(payload, ActivityCreateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const context = await getApiRequestContext()
    const { supabase, tenantId, user, activeLocationId, membership, accessibleLocationIds } = context
    const data = validation.data

    // Verify contact belongs to tenant
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, location_id')
      .eq('id', data.contact_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found for tenant' }, { status: 404 })
    }

    let resolvedLocationId = data.location_id ?? contact.location_id ?? activeLocationId ?? null

    if (data.deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, location_id')
        .eq('id', data.deal_id)
        .eq('tenant_id', tenantId)
        .single()

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found for tenant' }, { status: 404 })
      }

      resolvedLocationId = resolvedLocationId ?? deal.location_id ?? null
    }

    if (resolvedLocationId && !membership.all_locations) {
      if (!accessibleLocationIds?.includes(resolvedLocationId)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const insertPayload = {
      tenant_id: tenantId,
      type: data.type,
      direction: data.direction ?? null,
      contact_id: data.contact_id,
      deal_id: data.deal_id ?? null,
      location_id: resolvedLocationId,
      occurred_at: data.occurred_at ?? new Date().toISOString(),
      agent_user_id: user.id,
      subject: data.subject ?? null,
      snippet: data.snippet ?? null,
      script_version_id: data.script_version_id ?? null,
      conversation_session_id: data.conversation_session_id ?? null,
      outcome: data.outcome ?? null,
      duration_seconds: data.duration_seconds ?? null,
      attendees: data.attendees ?? null,
      mentions: data.mentions ?? null,
      parent_activity_id: data.parent_activity_id ?? null,
      is_edited: data.is_edited ?? false,
      edited_at: data.edited_at ?? null,
      edited_by_user_id: data.edited_by_user_id ?? null,
      rich_content: data.rich_content ?? null,
      metadata: data.metadata ?? {},
      raw: data.raw ?? null,
    }

    const { data: activity, error } = await supabase
      .from('activities')
      .insert([insertPayload])
      .select('*')
      .single()

    if (error) {
      console.error('[API:activities] Failed to create activity', error)
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
    }

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[API:activities] Unexpected error creating activity', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







