/**
 * Phase 2b.43 — Lazy email-summariser endpoint.
 *
 *   POST /api/activities/[id]/summarise-email
 *     Loads the activity, summarises its body via Claude (or
 *     fallback), and persists the result back to
 *     `activities.metadata.ai_email_summary` (+ ai_email_summary_at,
 *     ai_email_summary_is_fallback). Idempotent: if the metadata
 *     already carries a non-fallback summary, the endpoint returns
 *     it without re-summarising. A `force: true` body field
 *     overrides that.
 *
 * Auth: requires authenticated tenant user; tenant-scoped reads/writes.
 * Updates are done via the service-role client so the
 * `metadata` jsonb update bypasses RLS (matches the pattern used
 * for the `ai_attachment_uncertain` flip in PATCH /api/activities/[id]).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { summariseEmail } from '@/lib/communications/email-summariser'

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
  console.error('[API:summarise-email] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paramOk = ParamsSchema.safeParse(params)
    if (!paramOk.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const body = (await request.json().catch(() => ({}))) as unknown
    const parsedBody = BodySchema.safeParse(body)
    const force = parsedBody.success ? Boolean(parsedBody.data.force) : false

    // Load the activity. Tenant scoped.
    const { data: activity, error: actErr } = await service
      .from('activities')
      .select(
        'id, tenant_id, type, direction, subject, description, snippet, body, rich_content, metadata, location_id'
      )
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (actErr || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const a = activity as {
      type: string | null
      direction: 'inbound' | 'outbound' | null
      subject: string | null
      description: string | null
      snippet: string | null
      body: string | null
      rich_content: string | null
      metadata: Record<string, unknown> | null
    }

    if (a.type !== 'email') {
      return NextResponse.json(
        { error: 'not_an_email', message: 'Only email activities can be summarised here.' },
        { status: 400 }
      )
    }

    // Idempotency: already have a non-fallback summary?
    const existingSummary = (a.metadata as any)?.ai_email_summary as string | undefined
    const existingFallback = (a.metadata as any)?.ai_email_summary_is_fallback as boolean | undefined
    if (existingSummary && !existingFallback && !force) {
      return NextResponse.json({
        ok: true,
        summary: existingSummary,
        cached: true,
        is_fallback: false,
      })
    }

    // Resolve the best available text. rich_content (HTML) for outbound,
    // description/body/snippet for inbound. The summariser strips HTML.
    const bodyText =
      a.rich_content?.trim() || a.body?.trim() || a.description?.trim() || a.snippet?.trim() || ''

    const result = await summariseEmail({
      direction: a.direction ?? 'outbound',
      subject: a.subject,
      body: bodyText,
    })

    // Persist into metadata. Merge to preserve other AI fields.
    const newMeta = {
      ...(a.metadata ?? {}),
      ai_email_summary: result.summary,
      ai_email_summary_at: new Date().toISOString(),
      ai_email_summary_is_fallback: result.isFallback,
      ai_email_summary_model: result.modelVersion,
    }

    const { error: updateErr } = await service
      .from('activities')
      .update({ metadata: newMeta })
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)

    if (updateErr) {
      console.warn('[API:summarise-email] update failed', updateErr.message)
      return NextResponse.json(
        { error: 'persist_failed', message: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      is_fallback: result.isFallback,
      cached: false,
    })
  } catch (error) {
    return handleError(error)
  }
}
