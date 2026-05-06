/**
 * Phase 2b.1.b.1 — Google Ads API client (Enhanced Conversions for Leads).
 *
 * Responsibilities:
 *   1. Refresh an access token using a stored, encrypted refresh token.
 *   2. Build and POST `customers/<id>:uploadClickConversions` requests.
 *   3. Hash user identifiers (email, phone) per Google's spec.
 *   4. Return a typed result the firing module can record verbatim.
 *
 * Design constraints (from the prompt's "must NOT" list):
 *   - No npm SDK; raw `fetch` + documented JSON body shape only. Easier to audit,
 *     fewer dependencies, simpler to update when API versions move.
 *   - Never log tokens, secrets, or full response bodies (only first 500 chars).
 *
 * API version: see `ADS_API_VERSION` below. Bump when Google deprecates a version
 * (release notes: https://developers.google.com/google-ads/api/docs/release-notes).
 */

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptIntegrationCredential } from '@/lib/crypto/integration-credentials'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/**
 * Google Ads REST API version. Set per the prompt's default.
 * Verify at https://developers.google.com/google-ads/api/docs/release-notes
 * before each phase ships and bump as needed; surface the chosen version in
 * the phase changelog so we can audit which version each tenant first used.
 */
export const ADS_API_VERSION = 'v17'

const ADS_API_HOST = 'https://googleads.googleapis.com'

export interface GoogleAdsConfig {
  customer_id: string
  login_customer_id: string | null
  conversion_action_resource_name: string
  oauth_refresh_token_encrypted: string
}

export interface ClickConversionInput {
  gclid: string
  /** 'YYYY-MM-DD HH:MM:SS+ZZ:ZZ' format. Use formatGoogleAdsTimestamp(). */
  conversion_date_time: string
  conversion_value?: number
  /** Three-letter ISO currency code, e.g. 'GBP'. */
  currency_code?: string
  email?: string
  phone_e164?: string
  /** Stable identifier; we set this to `<deal_id>:<event_type>` for cross-system dedup. */
  order_id?: string
}

export interface UploadResult {
  ok: boolean
  http_status: number
  /** First 500 chars of the response body, for debugging. NEVER contains tokens. */
  response_excerpt: string
  error_message?: string
}

interface RefreshTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: 'Bearer'
}

interface UploadClickConversionsResponseShape {
  partialFailureError?: { message?: string; code?: number }
  results?: unknown[]
}

/**
 * Format a Date as Google Ads' expected `YYYY-MM-DD HH:MM:SS+HH:MM` string.
 * Always emits UTC offset (`+00:00`) for stability — Google accepts any offset
 * but using UTC lets us avoid TZ-locale ambiguity in tests.
 */
export function formatGoogleAdsTimestamp(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`
  )
}

/**
 * SHA-256 hex of a value, lowercase + trimmed first (per Google's EC4L spec
 * for emails). Phone numbers strip non-digit characters first (keeping the
 * leading `+`), then are SHA-256-hashed without lowercasing or trimming
 * (digits-only string is already canonical).
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

export function hashPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/[^0-9+]/g, '')
  return createHash('sha256').update(digits).digest('hex')
}

export class GoogleAdsClient {
  private cachedAccessToken: string | null = null

  constructor(private readonly cfg: GoogleAdsConfig) {}

  /**
   * Exchange the stored refresh token for a fresh access token. Result is cached
   * on the instance for the lifetime of this object (one fire-and-forget per
   * conversion event), so we don't pay the round-trip twice on the retry path.
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken) return this.cachedAccessToken

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not set')
    }

    const refreshToken = decryptIntegrationCredential(
      this.cfg.oauth_refresh_token_encrypted
    )

    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      // NEVER log refreshToken, clientSecret, or the access token. Body excerpt
      // is bounded.
      throw new Error(
        `Google OAuth token refresh failed (HTTP ${res.status}): ${body.slice(0, 300)}`
      )
    }

    const json = (await res.json()) as RefreshTokenResponse
    if (!json.access_token) {
      throw new Error('Google OAuth token refresh returned no access_token')
    }
    this.cachedAccessToken = json.access_token
    return json.access_token
  }

  /**
   * Upload a single click conversion. The HTTP layer is one-shot here; retries
   * on transient 5xx are the caller's responsibility (see fire-conversion-event.ts).
   */
  async uploadClickConversion(input: ClickConversionInput): Promise<UploadResult> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    if (!developerToken) {
      return {
        ok: false,
        http_status: 0,
        response_excerpt: '',
        error_message: 'GOOGLE_ADS_DEVELOPER_TOKEN not set',
      }
    }

    let accessToken: string
    try {
      accessToken = await this.getAccessToken()
    } catch (e) {
      return {
        ok: false,
        http_status: 0,
        response_excerpt: '',
        error_message: (e as Error).message,
      }
    }

    const url = `${ADS_API_HOST}/${ADS_API_VERSION}/customers/${this.cfg.customer_id}:uploadClickConversions`

    const userIdentifiers: Array<Record<string, string>> = []
    if (input.email) userIdentifiers.push({ hashedEmail: hashEmail(input.email) })
    if (input.phone_e164) userIdentifiers.push({ hashedPhoneNumber: hashPhone(input.phone_e164) })

    const conversion: Record<string, unknown> = {
      gclid: input.gclid,
      conversionAction: this.cfg.conversion_action_resource_name,
      conversionDateTime: input.conversion_date_time,
    }
    if (typeof input.conversion_value === 'number') conversion.conversionValue = input.conversion_value
    if (input.currency_code) conversion.currencyCode = input.currency_code
    if (input.order_id) conversion.orderId = input.order_id
    if (userIdentifiers.length > 0) conversion.userIdentifiers = userIdentifiers

    const body = {
      conversions: [conversion],
      partialFailure: true,
      validateOnly: false,
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    }
    if (this.cfg.login_customer_id) {
      headers['login-customer-id'] = this.cfg.login_customer_id
    }

    let res: Response
    try {
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    } catch (e) {
      return {
        ok: false,
        http_status: 0,
        response_excerpt: '',
        error_message: `fetch failed: ${(e as Error).message}`,
      }
    }

    const respText = await res.text()
    const excerpt = respText.slice(0, 500)

    if (!res.ok) {
      return {
        ok: false,
        http_status: res.status,
        response_excerpt: excerpt,
        error_message: `HTTP ${res.status}`,
      }
    }

    // EC4L: Google returns 200 OK with `partialFailureError` when individual rows
    // fail. Surface that as a failure since we only ever upload one conversion at
    // a time (so a partial failure IS a total failure for our caller).
    try {
      const parsed = JSON.parse(respText) as UploadClickConversionsResponseShape
      if (parsed.partialFailureError && parsed.partialFailureError.message) {
        return {
          ok: false,
          http_status: res.status,
          response_excerpt: excerpt,
          error_message: parsed.partialFailureError.message,
        }
      }
    } catch {
      // Body wasn't JSON. The HTTP status was 2xx so we still treat it as ok,
      // but record the excerpt for debugging.
    }

    return { ok: true, http_status: res.status, response_excerpt: excerpt }
  }
}

/**
 * Load the Google Ads config for a tenant. Returns null when:
 *   - no active config row exists, OR
 *   - the row exists but lacks any of the required fields (customer_id /
 *     conversion_action_resource_name / oauth_refresh_token_encrypted).
 */
export async function loadGoogleAdsConfig(
  supabase: SupabaseClient,
  tenantId: string
): Promise<GoogleAdsConfig | null> {
  const { data, error } = await supabase
    .from('google_lead_form_configs')
    .select(
      'customer_id, login_customer_id, conversion_action_resource_name, oauth_refresh_token_encrypted'
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (error || !data) return null
  const row = data as {
    customer_id: string | null
    login_customer_id: string | null
    conversion_action_resource_name: string | null
    oauth_refresh_token_encrypted: string | null
  }
  if (
    !row.customer_id ||
    !row.conversion_action_resource_name ||
    !row.oauth_refresh_token_encrypted
  ) {
    return null
  }
  return {
    customer_id: row.customer_id,
    login_customer_id: row.login_customer_id,
    conversion_action_resource_name: row.conversion_action_resource_name,
    oauth_refresh_token_encrypted: row.oauth_refresh_token_encrypted,
  }
}
