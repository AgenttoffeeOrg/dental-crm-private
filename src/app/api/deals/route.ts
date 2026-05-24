import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import {
  DealCreateSchema,
  DealQuerySchema,
  safeValidateDeal,
} from '@/schemas/deal.schema'

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const rawParams = Object.fromEntries(request.nextUrl.searchParams)
    const validation = safeValidateDeal(rawParams, DealQuerySchema)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const {
      stage_id,
      pipeline_id,
      contact_id,
      status,
      owner_user_id,
      search,
      location_id,
      limit,
      offset,
      include_archived,
    } = validation.data

    let query = supabase
      .from('deals')
      .select(
        `
          id,
          tenant_id,
          contact_id,
          pipeline_id,
          stage_id,
          title,
          status,
          owner_user_id,
          value_estimate_cents,
          currency,
          source,
          treatment_tags,
          location_id,
          last_activity_at,
          created_at,
          updated_at
        `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)

    if (!membership.all_locations) {
      if (!accessibleLocationIds || accessibleLocationIds.length === 0) {
        return NextResponse.json({
          deals: [],
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
        return NextResponse.json(
          { error: 'Location access denied' },
          { status: 403 }
        )
      }
      query = query.eq('location_id', location_id)
    }

    if (stage_id) query = query.eq('stage_id', stage_id)
    if (pipeline_id) query = query.eq('pipeline_id', pipeline_id)
    if (contact_id) query = query.eq('contact_id', contact_id)
    if (owner_user_id) query = query.eq('owner_user_id', owner_user_id)

    if (status) {
      query = query.eq('status', status)
    } else if (!include_archived) {
      query = query.neq('status', 'archived')
    }

    if (search) {
      const sanitized = search.replace(/%/g, '').replace(/_/g, '')
      query = query.ilike('title', `%${sanitized}%`)
    }

    query = query
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false })

    const { data: deals, error, count } = await query

    if (error) {
      console.error('[API:deals] Failed to fetch deals', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    return NextResponse.json({
      deals: deals ?? [],
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

    console.error('[API:deals] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user, activeLocationId, membership, accessibleLocationIds } = context

    const payload = await request.json()
    const validation = safeValidateDeal(payload, DealCreateSchema)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    const resolvedLocationId = data.location_id ?? activeLocationId ?? null

    if (resolvedLocationId && !membership.all_locations) {
      if (!accessibleLocationIds?.includes(resolvedLocationId)) {
        return NextResponse.json(
          { error: 'Location access denied' },
          { status: 403 }
        )
      }
    }

    const [{ data: contact, error: contactError }, { data: pipeline, error: pipelineError }] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, tenant_id, location_id')
        .eq('id', data.contact_id)
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('pipelines')
        .select('id, tenant_id, location_id')
        .eq('id', data.pipeline_id)
        .eq('tenant_id', tenantId)
        .single(),
    ])

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found for tenant' },
        { status: 404 }
      )
    }

    if (pipelineError || !pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found for tenant' },
        { status: 404 }
      )
    }

    const { data: stage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, pipeline_id, tenant_id')
      .eq('id', data.stage_id)
      .eq('pipeline_id', data.pipeline_id)
      .eq('tenant_id', tenantId)
      .single()

    if (stageError || !stage) {
      return NextResponse.json(
        { error: 'Stage not found for pipeline' },
        { status: 404 }
      )
    }

    if (data.owner_user_id) {
      const { data: ownerMembership } = await supabase
        .from('user_tenant_memberships')
        .select('id')
        .eq('user_id', data.owner_user_id)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single()

      if (!ownerMembership) {
        return NextResponse.json(
          { error: 'Owner does not belong to tenant' },
          { status: 400 }
        )
      }
    }

    const insertPayload = {
      tenant_id: tenantId,
      contact_id: data.contact_id,
      pipeline_id: data.pipeline_id,
      stage_id: data.stage_id,
      title: data.title,
      status: data.status ?? 'open',
      source: data.source ?? null,
      owner_user_id: data.owner_user_id ?? user.id,
      value_estimate_cents: data.value_estimate_cents ?? null,
      location_id: resolvedLocationId ?? contact.location_id ?? pipeline.location_id ?? null,
      treatment_tags: data.treatment_tags ?? [],
    }

    const { data: deal, error: insertError } = await supabase
      .from('deals')
      .insert([insertPayload])
      .select('*')
      .single()

    if (insertError) {
      console.error('[API:deals] Failed to create deal', insertError)
      return NextResponse.json(
        { error: 'Failed to create deal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[API:deals] Unexpected error during create', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

