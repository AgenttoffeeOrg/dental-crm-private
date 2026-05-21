/**
 * Phase 2b.21 — Automation step template per-id routes.
 *
 * GET    /api/automations/templates/[id]   fetch
 * PATCH  /api/automations/templates/[id]   update
 * DELETE /api/automations/templates/[id]   soft-delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authErrorResponse, requireAuthenticatedTenantUser } from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  channel: z.enum(['sms', 'whatsapp', 'email']).optional(),
  subject: z.string().nullish(),
  body: z.string().min(1).optional(),
  description: z.string().nullish(),
  tags: z.array(z.string()).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('automation_step_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ ok: true, template: data }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params
    const rawBody = (await request.json()) as Record<string, unknown>
    const parsed = patchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('automation_step_templates')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
    if (error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('automation_step_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
    if (error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
