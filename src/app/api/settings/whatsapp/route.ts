import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  AuthApiError,
  requireAuthenticatedTenantUser,
  assertBodyTenantMatches,
  authErrorResponse,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Phase 2b.7 — Auth-gate `PATCH /api/settings/whatsapp`. Closes audit
 * P0 #1 (anonymous credential rotation).
 *
 * 2b.7 — tenants RLS is service-role-only; helper resolves the
 * authenticated tenantId and we pin the WHERE clause to it. Body
 * `tenant_id` is asserted-and-overridden in the prelude — never read
 * from the body for the DB write.
 *
 * Gotcha (audit §7.4): `tenants.whatsapp_phone_number` is also read by
 * the inbound WhatsApp routing logic. This auth fix doesn't change the
 * read path — it just prevents anonymous attackers from rotating the
 * number out from under inbound delivery.
 *
 * No rate limit (locked decision §0.3). No `requireEntitlement`.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)

    // `payload` not `body` — SWC strict-block-scoping trap (2b.5 §9.2.a).
    const payload = await request.json()

    assertBodyTenantMatches(payload?.tenant_id, auth.tenantId)

    // Body `tenant_id` is intentionally NOT destructured: we pin the
    // WHERE to auth.tenantId below; the body's value is never the
    // source of truth for the DB write.
    const {
      whatsapp_phone_number,
      whatsapp_api_key,
      whatsapp_api_secret,
    } = payload

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        whatsapp_phone_number,
        whatsapp_api_key,
        whatsapp_api_secret,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.tenantId)
      .select()
      .single()

    if (error) {
      console.error('settings.whatsapp.PATCH', error)
      return NextResponse.json(
        { error: 'update_failed', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (err instanceof AuthApiError) {
      return authErrorResponse(err)
    }
    console.error('settings.whatsapp.PATCH.unhandled', err)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
