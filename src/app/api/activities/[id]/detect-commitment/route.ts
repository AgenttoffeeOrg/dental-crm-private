/**
 * Phase 2b.61 — Detect commitment lazy endpoint.
 *
 *   POST /api/activities/[id]/detect-commitment
 *
 * Runs the Claude commitment-detector for an activity and persists
 * the result to `activities.metadata.ai_commitment_suggestion`.
 * Idempotent: if a non-empty result is already cached AND no
 * `force: true` body field is passed, returns the cached value
 * without re-firing Claude.
 *
 * Matches the lazy pattern from 2b.43 email-summariser. Fired by
 * the chat bubble on first render when an activity has no
 * cached suggestion yet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { detectCommitment } from '@/lib/communications/detect-commitment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid activity id') })
const BodySchema = z
  .object({ force: z.boolean().optional() })
  .optional()
  .default({})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:detect-commitment] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = ParamsSchema.safeParse(params)
    if (!ok.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const body = (await request.json().catch(() => ({}))) as unknown
    const parsed = BodySchema.safeParse(body)
    const force = parsed.success ? Boolean(parsed.data.force) : false

    const { data: activity, error: actErr } = await service
      .from('activities')
      .select(
        'id, tenant_id, contact_id, type, direction, description, snippet, body, rich_content, occurred_at, metadata'
      )
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (actErr || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const a = activity as {
      tenant_id: string
      contact_id: string | null
      type: string | null
      direction: 'inbound' | 'outbound' | null
      description: string | null
      snippet: string | null
      body: string | null
      rich_content: string | null
      occurred_at: string
      metadata: Record<string, unknown> | null
    }

    // Idempotency: skip Claude if we already have a cached result.
    const cached = (a.metadata as any)?.ai_commitment_suggestion as
      | { has_commitment: boolean }
      | undefined
    if (cached && !force) {
      return NextResponse.json({ ok: true, cached: true, suggestion: cached })
    }

    // Resolve the text source by channel preference.
    const text =
      (a.body ?? '').trim() ||
      (a.snippet ?? '').trim() ||
      (a.description ?? '').trim() ||
      (a.rich_content ?? '').trim()

    // Look up contact name for prompt clarity (cheap one-row read).
    let contactName: string | null = null
    if (a.contact_id) {
      const { data: contact } = await service
        .from('contacts')
        .select('full_name')
        .eq('id', a.contact_id)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()
      contactName = (contact as { full_name?: string | null } | null)?.full_name ?? null
    }

    const channel = (a.type ?? 'note') as
      | 'call'
      | 'sms'
      | 'whatsapp'
      | 'email'
      | 'note'
      | 'meeting'

    const result = await detectCommitment({
      channel,
      direction: a.direction ?? 'inbound',
      text,
      contactName,
      occurredAt: a.occurred_at,
    })

    // Cache on metadata. Snake-case key to match the rest of the
    // metadata.ai_* prefix convention (ai_purpose, ai_outcome, etc.).
    const newMeta = {
      ...(a.metadata ?? {}),
      ai_commitment_suggestion: {
        has_commitment: result.hasCommitment,
        by: result.by,
        action: result.action,
        deadline_iso: result.deadlineIso,
        confidence: result.confidence,
        model_version: result.modelVersion,
        generated_at: new Date().toISOString(),
      },
    }

    // 2b.61 — Cache-write only; no audit_trail entry by design.
    // Same pattern as ai_email_summary + ai_attachment_uncertain —
    // AI-derived metadata, not an operator action.
    const { error: updateErr } = await service
      .from('activities')
      .update({ metadata: newMeta })
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)

    if (updateErr) {
      console.warn('[API:detect-commitment] update failed', updateErr.message)
      return NextResponse.json(
        { error: 'persist_failed', message: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      suggestion: newMeta.ai_commitment_suggestion,
    })
  } catch (error) {
    return handleError(error)
  }
}
