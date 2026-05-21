/**
 * Phase 2b.19 — Install a prebuilt workflow template into a tenant.
 *
 * POST /api/automations/install-template
 * Body: { template_id: string }
 *
 * Pulls the template by id from `lib/automations/prebuilt-workflows.ts`,
 * converts its legacy `actions[]` shape into the new `graph_json`
 * format (trigger → linear chain of action nodes → end), and inserts
 * as a draft automation on the caller's tenant.
 *
 * 2b.22 will add the inbound-specific templates and rework the
 * template authoring shape; this route stays the same — only the
 * source templates change.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authErrorResponse, requireAuthenticatedTenantUser } from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'
import { getWorkflowTemplate, type WorkflowTemplate } from '@/lib/automations/prebuilt-workflows'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({ template_id: z.string().min(1) })

function templateToGraph(template: WorkflowTemplate): {
  start_key: string
  nodes: Array<Record<string, unknown>>
} {
  const nodes: Array<Record<string, unknown>> = [
    { key: 'trigger', type: 'trigger', next: 'a0' },
  ]
  template.actions.forEach((action, idx) => {
    const key = `a${idx}`
    const nextKey = idx + 1 < template.actions.length ? `a${idx + 1}` : 'done'
    if (action.delay_minutes && action.delay_minutes > 0) {
      nodes.push({
        key,
        type: 'wait',
        config: { duration: action.delay_minutes, unit: 'minutes' },
        next: `${key}_action`,
      })
      nodes.push({
        key: `${key}_action`,
        type: action.type,
        config: action.config,
        next: nextKey,
      })
    } else {
      nodes.push({
        key,
        type: action.type,
        config: action.config,
        next: nextKey,
      })
    }
  })
  nodes.push({ key: 'done', type: 'end' })
  return { start_key: 'trigger', nodes }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const rawBody = (await request.json()) as Record<string, unknown>
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const template = getWorkflowTemplate(parsed.data.template_id)
    if (!template) {
      return NextResponse.json({ error: 'template_not_found' }, { status: 404 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('automations')
      .insert({
        tenant_id: auth.tenantId,
        name: template.name,
        description: template.description,
        category: template.category,
        status: 'draft',
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        graph_json: templateToGraph(template),
        workflow_config: {},
        tags: ['prebuilt', template.id],
        is_template: false,
        template_id: null,
        created_by_user_id: auth.userId,
      })
      .select('id')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'db_error', message: error?.message ?? 'no row returned' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, automation_id: data.id }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
