/**
 * Phase 2b.25.2 — Marketing module enable / disable.
 *
 * POST { enabled: true, plan?: 'starter' | 'pro' | 'enterprise' } → flip
 * `tenants.marketing_enabled` ON and stamp `marketing_plan` +
 * `marketing_enabled_at`.
 *
 * POST { enabled: false } → flip OFF and reset plan to 'none'. Data is
 * preserved (campaigns, forms, automations stay in the DB) so re-enabling
 * is a no-op restore.
 *
 * Owner role required. Service-role write so we don't rely on
 * tenants.update RLS being permissive.
 *
 * Why this exists: every `/api/marketing/forms/submit` request gates on
 * `tenants.marketing_enabled` (forms 403 with `MARKETING_DISABLED` when
 * the flag is false). Nothing in /src writes the flag — historically I
 * hand-SQL'd it per tenant. This endpoint closes that self-serve gap.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authErrorResponse, requireAuthenticatedTenantUser } from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.discriminatedUnion('enabled', [
  z.object({
    enabled: z.literal(true),
    plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  }),
  z.object({
    enabled: z.literal(false),
  }),
])

const OWNER_ROLES = new Set(['owner', 'admin'])

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    if (!OWNER_ROLES.has(auth.role ?? '')) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Only owners and admins can toggle the marketing module' },
        { status: 403 }
      )
    }

    const rawBody = (await request.json().catch(() => null)) as unknown
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const patch: Record<string, unknown> = parsed.data.enabled
      ? {
          marketing_enabled: true,
          marketing_plan: parsed.data.plan ?? 'starter',
          marketing_enabled_at: now,
          updated_at: now,
        }
      : {
          marketing_enabled: false,
          marketing_plan: 'none',
          updated_at: now,
        }

    const { error } = await supabase.from('tenants').update(patch).eq('id', auth.tenantId)

    if (error) {
      console.error('[settings/marketing/enable POST] db error', {
        tenantId: auth.tenantId,
        enabled: parsed.data.enabled,
        error: error.message,
      })
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        ok: true,
        enabled: parsed.data.enabled,
        plan: parsed.data.enabled ? (parsed.data.plan ?? 'starter') : 'none',
      },
      { status: 200 }
    )
  } catch (err) {
    return authErrorResponse(err)
  }
}
