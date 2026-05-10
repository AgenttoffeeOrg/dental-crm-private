import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { smsService } from '@/lib/sms-service'
import { detectAndFireFirstResponse } from '@/lib/conversions/first-response-detector'
import {
  AuthApiError,
  requireAuthenticatedTenantUser,
  assertBodyTenantMatches,
  enforceOutboundRateLimit,
  authErrorResponse,
} from '@/lib/auth/api-auth-helpers'

/**
 * Phase 2b.5 — single auth/rate-limit prelude. Extracted so the POST
 * handler stays under the line-of-code lint limit.
 */
async function authAndRateLimit(request: NextRequest): Promise<{
  auth: Awaited<ReturnType<typeof requireAuthenticatedTenantUser>>
  body: { tenant_id?: string; to?: string; message?: string; contact_id?: string; deal_id?: string }
}> {
  const auth = await requireAuthenticatedTenantUser(request)
  const body = await request.json()
  assertBodyTenantMatches(body?.tenant_id, auth.tenantId)
  await enforceOutboundRateLimit(auth.tenantId, 'sms')
  return { auth, body }
}

/**
 * Phase 2b.1.b.1 — extracted to keep route handler cyclomatic complexity ≤ 8.
 * Best-effort: detector itself never throws, but we don't want even the
 * `if (deal_id)` branch counted in POST.
 */
async function maybeFireFirstResponse(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string | null | undefined,
  dealId: string | null | undefined,
  occurredAt: string
): Promise<void> {
  if (!dealId) return
  await detectAndFireFirstResponse(
    {
      tenant_id: tenantId,
      contact_id: contactId ?? null,
      deal_id: dealId,
      direction: 'outbound',
      occurred_at: occurredAt,
    },
    supabase
  )
}

export async function POST(request: NextRequest) {
  try {
    // Phase 2b.5 — auth + tenant scoping + rate limit. Closes D03 §1.
    const { auth, body } = await authAndRateLimit(request)
    const tenant_id = auth.tenantId
    const { to, message, contact_id, deal_id } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant SMS config
    const { data: tenant } = await supabase
      .from('tenants')
      .select('sms_provider, sms_api_key, sms_api_secret, sms_from_number')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.sms_api_key) {
      return NextResponse.json(
        { error: 'SMS not configured. Please configure in Settings → SMS' },
        { status: 400 }
      )
    }

    // Initialize SMS service
    await smsService.initialize(tenant.sms_api_key, tenant.sms_api_secret!, tenant.sms_from_number!)

    // Send SMS
    const result = await smsService.send({ to, message })

    // Log activity using canonical activities columns: to_number/from_number/
    // message_status (the older sms_to/sms_from/sms_status names don't exist
    // on the live table, so the previous payload silently dropped fields).
    const occurredAt = new Date().toISOString()
    await supabase.from('activities').insert({
      tenant_id,
      contact_id,
      deal_id,
      type: 'sms',
      direction: 'outbound',
      subject: 'SMS Sent',
      description: message,
      occurred_at: occurredAt,
      to_number: to,
      from_number: tenant.sms_from_number,
      message_status: 'sent',
      external_id: result.messageId
    })

    // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if this
    // is the first outbound activity for the deal. Best-effort — the detector
    // never throws. The helper handles deal_id absence and contact_id nullishness.
    await maybeFireFirstResponse(supabase, tenant_id, contact_id, deal_id, occurredAt)

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error: unknown) {
    if (error instanceof AuthApiError) {
      return authErrorResponse(error)
    }
    console.error('Send SMS error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


