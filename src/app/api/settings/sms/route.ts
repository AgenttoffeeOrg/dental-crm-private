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
 * Phase 2b.7 — Auth-gate `PATCH /api/settings/sms`. Closes audit
 * P0 #1 (anonymous credential rotation).
 *
 * 2b.7 — tenants RLS is service-role-only; helper resolves the
 * authenticated tenantId and we pin the WHERE clause to it. Body
 * `tenant_id` is asserted-and-overridden in the prelude — never read
 * from the body for the DB write.
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
      sms_provider,
      sms_api_key,
      sms_api_secret,
      sms_from_number,
    } = payload

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        sms_provider,
        sms_api_key,
        sms_api_secret,
        sms_from_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.tenantId)
      .select()
      .single()

    if (error) {
      console.error('settings.sms.PATCH', error)
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
    console.error('settings.sms.PATCH.unhandled', err)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
