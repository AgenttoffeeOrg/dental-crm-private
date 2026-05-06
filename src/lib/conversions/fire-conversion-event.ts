/**
 * Phase 2b.1.b.1 — fire a single conversion event to Google Ads, with the
 * idempotency + skip + retry rules captured in the prompt's engineering
 * decisions table.
 *
 * The function NEVER throws on Google's behalf — every failure mode produces a
 * `conversion_events_fired` row with an explanatory `status`. Callers wrap this
 * in their own try/catch and treat it as best-effort: a Google API outage must
 * never poison ingestion.
 *
 * Decision recap:
 *   - Synchronous, inline, blocking — adds ~300-600 ms but BullMQ in this repo
 *     is fragile (F05 P0 #9).
 *   - Idempotency = one `success` row per (deal_id, event_type, platform).
 *     Enforced both at the application layer (pre-fire SELECT) AND at the DB
 *     layer (partial UNIQUE index). Skipped/failed rows are unlimited.
 *   - Missing gclid → record `skipped_no_gclid` and return; don't call Google.
 *   - Missing or partial tenant config → record `skipped_other`.
 *   - 5xx response → 1 retry after 800ms, then give up.
 *   - 4xx response → no retry (caller-side error).
 *   - Order-id sent as `<deal_id>:<event_type>` so Google itself can dedup
 *     events keyed on the same deal across our own retries.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import {
  GoogleAdsClient,
  formatGoogleAdsTimestamp,
  loadGoogleAdsConfig,
  type GoogleAdsConfig,
  type ClickConversionInput,
  type UploadResult,
} from './google-ads-client'

export type ConversionEventType = 'Lead' | 'FirstResponse'

export interface FireConversionInput {
  tenant_id: string
  deal_id: string
  contact_id: string
  event_type: ConversionEventType
  gclid: string | null
  email: string | null
  phone_e164: string | null
  /** ISO-8601. Used as `conversion_date_time` after formatting. */
  occurred_at: string
}

interface FiredRowInsert {
  tenant_id: string
  deal_id: string
  contact_id: string
  platform: 'google_ads'
  event_type: ConversionEventType
  conversion_action_resource_name?: string | null
  gclid?: string | null
  occurred_at: string
  status: 'success' | 'failure' | 'skipped_no_gclid' | 'skipped_other'
  http_status?: number | null
  response_excerpt?: string | null
  error_message?: string | null
  retry_count?: number
}

const DEFAULT_CURRENCY = 'GBP'
const RETRY_DELAY_MS = 800

/**
 * Public entry point. Always best-effort: never throws, always records.
 * The internal helpers below all return without throwing too — every error
 * path lands on a `conversion_events_fired` row.
 */
export async function fireGoogleConversionEvent(
  input: FireConversionInput,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createServiceClient()

  // Fast path: already succeeded for this (deal, event, platform). Nothing to do.
  if (await alreadySucceeded(supabase, input)) return

  // No gclid → record skip, never call Google.
  if (!input.gclid) {
    await recordRow(supabase, {
      ...baseRow(input),
      gclid: null,
      status: 'skipped_no_gclid',
    })
    console.warn('[conversions/google] skipped: no gclid', {
      tenant_id: input.tenant_id,
      deal_id: input.deal_id,
      event_type: input.event_type,
    })
    return
  }

  // No tenant config → record skip.
  const cfg = await loadGoogleAdsConfig(supabase, input.tenant_id)
  if (!cfg) {
    await recordRow(supabase, {
      ...baseRow(input),
      gclid: input.gclid,
      status: 'skipped_other',
      error_message: 'No active Google Ads config (or missing customer_id / conversion_action / refresh token)',
    })
    return
  }

  // Fire (with 1 retry on 5xx). Outcome is recorded verbatim.
  const result = await fireWithRetry(cfg, input)
  await recordRow(supabase, {
    ...baseRow(input),
    conversion_action_resource_name: cfg.conversion_action_resource_name,
    gclid: input.gclid,
    status: result.outcome.ok ? 'success' : 'failure',
    http_status: result.outcome.http_status,
    response_excerpt: result.outcome.response_excerpt,
    error_message: result.outcome.error_message,
    retry_count: result.attempts - 1,
  })
}

function baseRow(input: FireConversionInput): FiredRowInsert {
  return {
    tenant_id: input.tenant_id,
    deal_id: input.deal_id,
    contact_id: input.contact_id,
    platform: 'google_ads',
    event_type: input.event_type,
    occurred_at: input.occurred_at,
    status: 'skipped_other',
  }
}

async function alreadySucceeded(
  supabase: SupabaseClient,
  input: FireConversionInput
): Promise<boolean> {
  const { data, error } = await supabase
    .from('conversion_events_fired')
    .select('id')
    .eq('deal_id', input.deal_id)
    .eq('event_type', input.event_type)
    .eq('platform', 'google_ads')
    .eq('status', 'success')
    .maybeSingle()
  if (error) {
    // Don't block firing on a SELECT failure — but log it. The DB unique index
    // catches double-success at INSERT time anyway.
    console.warn('[conversions/google] alreadySucceeded check failed', {
      deal_id: input.deal_id,
      event_type: input.event_type,
      error_message: error.message,
    })
    return false
  }
  return Boolean(data)
}

async function fireWithRetry(
  cfg: GoogleAdsConfig,
  input: FireConversionInput
): Promise<{ outcome: UploadResult; attempts: number }> {
  const adsClient = new GoogleAdsClient(cfg)
  const conversionInput: ClickConversionInput = {
    gclid: input.gclid as string,
    conversion_date_time: formatGoogleAdsTimestamp(new Date(input.occurred_at)),
    email: input.email ?? undefined,
    phone_e164: input.phone_e164 ?? undefined,
    order_id: `${input.deal_id}:${input.event_type}`,
    currency_code: DEFAULT_CURRENCY,
  }

  const first = await adsClient.uploadClickConversion(conversionInput)
  if (first.ok || first.http_status < 500) {
    return { outcome: first, attempts: 1 }
  }

  // 5xx: wait and retry once.
  await sleep(RETRY_DELAY_MS)
  const second = await adsClient.uploadClickConversion(conversionInput)
  return { outcome: second, attempts: 2 }
}

async function recordRow(
  supabase: SupabaseClient,
  row: FiredRowInsert
): Promise<void> {
  const { error } = await supabase.from('conversion_events_fired').insert(row)
  if (error) {
    // Last-resort log. We deliberately don't throw — the caller's contract is
    // "never poison ingestion / activity write". A failed audit-log INSERT is
    // bad but not fatal.
    console.error('[conversions/google] failed to record conversion_events_fired row', {
      deal_id: row.deal_id,
      event_type: row.event_type,
      status: row.status,
      error_message: error.message,
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
