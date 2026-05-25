/**
 * Phase 2b.93 — Pre-call brief endpoint.
 *
 *   GET  /api/contacts/[id]/pre-call-brief?taskTitle=...
 *     Returns the cached brief from contacts.metadata.pre_call_brief.
 *     Stale flag set to true when ≥STALE_ACTIVITY_DELTA new
 *     activities have occurred since `generated_at`.
 *
 *   POST /api/contacts/[id]/pre-call-brief
 *     Body: { taskTitle: string }
 *     Pulls persona + deal + last 10 activities, calls Claude via
 *     generatePreCallBrief(), upserts the result on
 *     contacts.metadata.pre_call_brief. Returns the brief.
 *
 * Auth: standard user session. Cache write uses service-role so RLS
 * on contacts (UPDATE) doesn't block the metadata patch.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import {
  generatePreCallBrief,
  STALE_ACTIVITY_DELTA,
  type PreCallBrief,
  type PreCallBriefInput,
} from '@/lib/contacts/pre-call-brief'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid contact id') })
const PostBodySchema = z.object({
  taskTitle: z.string().min(1).max(300),
})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:contacts:pre-call-brief] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

async function buildBriefInput(
  service: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string,
  taskTitle: string
): Promise<PreCallBriefInput | null> {
  const { data: contact } = await service
    .from('contacts')
    .select('id, full_name, tenant_id')
    .eq('id', contactId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!contact) return null

  const [{ data: persona }, { data: activities }, { data: deals }] = await Promise.all([
    service
      .from('contact_psych_profiles')
      .select(
        'dominant_persona, trust_score, anxiety_level, communication_style, decision_style, snapshot'
      )
      .eq('contact_id', contactId)
      .maybeSingle(),
    service
      .from('activities')
      .select('occurred_at, type, direction, subject, body, metadata')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false })
      .limit(10),
    service
      .from('deals')
      .select('title, value_estimate_cents, treatment_tags, pipeline_stages(name)')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1),
  ])

  const dealRow = (deals as any[])?.[0]
  const personaSnapshot = persona
    ? {
        dominant_persona: (persona as any).dominant_persona ?? null,
        trust_score: (persona as any).trust_score ?? null,
        anxiety_level: (persona as any).anxiety_level ?? null,
        communication_style: (persona as any).communication_style ?? null,
        decision_style: (persona as any).decision_style ?? null,
        recommended_approach: (persona as any).snapshot?.recommended_approach ?? null,
        key_concerns: (persona as any).snapshot?.key_concerns ?? null,
        motivations: (persona as any).snapshot?.motivations ?? null,
      }
    : null

  return {
    contactName: (contact as any).full_name ?? null,
    taskTitle,
    personaSnapshot,
    deal: dealRow
      ? {
          title: dealRow.title ?? null,
          stage_name: dealRow.pipeline_stages?.name ?? null,
          value_estimate_cents: dealRow.value_estimate_cents ?? null,
          treatment_tags: dealRow.treatment_tags ?? null,
        }
      : null,
    recentActivities: ((activities ?? []) as any[]).map((a) => ({
      occurred_at: a.occurred_at,
      type: a.type,
      direction: a.direction,
      subject: a.subject,
      body: a.body,
      ai_summary: a.metadata?.ai_summary ?? null,
    })),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) {
      return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })
    }
    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const { data: contact } = await service
      .from('contacts')
      .select('metadata')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'contact_not_found' }, { status: 404 })
    }

    const brief = ((contact as any).metadata?.pre_call_brief ?? null) as PreCallBrief | null

    if (!brief) {
      return NextResponse.json({ brief: null, needs_generation: true })
    }

    // Stale check — count activities since generated_at.
    const { count: newActivityCount } = await service
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', params.id)
      .gt('occurred_at', brief.generated_at)

    const stale = (newActivityCount ?? 0) >= STALE_ACTIVITY_DELTA

    return NextResponse.json({ brief, stale, new_activities: newActivityCount ?? 0 })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) {
      return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })
    }
    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = PostBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const service = createServiceClient()
    const input = await buildBriefInput(service, ctx.tenantId, params.id, parsed.data.taskTitle)
    if (!input) {
      return NextResponse.json({ error: 'contact_not_found' }, { status: 404 })
    }

    const brief = await generatePreCallBrief(input)

    // Read existing metadata so we don't clobber other fields.
    const { data: existing } = await service
      .from('contacts')
      .select('metadata')
      .eq('id', params.id)
      .maybeSingle()
    const newMetadata = {
      ...((existing as any)?.metadata ?? {}),
      pre_call_brief: brief,
    }

    const { error: updateErr } = await service
      .from('contacts')
      .update({ metadata: newMetadata })
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)

    if (updateErr) {
      console.warn('[API:contacts:pre-call-brief] cache write failed', updateErr.message)
      // Still return the brief — caller can render it without the cache.
    }

    return NextResponse.json({ brief, stale: false, new_activities: 0 })
  } catch (error) {
    return handleError(error)
  }
}
