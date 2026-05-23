/**
 * Phase 2b.40 — Contact persona summary endpoint.
 *
 *   GET  /api/contacts/[id]/persona-summary
 *     Returns the cached row from `contact_persona_summaries`. If
 *     none exists, returns `{ summary: null, needs_generation: true }`
 *     so the UI can fire a POST. Also returns `stale: boolean` —
 *     true when ≥AUTO_REFRESH_ACTIVITY_DELTA new activities have
 *     arrived since `last_activity_seen_at`.
 *
 *   POST /api/contacts/[id]/persona-summary
 *     Reads recent activities + deals for the contact, runs
 *     `generatePersonaSummary()`, upserts into
 *     `contact_persona_summaries`. Idempotent — call as often as you
 *     like; the UPSERT collapses duplicate writes.
 *
 * Auth + RLS:
 *   - GET: requires authenticated user with access to the tenant
 *     (RLS gates the SELECT).
 *   - POST: same auth, plus service-role client for the write (the
 *     table is service-write-only per its migration).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import {
  generatePersonaSummary,
  AUTO_REFRESH_ACTIVITY_DELTA,
  type PersonaActivity,
  type PersonaDeal,
} from '@/lib/contacts/persona-summary'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ContactIdSchema = z.object({ id: z.string().uuid('Invalid contact id') })

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:contacts:persona-summary] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

interface CachedRow {
  summary: string
  generated_at: string
  last_activity_seen_at: string | null
  activities_seen_count: number
  model_version: string
  is_fallback: boolean
}

async function fetchCachedRow(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string
): Promise<CachedRow | null> {
  const { data, error } = await supabase
    .from('contact_persona_summaries')
    .select(
      'summary, generated_at, last_activity_seen_at, activities_seen_count, model_version, is_fallback'
    )
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .maybeSingle()

  if (error) {
    console.warn('[persona-summary] cache read failed', error.message)
    return null
  }
  return (data as CachedRow | null) ?? null
}

async function countActivitiesSince(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string,
  since: string | null
): Promise<number> {
  let q = supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .in('direction', ['inbound', 'outbound'])
  if (since) {
    q = q.gt('occurred_at', since)
  }
  const { count, error } = await q
  if (error) {
    console.warn('[persona-summary] activity count failed', error.message)
    return 0
  }
  return count ?? 0
}

// ---------------------------------------------------------------------------
// GET — read the cached summary + stale flag.
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = ContactIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })
    }

    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const cached = await fetchCachedRow(service, ctx.tenantId, params.id)
    if (!cached) {
      return NextResponse.json({
        summary: null,
        needs_generation: true,
        stale: false,
      })
    }

    // Count NEW inbound/outbound activities since the last seen
    // timestamp. If ≥ AUTO_REFRESH_ACTIVITY_DELTA, the UI should
    // fire a POST.
    const newActivityCount = await countActivitiesSince(
      service,
      ctx.tenantId,
      params.id,
      cached.last_activity_seen_at
    )
    const stale = newActivityCount >= AUTO_REFRESH_ACTIVITY_DELTA

    return NextResponse.json({
      summary: cached.summary,
      generated_at: cached.generated_at,
      last_activity_seen_at: cached.last_activity_seen_at,
      activities_seen_count: cached.activities_seen_count,
      model_version: cached.model_version,
      is_fallback: cached.is_fallback,
      new_activity_count: newActivityCount,
      stale,
      needs_generation: false,
    })
  } catch (error) {
    return handleError(error)
  }
}

// ---------------------------------------------------------------------------
// POST — regenerate the summary now.
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = ContactIdSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })
    }

    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    // 1. Load contact identity.
    const { data: contact, error: contactErr } = await service
      .from('contacts')
      .select('id, full_name, source, tags, tenant_id')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // 2. Load deals (lightweight join for pipeline + stage names).
    const { data: dealsRaw } = await service
      .from('deals')
      .select(
        `id, title, status, value_estimate_cents, created_at,
         pipelines (name),
         pipeline_stages!inner (name, is_won, is_lost)`
      )
      .eq('tenant_id', ctx.tenantId)
      .eq('contact_id', params.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    const deals: PersonaDeal[] = ((dealsRaw ?? []) as Array<{
      title: string | null
      status: string | null
      value_estimate_cents: number | null
      created_at: string
      pipelines?: { name?: string | null } | Array<{ name?: string | null }> | null
      pipeline_stages?: { name?: string | null } | Array<{ name?: string | null }> | null
    }>).map((d) => {
      const pipe = Array.isArray(d.pipelines) ? d.pipelines[0] : d.pipelines
      const stage = Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] : d.pipeline_stages
      return {
        title: d.title,
        pipeline_name: pipe?.name ?? null,
        stage_name: stage?.name ?? null,
        status: d.status,
        value_estimate_cents: d.value_estimate_cents,
        created_at: d.created_at,
      }
    })

    // 3. Load activities (most recent 200; the helper caps to that).
    const { data: activitiesRaw } = await service
      .from('activities')
      .select('direction, type, description, snippet, body, occurred_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('contact_id', params.id)
      .in('direction', ['inbound', 'outbound'])
      .order('occurred_at', { ascending: false })
      .limit(200)

    const activities: PersonaActivity[] = (activitiesRaw ?? []) as PersonaActivity[]

    // 4. Generate the summary.
    const result = await generatePersonaSummary({
      contactName: (contact as { full_name?: string | null }).full_name ?? '',
      source: (contact as { source?: string | null }).source ?? null,
      tags: ((contact as { tags?: string[] | null }).tags ?? null) as string[] | null,
      deals,
      activities,
    })

    // 5. Upsert into the cache table.
    const mostRecentActivity = activities[0]?.occurred_at ?? null
    const { error: upsertErr } = await service
      .from('contact_persona_summaries')
      .upsert(
        {
          tenant_id: ctx.tenantId,
          contact_id: params.id,
          summary: result.summary,
          generated_at: new Date().toISOString(),
          last_activity_seen_at: mostRecentActivity,
          activities_seen_count: activities.length,
          model_version: result.modelVersion,
          is_fallback: result.isFallback,
        },
        { onConflict: 'tenant_id,contact_id' }
      )

    if (upsertErr) {
      console.error('[persona-summary] upsert failed', upsertErr)
      return NextResponse.json(
        { error: 'persona_upsert_failed', message: upsertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      is_fallback: result.isFallback,
      model_version: result.modelVersion,
      last_activity_seen_at: mostRecentActivity,
      activities_seen_count: activities.length,
    })
  } catch (error) {
    return handleError(error)
  }
}
