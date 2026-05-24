/**
 * Phase 2b.61 — Accept commitment suggestion endpoint.
 *
 *   POST /api/activities/[id]/accept-commitment-suggestion
 *
 * One-click create-task from the pill on the chat bubble. Reads the
 * cached suggestion from `activities.metadata.ai_commitment_suggestion`,
 * uses tenant default-assignee policy to pick the assignee (unless
 * the body overrides), inserts a row into `tasks`, links it back to
 * the originating activity via `tasks.source_activity_id`, audits.
 *
 * Task creation IS an operator action — goes through logAuditServer
 * (unlike the metadata writes which are cache-only).
 */

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid activity id') })

// Optional overrides — operator can edit the AI suggestion before
// accepting. Title / due / assignee / priority can all be tweaked.
const BodySchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    due_at: z.string().datetime().optional(),
    assignee_user_id: z.string().uuid().nullable().optional(),
    assigned_to_group_id: z.string().uuid().nullable().optional(),
    assigned_to_everyone: z.boolean().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    task_type: z.string().optional(),
  })
  .optional()
  .default({})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:accept-commitment] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

interface AssigneeResolution {
  assignee_user_id: string | null
  assigned_to_group_id: string | null
  assigned_to_everyone: boolean
}

async function resolveDefaultAssignee(
  service: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string | null
): Promise<AssigneeResolution> {
  // Read tenant default-assignee policy from tenant_routing_settings
  // (column added in 2b.59 with default mode = 'contact_owner').
  const { data: routing } = await service
    .from('tenant_routing_settings')
    .select('default_assignee_policy')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const policy =
    ((routing as { default_assignee_policy?: Record<string, unknown> } | null)
      ?.default_assignee_policy ?? { mode: 'contact_owner' }) as {
      mode?: string
      group_id?: string | null
      fallback_user_id?: string | null
    }

  if (policy.mode === 'everyone') {
    return { assignee_user_id: null, assigned_to_group_id: null, assigned_to_everyone: true }
  }
  if (policy.mode === 'group' && policy.group_id) {
    return {
      assignee_user_id: null,
      assigned_to_group_id: policy.group_id,
      assigned_to_everyone: false,
    }
  }
  // Default = contact_owner — fall through.
  if (contactId) {
    const { data: contact } = await service
      .from('contacts')
      .select('assigned_to_user_id')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const ownerId = (contact as { assigned_to_user_id?: string | null } | null)?.assigned_to_user_id
    if (ownerId) {
      return { assignee_user_id: ownerId, assigned_to_group_id: null, assigned_to_everyone: false }
    }
  }
  // Fallback when contact has no owner.
  if (policy.fallback_user_id) {
    return {
      assignee_user_id: policy.fallback_user_id,
      assigned_to_group_id: null,
      assigned_to_everyone: false,
    }
  }
  // Last resort: assign to everyone so SOMEONE in the practice picks it up.
  return { assignee_user_id: null, assigned_to_group_id: null, assigned_to_everyone: true }
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
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const overrides = parsed.data

    // Load activity + its cached suggestion.
    const { data: activity, error: actErr } = await service
      .from('activities')
      .select('id, tenant_id, contact_id, deal_id, type, direction, occurred_at, metadata, location_id')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (actErr || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    const a = activity as {
      contact_id: string | null
      deal_id: string | null
      type: string | null
      occurred_at: string
      metadata: Record<string, unknown> | null
      location_id: string | null
    }

    const suggestion = (a.metadata as any)?.ai_commitment_suggestion as
      | {
          has_commitment: boolean
          action: string | null
          deadline_iso: string | null
        }
      | undefined

    if (!suggestion || !suggestion.has_commitment) {
      return NextResponse.json(
        { error: 'no_suggestion', message: 'No commitment suggestion cached on this activity.' },
        { status: 409 }
      )
    }

    // Title: override > suggestion.action > generic fallback.
    const title = overrides.title ?? suggestion.action ?? 'Follow up'

    // Due: override > suggestion.deadline_iso > NULL (operator can
    // edit later, but the pill shouldn't fail just because Claude
    // couldn't parse a date).
    const dueAt = overrides.due_at ?? suggestion.deadline_iso ?? null

    // Assignee: explicit override wins, else tenant default policy.
    let assigneeResolution: AssigneeResolution
    if (
      overrides.assignee_user_id !== undefined ||
      overrides.assigned_to_group_id !== undefined ||
      overrides.assigned_to_everyone !== undefined
    ) {
      assigneeResolution = {
        assignee_user_id: overrides.assignee_user_id ?? null,
        assigned_to_group_id: overrides.assigned_to_group_id ?? null,
        assigned_to_everyone: overrides.assigned_to_everyone ?? false,
      }
    } else {
      assigneeResolution = await resolveDefaultAssignee(service, ctx.tenantId, a.contact_id)
    }

    // Pre-generate the task id so we can audit BEFORE the insert.
    const newTaskId = randomUUID()
    const insertPayload = {
      id: newTaskId,
      tenant_id: ctx.tenantId,
      title,
      status: 'open' as const,
      priority: overrides.priority ?? 'normal',
      task_type: overrides.task_type ?? (a.type ?? 'todo'),
      due_at: dueAt,
      contact_id: a.contact_id,
      deal_id: a.deal_id,
      location_id: a.location_id,
      source_activity_id: params.id,
      auto_created: false,
      created_by_user_id: ctx.user.id,
      assignee_user_id: assigneeResolution.assignee_user_id,
      assigned_to_group_id: assigneeResolution.assigned_to_group_id,
      assigned_to_everyone: assigneeResolution.assigned_to_everyone,
    }

    // Audit FIRST. If audit write fails, abort before mutating.
    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'create',
        category: 'task',
        entityType: 'task',
        entityId: newTaskId,
        description: 'Task created from accepted AI commitment suggestion',
        beforeState: undefined,
        afterState: insertPayload,
        changedFields: Object.keys(insertPayload),
        severity: 'info',
        tags: ['task', 'ai_commitment_accepted'],
      })
    } catch (err) {
      if (err instanceof AuditLogWriteError) {
        return NextResponse.json(
          { error: 'audit_log_failed', internal_error_id: err.internalErrorId },
          { status: 500 }
        )
      }
      throw err
    }

    // Insert the task. On failure, compensate-delete the audit row.
    const { data: inserted, error: insertErr } = await service
      .from('tasks')
      .insert([insertPayload])
      .select('*')
      .single()

    if (insertErr || !inserted) {
      console.error('[API:accept-commitment] task insert failed', insertErr)
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      return NextResponse.json(
        { error: 'task_insert_failed', message: insertErr?.message ?? 'unknown' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      task: inserted,
    })
  } catch (error) {
    return handleError(error)
  }
}
