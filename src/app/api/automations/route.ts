/**
 * Phase 2b.19 — Automation CRUD API root.
 *
 * GET    /api/automations            — list (filters: status, category, search)
 * POST   /api/automations            — create
 *
 * Auth: requireAuthenticatedTenantUser. Tenant always derived from
 * the session; body `tenant_id` is checked for mismatch (403).
 *
 * Audit-trail: create does NOT write audit (a draft is not a
 * customer-visible action). Publish via PATCH does — see [id]/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  assertBodyTenantMatches,
  authErrorResponse,
  requireAuthenticatedTenantUser,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
const VALID_CATEGORIES = ['deal', 'pipeline', 'task', 'marketing'] as const

const createSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().nullish(),
  category: z.enum(VALID_CATEGORIES),
  trigger_type: z.string().trim().min(1),
  trigger_config: z.record(z.unknown()).optional(),
  graph_json: z
    .object({
      start_key: z.string(),
      nodes: z.array(z.record(z.unknown())),
    })
    .passthrough(),
  workflow_config: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const supabase = createServiceClient()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('q')

    let query = supabase
      .from('automations')
      .select(
        'id, name, description, category, status, trigger_type, tags, total_runs, successful_runs, failed_runs, active_runs, created_at, updated_at, activated_at'
      )
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(200)

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) {
      console.error('[api/automations GET] db error', error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, automations: data ?? [] }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const rawBody = (await request.json()) as Record<string, unknown>

    if ('tenant_id' in rawBody) {
      assertBodyTenantMatches(
        typeof rawBody.tenant_id === 'string' ? rawBody.tenant_id : undefined,
        auth.tenantId
      )
    }

    const parsed = createSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('automations')
      .insert({
        tenant_id: auth.tenantId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        status: 'draft',
        trigger_type: parsed.data.trigger_type,
        trigger_config: parsed.data.trigger_config ?? {},
        graph_json: parsed.data.graph_json,
        workflow_config: parsed.data.workflow_config ?? {},
        tags: parsed.data.tags ?? [],
        created_by_user_id: auth.userId,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[api/automations POST] insert failed', error)
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
