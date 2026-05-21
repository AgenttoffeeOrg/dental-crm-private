/**
 * Phase 2b.22 — Seed a tenant with the inbound prebuilt automations.
 *
 * POST /api/automations/seed
 * Body: { keys?: string[]; replace?: boolean }
 *   keys     — subset of prebuilt_keys to install. Default = all.
 *   replace  — if true, soft-delete any existing automation tagged
 *              with the same prebuilt_key before re-installing
 *              ("restore defaults" path). Default false → idempotent
 *              skip when a prebuilt with that key is already
 *              present.
 *
 * Also bootstraps a tenant_ai_context row if missing (Practice Brain
 * stub) so the AI features have something to read.
 *
 * Auth: requireAuthenticatedTenantUser. Service-role client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireAuthenticatedTenantUser,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'
import { INBOUND_PREBUILTS } from '@/lib/automations/inbound-prebuilts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  keys: z.array(z.string()).optional(),
  replace: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const rawBody = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const supabase = createServiceClient()

    // Ensure Practice Brain row exists.
    await supabase
      .from('tenant_ai_context')
      .upsert(
        { tenant_id: auth.tenantId },
        { onConflict: 'tenant_id', ignoreDuplicates: true }
      )

    const wantedKeys = new Set(
      parsed.data.keys && parsed.data.keys.length > 0
        ? parsed.data.keys
        : INBOUND_PREBUILTS.map((p) => p.prebuilt_key)
    )
    const replace = parsed.data.replace === true

    // Existing prebuilt rows on this tenant, keyed by prebuilt_key tag.
    const { data: existingRows } = await supabase
      .from('automations')
      .select('id, tags')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .contains('tags', ['prebuilt'])

    const existingByKey = new Map<string, string>()
    for (const row of (existingRows as Array<{ id: string; tags: string[] | null }> | null) ?? []) {
      const key = (row.tags ?? []).find((t) => t !== 'prebuilt')
      if (key) existingByKey.set(key, row.id)
    }

    const installed: string[] = []
    const skipped: string[] = []
    const replaced: string[] = []

    for (const prebuilt of INBOUND_PREBUILTS) {
      if (!wantedKeys.has(prebuilt.prebuilt_key)) continue
      const existing = existingByKey.get(prebuilt.prebuilt_key)
      if (existing && !replace) {
        skipped.push(prebuilt.prebuilt_key)
        continue
      }
      if (existing && replace) {
        await supabase
          .from('automations')
          .update({ deleted_at: new Date().toISOString(), status: 'archived' })
          .eq('id', existing)
          .eq('tenant_id', auth.tenantId)
        replaced.push(prebuilt.prebuilt_key)
      }
      const { data, error } = await supabase
        .from('automations')
        .insert({
          tenant_id: auth.tenantId,
          name: prebuilt.name,
          description: prebuilt.description,
          category: prebuilt.category,
          status: 'draft',
          trigger_type: prebuilt.trigger_type,
          trigger_config: prebuilt.trigger_config,
          graph_json: prebuilt.graph_json,
          workflow_config: prebuilt.workflow_config,
          tags: prebuilt.tags,
          created_by_user_id: auth.userId,
        })
        .select('id')
        .single()
      if (error || !data) {
        return NextResponse.json(
          {
            error: 'db_error',
            message: error?.message ?? 'insert failed',
            installed,
            replaced,
            skipped,
          },
          { status: 500 }
        )
      }
      installed.push(prebuilt.prebuilt_key)
    }

    return NextResponse.json(
      { ok: true, installed, replaced, skipped },
      { status: 200 }
    )
  } catch (err) {
    return authErrorResponse(err)
  }
}
