/**
 * Phase 2b.8.2 — Communications integrations (integration_settings).
 *
 * Path B (per 2b.7 precedent): authenticated tenant → service-role upsert/read
 * with WHERE pinned to `auth.tenantId`. No rate limit on PATCH (matches 2b.7 §0.3).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertBodyTenantMatches, authErrorResponse, requireAuthenticatedTenantUser } from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CHANNEL_KEYS = ['email', 'sms', 'whatsapp', 'voice'] as const
type IntegrationChannel = (typeof CHANNEL_KEYS)[number]

const CHANNEL_COLUMNS: Record<
  IntegrationChannel,
  { required: readonly string[]; optional: readonly string[]; configuredFlag: string }
> = {
  email: {
    required: ['email_provider', 'email_api_key', 'email_from_address'],
    optional: ['email_from_name'],
    configuredFlag: 'is_email_configured',
  },
  sms: {
    required: ['sms_account_sid', 'sms_auth_token', 'sms_from_number'],
    // Live DB omits sms_messaging_service_sid (prompt §1.3 drift — see docs/2b/2b-8-2-changes.md §3).
    optional: [],
    configuredFlag: 'is_sms_configured',
  },
  whatsapp: {
    required: ['whatsapp_account_sid', 'whatsapp_auth_token', 'whatsapp_from_number'],
    optional: [],
    configuredFlag: 'is_whatsapp_configured',
  },
  voice: {
    required: ['voice_account_sid', 'voice_auth_token', 'voice_from_number'],
    optional: [],
    configuredFlag: 'is_voice_configured',
  },
}

function emptyIntegrationSettings(tenantId: string) {
  return {
    tenant_id: tenantId,
    email_provider: null as string | null,
    email_api_key: null as string | null,
    email_from_address: null as string | null,
    email_from_name: null as string | null,
    email_webhook_url: null as string | null,
    sms_webhook_url: null as string | null,
    whatsapp_webhook_url: null as string | null,
    voice_webhook_url: null as string | null,
    sms_account_sid: null as string | null,
    sms_auth_token: null as string | null,
    sms_from_number: null as string | null,
    whatsapp_account_sid: null as string | null,
    whatsapp_auth_token: null as string | null,
    whatsapp_from_number: null as string | null,
    voice_account_sid: null as string | null,
    voice_auth_token: null as string | null,
    voice_from_number: null as string | null,
    is_email_configured: false,
    is_sms_configured: false,
    is_whatsapp_configured: false,
    is_voice_configured: false,
    created_at: null as string | null,
    updated_at: null as string | null,
  }
}

function addRequiredColumnIssues(
  required: readonly string[],
  payload: Record<string, unknown>,
  ctx: z.RefinementCtx
) {
  for (const col of required) {
    const raw = payload[col]
    if (raw === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', col], message: 'required' })
      continue
    }
    if (typeof raw !== 'string') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', col], message: 'must_be_string' })
    }
  }
}

function addOptionalColumnIssues(
  optional: readonly string[],
  payload: Record<string, unknown>,
  ctx: z.RefinementCtx
) {
  for (const col of optional) {
    if (!(col in payload)) continue
    const v = payload[col]
    if (v !== null && v !== undefined && typeof v !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payload', col],
        message: 'optional_must_be_string_or_null',
      })
    }
  }
}

function addPatchPayloadIssues(
  channel: IntegrationChannel,
  payload: Record<string, unknown>,
  ctx: z.RefinementCtx
) {
  const cfg = CHANNEL_COLUMNS[channel]
  // Empty string on required fields allowed — `is_*_configured` is computed server-side.
  addRequiredColumnIssues(cfg.required, payload, ctx)
  addOptionalColumnIssues(cfg.optional, payload, ctx)
}

const patchBodySchema = z
  .object({
    channel: z.enum(CHANNEL_KEYS),
    payload: z.record(z.unknown()),
    tenant_id: z.string().uuid().optional(),
  })
  .superRefine((body, ctx) =>
    addPatchPayloadIssues(body.channel, (body.payload ?? {}) as Record<string, unknown>, ctx)
  )

function buildWriteRow(channel: IntegrationChannel, payload: Record<string, unknown>) {
  const config = CHANNEL_COLUMNS[channel]
  const allowedColumns = [...config.required, ...config.optional]
  const writeRow: Record<string, unknown> = {}
  for (const col of allowedColumns) {
    if (col in payload) writeRow[col] = payload[col]
  }

  const allRequiredFilled = config.required.every((col) => {
    const val = writeRow[col]
    return typeof val === 'string' && val.trim().length > 0
  })
  writeRow[config.configuredFlag] = allRequiredFilled

  return writeRow
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .maybeSingle()

    if (error) {
      console.error('[settings/communications/integrations GET] db error', error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { ok: true, row: emptyIntegrationSettings(auth.tenantId) },
        { status: 200 }
      )
    }

    return NextResponse.json({ ok: true, row: data }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const rawBody = (await request.json()) as Record<string, unknown>

    if ('tenant_id' in rawBody) {
      assertBodyTenantMatches(
        typeof rawBody.tenant_id === 'string' ? rawBody.tenant_id : undefined,
        auth.tenantId
      )
    }

    const parsed = patchBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { channel, payload } = parsed.data
    const writeRow = buildWriteRow(channel, payload as Record<string, unknown>)

    const supabase = createServiceClient()

    // 2b.25.1: bind the inbound webhook resolver to the same number the
    // operator just typed in. The SMS/WhatsApp inbound routes resolve
    // tenant by `tenants.sms_phone_number` / `tenants.whatsapp_phone_number`,
    // but historically this endpoint only wrote to `integration_settings.*_from_number`.
    // Result: a fresh tenant looked configured but inbound messages 401'd.
    // We update the canonical inbound column FIRST so a half-success state
    // leaves outbound stale rather than inbound silently broken.
    const tenantMirror = inboundNumberMirror(channel, payload as Record<string, unknown>)
    if (tenantMirror) {
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({ [tenantMirror.column]: tenantMirror.value, updated_at: new Date().toISOString() })
        .eq('id', auth.tenantId)
      if (tenantErr) {
        console.error('[settings/communications/integrations PATCH] inbound number mirror failed', {
          tenantId: auth.tenantId,
          column: tenantMirror.column,
          error: tenantErr.message,
        })
        return NextResponse.json(
          { error: 'inbound_number_bind_failed', message: tenantErr.message },
          { status: 500 }
        )
      }
    }

    const { data, error } = await supabase
      .from('integration_settings')
      .upsert(
        {
          tenant_id: auth.tenantId,
          ...writeRow,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[settings/communications/integrations PATCH] db error', error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, row: data }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

/**
 * For sms / whatsapp PATCH bodies, identify the `tenants` column the
 * inbound webhook resolves against and the value we should set it to.
 * Returns null for channels that don't have an inbound counterpart
 * (email, voice — voice tenant binding lives elsewhere).
 *
 * Empty / whitespace-only inputs are normalised to NULL so a practice
 * can unbind their inbound number cleanly.
 */
function inboundNumberMirror(
  channel: IntegrationChannel,
  payload: Record<string, unknown>
): { column: 'sms_phone_number' | 'whatsapp_phone_number'; value: string | null } | null {
  if (channel !== 'sms' && channel !== 'whatsapp') return null
  const fromCol = channel === 'sms' ? 'sms_from_number' : 'whatsapp_from_number'
  if (!(fromCol in payload)) return null
  const raw = payload[fromCol]
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  return {
    column: channel === 'sms' ? 'sms_phone_number' : 'whatsapp_phone_number',
    value: trimmed.length > 0 ? trimmed : null,
  }
}
