/**
 * Phase 2b.19 — Clone an automation.
 * POST /api/automations/[id]/clone — creates a draft copy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireAuthenticatedTenantUser } from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params
    const supabase = createServiceClient()

    const { data: src, error: selErr } = await supabase
      .from('automations')
      .select('name, description, category, trigger_type, trigger_config, graph_json, workflow_config, tags')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    if (selErr) {
      return NextResponse.json({ error: 'db_error', message: selErr.message }, { status: 500 })
    }
    if (!src) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const { data, error } = await supabase
      .from('automations')
      .insert({
        tenant_id: auth.tenantId,
        name: `${src.name} (copy)`,
        description: src.description,
        category: src.category,
        status: 'draft',
        trigger_type: src.trigger_type,
        trigger_config: src.trigger_config,
        graph_json: src.graph_json,
        workflow_config: src.workflow_config,
        tags: src.tags,
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
