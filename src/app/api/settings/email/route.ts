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
 * Phase 2b.7 — Auth-gate `PATCH /api/settings/email`. Closes audit
 * P0 #1 (anonymous credential rotation).
 *
 * 2b.7 — tenants RLS is service-role-only; helper resolves the
 * authenticated tenantId and we pin the WHERE clause to it. Body
 * `tenant_id` is asserted-and-overridden in the prelude — never read
 * from the body for the DB write.
 *
 * No rate limit (locked decision §0.3: rotating creds is not rate-limited).
 * No `requireEntitlement` (settings are part of crm_base).
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Resolve authenticated tenant (401 / 403 from helper).
    const auth = await requireAuthenticatedTenantUser(request)

    // 2. Parse body. Named `payload` to dodge the SWC strict-block-scoping
    //    trap (2b.5 §9.2.a) — never re-declare `const body = …` later.
    const payload = await request.json()

    // 3. Defense in depth: if the client included tenant_id, it must
    //    match the authenticated tenant. No-op if absent.
    assertBodyTenantMatches(payload?.tenant_id, auth.tenantId)

    // 4. Pull only the fields we persist. The body's `tenant_id` is
    //    intentionally NOT destructured: we pin the WHERE to
    //    auth.tenantId below; the body's value is never the source of
    //    truth for the DB write. `enable_tracking`, if present, is
    //    dropped (audit §7.2; column was never persisted).
    const {
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_encryption,
      default_from_name,
      default_from_address,
      default_reply_to,
    } = payload

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password,
        smtp_encryption,
        default_email_from_name: default_from_name,
        default_email_from_address: default_from_address,
        default_email_reply_to: default_reply_to,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.tenantId)
      .select()
      .single()

    if (error) {
      console.error('settings.email.PATCH', error)
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
    console.error('settings.email.PATCH.unhandled', err)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
