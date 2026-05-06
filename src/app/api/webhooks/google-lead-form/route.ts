/**
 * API ENDPOINT: Google Lead Form webhook (Phase 2b.1.a)
 *
 * Receives POSTs from Google Lead Form Extensions, resolves the tenant via
 * the per-tenant `google_key` (UUID provisioned with the CLI script in
 * scripts/phase-2b/generate-google-webhook-key.ts), adapts the payload, and
 * delegates to the canonical `ingestLead()` engine.
 *
 * The engine handles dedup, SLA resolution, deal creation, attribution
 * touchpoints, activities, and `lead.arrived` notifications consistently
 * with every other channel.
 *
 * Response contract (per Google's docs):
 *   200 { status: 'ok', lead_id, contact_id, deal_id }
 *   400 (empty body) — malformed JSON, missing required fields, or no
 *                      identity claim (engine validation error). Google does
 *                      NOT retry on 4xx, which is what we want for these.
 *   401 (empty body) — unknown / inactive webhook key. Empty body to avoid
 *                      leaking which keys exist.
 *   405 (empty body) — non-POST method.
 *   500 (empty body) — DB lookup error or unexpected ingestion failure.
 *                      Google retries on 5xx with backoff, which is correct
 *                      for transient infra issues.
 *
 * Idempotency:
 *   event_id = `google-lead:<form_id>:<lead_id>` — Google's `lead_id` is
 *   unique per form so this survives Google's at-least-once retries via the
 *   UNIQUE index on `attribution_touchpoints.event_id`. The engine
 *   short-circuits to `idempotent_replay: true` and we still return 200.
 *
 * Logging:
 *   We never log the full payload at info level (PII). Logged fields are
 *   restricted to lead_id, form_id, tenant_id, source IP, and error message.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { ingestLead, IngestLeadValidationError } from '@/lib/lead-ingestion/ingest-lead'
import {
  mapGoogleLeadFormPayload,
  type GoogleLeadFormPayload,
} from '@/lib/lead-ingestion/adapters/google-lead-form-adapter'

export async function POST(req: NextRequest) {
  const requestIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined

  // 1) Parse JSON. Reject malformed bodies early.
  let payload: GoogleLeadFormPayload
  try {
    payload = (await req.json()) as GoogleLeadFormPayload
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  // 2) Minimum structural validation. We deliberately don't 500 on any of
  //    these — they're caller-side errors, not server faults.
  if (
    !payload ||
    typeof payload.google_key !== 'string' ||
    typeof payload.lead_id !== 'string' ||
    payload.form_id === undefined ||
    payload.form_id === null ||
    !Array.isArray(payload.user_column_data)
  ) {
    return new NextResponse(null, { status: 400 })
  }

  // 3) Resolve tenant by webhook key. UNIQUE on webhook_key + partial UNIQUE
  //    on (tenant_id) WHERE is_active means at most one row matches.
  const supabase = createServiceClient()
  const { data: configRow, error: cfgErr } = await supabase
    .from('google_lead_form_configs')
    .select('tenant_id, is_active')
    .eq('webhook_key', payload.google_key)
    .eq('is_active', true)
    .maybeSingle()

  if (cfgErr) {
    console.error('[google-lead-form] config lookup failed', {
      route: '/api/webhooks/google-lead-form',
      lead_id: payload.lead_id,
      form_id: String(payload.form_id),
      ip: requestIp,
      error_message: cfgErr.message,
    })
    return new NextResponse(null, { status: 500 })
  }

  if (!configRow) {
    // Wrong key, inactive config, or someone probing. 401, no body. We log
    // at warn so the operator can investigate genuine misconfigurations
    // without alerting on every drive-by probe.
    console.warn('[google-lead-form] unknown webhook key', {
      route: '/api/webhooks/google-lead-form',
      lead_id: payload.lead_id,
      form_id: String(payload.form_id),
      ip: requestIp,
    })
    return new NextResponse(null, { status: 401 })
  }

  // 4) Adapt payload → engine input.
  const input = mapGoogleLeadFormPayload(
    payload,
    configRow.tenant_id,
    requestIp
  )

  // 4a) is_test → tag the touchpoint so practices can run Google's Lead Form
  //     Tester end-to-end without polluting their reports. The engine writes
  //     raw_payload into metadata.raw_payload verbatim, so __is_test will
  //     appear at metadata.raw_payload.__is_test.
  if (payload.is_test === true) {
    ;(input.raw_payload as Record<string, unknown>).__is_test = true
  }

  // 5) Stable idempotency key across Google's retries.
  const formIdStr = String(payload.form_id)
  const eventId = `google-lead:${formIdStr}:${payload.lead_id}`

  // 6) Call the engine.
  try {
    const result = await ingestLead({
      ...input,
      event_id: eventId,
    })

    return NextResponse.json(
      {
        status: 'ok',
        lead_id: payload.lead_id,
        contact_id: result.contact_id,
        deal_id: result.deal_id ?? null,
      },
      { status: 200 }
    )
  } catch (err) {
    if (err instanceof IngestLeadValidationError) {
      // Validation error (no_identity / invalid_source_channel /
      // missing_tenant) → 400. Google won't retry, which is correct: a
      // payload with no email/phone is malformed at the practice's end.
      console.warn('[google-lead-form] validation error', {
        route: '/api/webhooks/google-lead-form',
        lead_id: payload.lead_id,
        form_id: formIdStr,
        tenant_id: configRow.tenant_id,
        code: err.code,
        message: err.message,
      })
      return new NextResponse(null, { status: 400 })
    }

    // Everything else → 500. Google retries 5xx with backoff, which is what
    // we want for transient DB blips.
    const e = err as Error
    console.error('[google-lead-form] ingest failed', {
      route: '/api/webhooks/google-lead-form',
      lead_id: payload.lead_id,
      form_id: formIdStr,
      tenant_id: configRow.tenant_id,
      error_message: e?.message ?? String(err),
    })
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * Google Lead Forms doesn't use a verification GET like Meta does. Reject
 * any non-POST method so accidental browser GETs don't surface internal info.
 */
export async function GET() {
  return new NextResponse(null, { status: 405 })
}
