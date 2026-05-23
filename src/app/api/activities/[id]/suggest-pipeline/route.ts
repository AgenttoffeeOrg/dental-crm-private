/**
 * Phase 2b.35.2 — On-demand AI pipeline suggestion for an activity.
 *
 * Powers the "✨ AI suggest" inline CTA on activities that landed in
 * the Unsorted pipeline (or have the `ai_attachment_uncertain` flag).
 * Operator clicks it; we re-run the deal-attachment judge against the
 * message text + the contact's current open deals and return a
 * pipeline suggestion. Operator can then accept (POST) which either
 *
 *   - moves the activity onto an existing open deal in that pipeline
 *     (reuse_matching_pipeline), or
 *   - creates a fresh deal in the suggested pipeline and moves the
 *     activity onto it (new_pipeline).
 *
 * Either way the move uses the same audit-first pattern as
 * PATCH /api/activities/[id] (see `writeDealReassignmentAudit` there).
 *
 * Why a separate endpoint rather than overloading PATCH? Because
 * "accept the AI suggestion" is a 1-click product surface that needs
 * the server to (a) re-decide the pipeline (don't trust a clicked
 * pipelineId from the client) and (b) provision a deal when one
 * doesn't exist yet. PATCH expects a known deal_id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { AuditLogWriteError, deleteAuditRowServer, logAuditServer } from '@/lib/auto-audit'
import { judgeInboundDealAttachment } from '@/lib/lead-ingestion/judge-deal-attachment'
import { generateDealTitle } from '@/lib/lead-ingestion/deal-title'

const ActivityIdSchema = z.object({ id: z.string().uuid('Invalid activity id') })

const PERMISSION_DEAL_EDIT = 'deals.edit'

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:activity:suggest-pipeline] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

interface ActivityRow {
  id: string
  tenant_id: string
  contact_id: string | null
  deal_id: string | null
  description: string | null
  body: string | null
  metadata: Record<string, unknown> | null
  location_id: string | null
}

/**
 * Pull the message text we'll feed to the judge. SMS/WhatsApp store
 * the body verbatim in `body`; web-form + manual-entry put the intent
 * in `description`. Voice transcripts also land in `description`.
 */
function extractMessageText(activity: ActivityRow): string {
  const body = (activity.body ?? '').trim()
  if (body) return body
  const description = (activity.description ?? '').trim()
  return description
}

interface OpenDealForSuggestion {
  id: string
  pipelineId: string
  pipelineName: string | null
}

async function loadActivityAndOpenDeals(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  tenantId: string,
  activityId: string
): Promise<
  | { ok: true; activity: ActivityRow; openDeals: OpenDealForSuggestion[] }
  | { ok: false; status: number; error: string }
> {
  const { data: activity, error: activityErr } = await supabase
    .from('activities')
    .select('id, tenant_id, contact_id, deal_id, description, body, metadata, location_id')
    .eq('id', activityId)
    .eq('tenant_id', tenantId)
    .single()

  if (activityErr || !activity) {
    return { ok: false, status: 404, error: 'Activity not found' }
  }
  if (!activity.contact_id) {
    return { ok: false, status: 400, error: 'Activity has no contact' }
  }

  const { data: deals, error: dealsErr } = await supabase
    .from('deals')
    .select('id, pipeline_id, pipelines(name), pipeline_stages!inner(is_won, is_lost)')
    .eq('tenant_id', tenantId)
    .eq('contact_id', activity.contact_id)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .is('deleted_at', null)

  if (dealsErr) {
    console.warn('[API:activity:suggest-pipeline] open-deals query failed', dealsErr)
    return { ok: false, status: 500, error: 'Failed to load open deals' }
  }

  const openDeals: OpenDealForSuggestion[] = ((deals ?? []) as Array<{
    id: string
    pipeline_id: string
    pipelines?: { name?: string | null } | Array<{ name?: string | null }> | null
  }>).map((d) => {
    const pipe = Array.isArray(d.pipelines) ? d.pipelines[0] : d.pipelines
    return {
      id: d.id,
      pipelineId: d.pipeline_id,
      pipelineName: pipe?.name ?? null,
    }
  })

  return { ok: true, activity: activity as ActivityRow, openDeals }
}

interface PipelineMeta {
  id: string
  name: string
  is_default?: boolean | null
}

async function fetchPipelineName(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  tenantId: string,
  pipelineId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('pipelines')
    .select('name')
    .eq('id', pipelineId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as PipelineMeta | null)?.name ?? null
}

// ---------------------------------------------------------------------------
// GET — preview suggestion (read-only)
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = ActivityIdSchema.safeParse(params)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, membership, accessibleLocationIds } = context

    const loaded = await loadActivityAndOpenDeals(supabase, tenantId, params.id)
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    const { activity, openDeals } = loaded

    if (!membership.all_locations && activity.location_id) {
      if (!accessibleLocationIds?.includes(activity.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const messageText = extractMessageText(activity)
    if (!messageText) {
      return NextResponse.json({
        suggestion: null,
        reason: 'no_message_text',
        message: 'This activity has no text content to analyse.',
      })
    }

    const judgement = await judgeInboundDealAttachment({
      tenantId,
      messageText,
      openDeals: openDeals.map((d) => ({ id: d.id, pipelineId: d.pipelineId })),
      supabase,
    })

    if (judgement.kind === 'uncertain') {
      return NextResponse.json({
        suggestion: null,
        reason: judgement.reason,
        message: 'AI is still not confident enough to suggest a pipeline for this message.',
      })
    }

    const suggestedPipelineId = judgement.pipelineId
    const pipelineName =
      openDeals.find((d) => d.pipelineId === suggestedPipelineId)?.pipelineName ??
      (await fetchPipelineName(supabase, tenantId, suggestedPipelineId))

    if (judgement.kind === 'reuse_matching_pipeline') {
      return NextResponse.json({
        suggestion: {
          kind: 'reuse_matching_pipeline',
          pipeline_id: suggestedPipelineId,
          pipeline_name: pipelineName,
          deal_id: judgement.dealId,
          confidence: judgement.confidence,
          source: judgement.source,
          already_attached: activity.deal_id === judgement.dealId,
        },
      })
    }

    return NextResponse.json({
      suggestion: {
        kind: 'new_pipeline',
        pipeline_id: suggestedPipelineId,
        pipeline_name: pipelineName,
        deal_id: null,
        confidence: judgement.confidence,
        source: judgement.source,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

// ---------------------------------------------------------------------------
// POST — accept suggestion (creates deal if needed + reassigns activity)
// ---------------------------------------------------------------------------

interface ResolveOk {
  ok: true
  stageId: string
  ownerId: string | null
}

async function resolveStageAndOwner(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  tenantId: string,
  pipelineId: string,
  contactId: string
): Promise<ResolveOk | { ok: false; status: number; error: string }> {
  const { data: stage, error: stageErr } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (stageErr || !stage) {
    return { ok: false, status: 500, error: 'pipeline_has_no_stages' }
  }

  // Inherit owner from contact's most recent prior deal in this pipeline.
  // Falls back to null — front-of-house can claim it later.
  const { data: priorDeal } = await supabase
    .from('deals')
    .select('owner_user_id')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .eq('pipeline_id', pipelineId)
    .not('owner_user_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    ok: true,
    stageId: (stage as { id: string }).id,
    ownerId: ((priorDeal as { owner_user_id?: string | null } | null)?.owner_user_id ?? null) as string | null,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = ActivityIdSchema.safeParse(params)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 })
    }

    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user, membership, accessibleLocationIds } = context

    // Permission gate matches PATCH (deals.edit). Accepting an AI
    // suggestion is a deal-reassignment action.
    const { data: hasPerm, error: permErr } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_tenant_id: tenantId,
      p_permission_code: PERMISSION_DEAL_EDIT,
    })
    if (permErr) {
      console.error('[API:activity:suggest-pipeline] permission check failed', permErr)
      return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
    }
    if (!hasPerm) {
      return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
    }

    const loaded = await loadActivityAndOpenDeals(supabase, tenantId, params.id)
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    const { activity, openDeals } = loaded

    if (!membership.all_locations && activity.location_id) {
      if (!accessibleLocationIds?.includes(activity.location_id)) {
        return NextResponse.json({ error: 'Location access denied' }, { status: 403 })
      }
    }

    const messageText = extractMessageText(activity)
    if (!messageText) {
      return NextResponse.json({ error: 'no_message_text' }, { status: 400 })
    }

    // Re-run the judge server-side — never trust a pipelineId the
    // client tells us was the suggestion. Sub-second; the cost is
    // worth the guarantee that AI actually picked this pipeline.
    const judgement = await judgeInboundDealAttachment({
      tenantId,
      messageText,
      openDeals: openDeals.map((d) => ({ id: d.id, pipelineId: d.pipelineId })),
      supabase,
    })

    if (judgement.kind === 'uncertain') {
      return NextResponse.json(
        { error: 'no_confident_suggestion', reason: judgement.reason },
        { status: 409 }
      )
    }

    let targetDealId: string

    if (judgement.kind === 'reuse_matching_pipeline') {
      targetDealId = judgement.dealId
    } else {
      // new_pipeline — provision a deal in the suggested pipeline,
      // then attach the activity to it.
      const contactId = activity.contact_id as string
      const resolved = await resolveStageAndOwner(supabase, tenantId, judgement.pipelineId, contactId)
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status })
      }

      const pipelineName = await fetchPipelineName(supabase, tenantId, judgement.pipelineId)
      const title = await generateDealTitle({
        intentText: messageText,
        pipelineName: pipelineName ?? undefined,
        fallback: 'Inquiry',
      })

      const { data: createdDeal, error: createErr } = await supabase
        .from('deals')
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          pipeline_id: judgement.pipelineId,
          stage_id: resolved.stageId,
          title,
          owner_user_id: resolved.ownerId,
          value_estimate_cents: null,
          currency: 'GBP',
          source: 'ai_suggestion',
          treatment_tags: null,
          status: 'open',
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (createErr || !createdDeal) {
        console.error('[API:activity:suggest-pipeline] deal insert failed', createErr)
        return NextResponse.json({ error: 'deal_create_failed' }, { status: 500 })
      }

      targetDealId = (createdDeal as { id: string }).id
    }

    // Already attached — nothing to do.
    if (activity.deal_id === targetDealId) {
      return NextResponse.json({
        ok: true,
        deal_id: targetDealId,
        message: 'Activity already attached to suggested deal.',
      })
    }

    // Audit-first pattern (matches PATCH /api/activities/[id]).
    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId,
        userId: user.id,
        actionType: 'update',
        category: 'deal',
        entityType: 'activity',
        entityId: params.id,
        description: 'Activity reassigned by accepting AI pipeline suggestion',
        beforeState: { deal_id: activity.deal_id },
        afterState: { deal_id: targetDealId },
        changedFields: ['deal_id'],
        severity: 'info',
        tags: ['activity', 'deal_id', 'reassignment', 'ai_suggestion'],
      })
    } catch (err) {
      if (err instanceof AuditLogWriteError) {
        return NextResponse.json(
          {
            ok: false,
            error: 'audit_log_failed',
            message:
              'Reassignment was rolled back because the audit trail could not be written.',
            internal_error_id: err.internalErrorId,
          },
          { status: 500 }
        )
      }
      throw err
    }

    // Strip the ai_attachment_uncertain marker — operator just resolved it.
    const updatePatch: Record<string, unknown> = { deal_id: targetDealId }
    const existingMetadata = (activity.metadata ?? null) as Record<string, unknown> | null
    if (existingMetadata && existingMetadata.ai_attachment_uncertain) {
      const { ai_attachment_uncertain: _stripped, ...rest } = existingMetadata
      updatePatch.metadata = rest
    }

    const { data: updated, error: updateErr } = await supabase
      .from('activities')
      .update(updatePatch)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (updateErr || !updated) {
      console.error('[API:activity:suggest-pipeline] activity update failed', updateErr)
      if (auditId) await deleteAuditRowServer(auditId, tenantId)
      return NextResponse.json({ error: 'activity_update_failed' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deal_id: targetDealId,
      activity: updated,
    })
  } catch (error) {
    return handleError(error)
  }
}
