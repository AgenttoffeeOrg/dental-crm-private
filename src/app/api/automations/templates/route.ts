/**
 * Phase 2b.21 — Automation step templates CRUD root.
 *
 * GET  /api/automations/templates         list
 * POST /api/automations/templates         create
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

const createSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  channel: z.enum(['sms', 'whatsapp', 'email']),
  subject: z.string().nullish(),
  body: z.string().min(1),
  description: z.string().nullish(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const supabase = createServiceClient()
    const url = new URL(request.url)
    const channel = url.searchParams.get('channel')
    let q = supabase
      .from('automation_step_templates')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(200)
    if (channel) q = q.eq('channel', channel)
    const { data, error } = await q
    if (error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, templates: data ?? [] }, { status: 200 })
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
      .from('automation_step_templates')
      .insert({
        tenant_id: auth.tenantId,
        name: parsed.data.name,
        channel: parsed.data.channel,
        subject: parsed.data.subject ?? null,
        body: parsed.data.body,
        description: parsed.data.description ?? null,
        tags: parsed.data.tags ?? [],
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
    return NextResponse.json({ ok: true, template_id: data.id }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
