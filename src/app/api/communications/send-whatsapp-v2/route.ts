import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { whatsappService } from '@/lib/whatsapp-service'
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
  body: {
    tenant_id?: string
    to?: string
    message?: string
    contact_id?: string
    deal_id?: string
    mediaUrl?: string
  }
}> {
  const auth = await requireAuthenticatedTenantUser(request)
  const body = await request.json()
  assertBodyTenantMatches(body?.tenant_id, auth.tenantId)
  await enforceOutboundRateLimit(auth.tenantId, 'whatsapp')
  return { auth, body }
}

interface WhatsAppActivityArgs {
  tenant_id: string
  contact_id?: string | null
  deal_id?: string | null
  to: string
  message: string
  fromNumber: string
  externalId: string
  occurredAt: string
}

async function dispatchAndLogWhatsApp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenant: { whatsapp_api_key: string; whatsapp_api_secret: string | null; whatsapp_phone_number: string | null },
  payload: { tenant_id: string; to: string; message: string; mediaUrl?: string; contact_id?: string | null; deal_id?: string | null }
): Promise<{ messageId: string; occurredAt: string }> {
  await whatsappService.initialize(
    tenant.whatsapp_api_key,
    tenant.whatsapp_api_secret!,
    tenant.whatsapp_phone_number!
  )
  const result = await whatsappService.send({
    to: payload.to,
    message: payload.message,
    mediaUrl: payload.mediaUrl,
  })
  const occurredAt = new Date().toISOString()
  await logWhatsAppOutboundActivity(supabase, {
    tenant_id: payload.tenant_id,
    contact_id: payload.contact_id,
    deal_id: payload.deal_id,
    to: payload.to,
    message: payload.message,
    fromNumber: tenant.whatsapp_phone_number!,
    externalId: result.messageId,
    occurredAt,
  })
  return { messageId: result.messageId, occurredAt }
}

async function logWhatsAppOutboundActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: WhatsAppActivityArgs
): Promise<void> {
  // Canonical activities columns: to_number/from_number/message_status.
  // The legacy whatsapp_to/whatsapp_from/whatsapp_status names don't
  // exist on the live table.
  await supabase.from('activities').insert({
    tenant_id: args.tenant_id,
    contact_id: args.contact_id,
    deal_id: args.deal_id,
    type: 'whatsapp',
    direction: 'outbound',
    subject: 'WhatsApp Sent',
    description: args.message,
    occurred_at: args.occurredAt,
    to_number: args.to,
    from_number: args.fromNumber,
    message_status: 'sent',
    external_id: args.externalId,
  })
}

/**
 * Phase 2b.1.b.1 — extracted to keep route handler cyclomatic complexity ≤ 8.
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
    const { to, message, contact_id, deal_id, mediaUrl } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant WhatsApp config
    const { data: tenant } = await supabase
      .from('tenants')
      .select('whatsapp_api_key, whatsapp_api_secret, whatsapp_phone_number')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.whatsapp_api_key) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Please configure in Settings → WhatsApp' },
        { status: 400 }
      )
    }

    const { messageId, occurredAt } = await dispatchAndLogWhatsApp(supabase, tenant, {
      tenant_id,
      to,
      message,
      mediaUrl,
      contact_id,
      deal_id,
    })

    // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if this
    // is the first outbound activity for the deal. Best-effort — the detector
    // never throws. The helper handles deal_id absence and contact_id nullishness.
    await maybeFireFirstResponse(supabase, tenant_id, contact_id, deal_id, occurredAt)

    return NextResponse.json({ success: true, messageId })
  } catch (error: unknown) {
    if (error instanceof AuthApiError) {
      return authErrorResponse(error)
    }
    console.error('Send WhatsApp error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


