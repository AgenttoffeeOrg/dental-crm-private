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
export const ADS_API_VERSION = 'v24'

const ADS_API_HOST = 'https://googleads.googleapis.com'

export interface GoogleAdsConfig {
  /**
   * Required for `uploadClickConversion` (path segment) and for the URL of
   * `listConversionActions` (when the user picks one before saving). Optional
   * because the bootstrap call `listAccessibleCustomers` doesn't need it —
   * we construct a client with `customer_id: undefined` for the
   * customer-picker UI in 2b.1.b.2.
   */
  customer_id?: string
  login_customer_id?: string | null
  /** Required for `uploadClickConversion`; not used by the list methods. */
  conversion_action_resource_name?: string
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
 * Phase 2b.1.b.2: thrown by `listAccessibleCustomers` / `listConversionActions`
 * when Google returns a 401. Callers (the customer / conversion-action picker
 * routes) catch this specifically to render a "reconnect" prompt and to
 * pre-emptively null out the OAuth fields on the config row, rather than
 * surfacing a generic error.
 */
export class GoogleOAuthRevokedError extends Error {
  constructor(message = 'Google OAuth credentials were revoked or are invalid') {
    super(message)
    this.name = 'GoogleOAuthRevokedError'
  }
}

/**
 * Phase 2b.1.b.2: thrown for any non-2xx Google Ads response that ISN'T a 401.
 * Carries the HTTP status and a 500-char excerpt so the caller can surface a
 * useful detail to the user without leaking tokens.
 */
export class GoogleAdsApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly responseExcerpt: string,
    message?: string
  ) {
    super(message ?? `Google Ads API error (HTTP ${httpStatus})`)
    this.name = 'GoogleAdsApiError'
  }
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
    if (!this.cfg.customer_id || !this.cfg.conversion_action_resource_name) {
      // Defensive: a client constructed for `listAccessibleCustomers` lacks
      // these fields. The conversion-firing path builds the client via
      // `loadGoogleAdsConfig()` which only returns when both are present,
      // so this branch should never trigger in production.
      return {
        ok: false,
        http_status: 0,
        response_excerpt: '',
        error_message: 'GoogleAdsClient missing customer_id or conversion_action_resource_name',
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

    // GOOGLE_ADS_VALIDATE_ONLY=true switches the request to Google's
    // validateOnly mode (request is structurally validated but the conversion
    // is NOT ingested). Used during 2b.1.b.1 Vercel validation — synthesising
    // a real gclid for a test customer is not possible, so validateOnly is
    // Google's documented test path. MUST default to false in production:
    // the env var is read on every call so toggling it requires a redeploy
    // (or env-var change + new function instance), not a runtime flip.
    const validateOnly = process.env.GOOGLE_ADS_VALIDATE_ONLY === 'true'

    const body = {
      conversions: [conversion],
      partialFailure: true,
      validateOnly,
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

  /**
   * List Google Ads accounts the connected user has access to.
   *
   * Calls `customers:listAccessibleCustomers` — note this endpoint does NOT
   * accept a login-customer-id header (per Google's docs the call is scoped
   * to the OAuth user, not to a manager). Response shape:
   *   { resourceNames: ["customers/<id>", ...] }
   * We parse the trailing numeric id off each resource name.
   *
   * This is the bootstrap call for the Settings UI customer-picker — it lets
   * us populate the dropdown WITHOUT requiring the user to type a customer
   * ID first.
   */
  async listAccessibleCustomers(): Promise<
    Array<{ customer_id: string; resource_name: string }>
  > {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN not set')
    }
    const accessToken = await this.getAccessToken()
    const url = `${ADS_API_HOST}/${ADS_API_VERSION}/customers:listAccessibleCustomers`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    })

    if (!res.ok) {
      throwForStatus(res.status, await res.text())
    }

    const json = (await res.json()) as { resourceNames?: unknown }
    const names = Array.isArray(json.resourceNames) ? (json.resourceNames as unknown[]) : []
    return names
      .filter((n): n is string => typeof n === 'string')
      .map((resource_name) => {
        // resource name is `customers/<id>`; the trailing segment is the id.
        const customer_id = resource_name.split('/').pop() ?? ''
        return { customer_id, resource_name }
      })
      .filter((row) => row.customer_id.length > 0)
  }

  /**
   * List ENABLED, LEAD-category conversion actions in a given customer.
   *
   * Uses GoogleAds:search GAQL. If `loginCustomerId` is set we send it as
   * the `login-customer-id` header (required when the customer is reached
   * via a manager / MCC account).
   *
   * Phase 2b is Lead-only. Future phases may broaden this filter to PURCHASE
   * etc.; if so, add a `category` parameter to this method rather than
   * inlining new categories here.
   */
  async listConversionActions(
    customerId: string,
    loginCustomerId?: string
  ): Promise<
    Array<{
      id: string
      resource_name: string
      name: string
      category: string
      status: string
    }>
  > {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN not set')
    }
    const accessToken = await this.getAccessToken()
    const url = `${ADS_API_HOST}/${ADS_API_VERSION}/customers/${customerId}/googleAds:search`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    }
    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId
    }

    // Full GAQL string is asserted character-for-character in the unit tests so
    // a future copy-paste edit doesn't silently change the filter.
    const query =
      "SELECT conversion_action.id, conversion_action.resource_name, " +
      "conversion_action.name, conversion_action.category, " +
      "conversion_action.status FROM conversion_action WHERE " +
      "conversion_action.status = 'ENABLED' AND " +
      "conversion_action.category = 'LEAD'"

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    })

    if (!res.ok) {
      throwForStatus(res.status, await res.text())
    }

    const parsed = (await res.json()) as {
      results?: Array<{
        conversionAction?: {
          id?: string | number
          resourceName?: string
          name?: string
          category?: string
          status?: string
        }
      }>
    }

    const results = Array.isArray(parsed.results) ? parsed.results : []
    return parseConversionActions(results)
  }
}

function isUsableConversionAction(c: {
  id: string
  resource_name: string
}): boolean {
  return c.id.length > 0 && c.resource_name.length > 0
}

function parseConversionActions(
  results: Array<{ conversionAction?: RawConversionAction }>
): Array<{
  id: string
  resource_name: string
  name: string
  category: string
  status: string
}> {
  const rows: Array<{
    id: string
    resource_name: string
    name: string
    category: string
    status: string
  }> = []
  for (const entry of results) {
    const row = toConversionActionRow(entry.conversionAction ?? {})
    if (isUsableConversionAction(row)) rows.push(row)
  }
  return rows
}

interface RawConversionAction {
  id?: string | number
  resourceName?: string
  name?: string
  category?: string
  status?: string
}

function nullishToEmpty(v: string | undefined): string {
  return typeof v === 'string' ? v : ''
}

function toConversionActionRow(c: RawConversionAction): {
  id: string
  resource_name: string
  name: string
  category: string
  status: string
} {
  const rawId = c.id
  const idStr = rawId === undefined || rawId === null ? '' : String(rawId)
  return {
    id: idStr,
    resource_name: nullishToEmpty(c.resourceName),
    name: nullishToEmpty(c.name),
    category: nullishToEmpty(c.category),
    status: nullishToEmpty(c.status),
  }
}

/**
 * Map a Google HTTP status into our two error classes. Extracted so both
 * `listAccessibleCustomers` and `listConversionActions` stay under the
 * Lizard cyclomatic-complexity limit.
 *
 * 401 classification (refined per Phase 2b.1.b.2 §3 row L): the original
 * implementation treated EVERY 401 as `GoogleOAuthRevokedError`, which routes
 * then handle by NULL-ing all OAuth fields on the active row. That is correct
 * when the refresh token is genuinely revoked (`error.status ===
 * 'UNAUTHENTICATED'`), but Google ALSO returns 401 for "developer token has
 * no access to this customer," "customer not in this manager's hierarchy,"
 * and similar non-OAuth permission failures (`error.status ===
 * 'PERMISSION_DENIED'` etc.). Treating those as "revoke OAuth" was destructive:
 * one wrong customer pick during the picker UI silently disconnected the
 * tenant's OAuth and forced them to redo the consent dance. We now only
 * surface `GoogleOAuthRevokedError` when the body explicitly says
 * `UNAUTHENTICATED`; everything else falls through to `GoogleAdsApiError`,
 * which the routes report as a recoverable error without touching the row.
 */
function throwForStatus(status: number, body: string): never {
  const excerpt = body.slice(0, 500)
  if (status === 401 && looksLikeUnauthenticated(body)) {
    throw new GoogleOAuthRevokedError(`Google returned 401: ${excerpt.slice(0, 200)}`)
  }
  throw new GoogleAdsApiError(status, excerpt)
}

function looksLikeUnauthenticated(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as {
      error?: { status?: string; message?: string }
    }
    const status = parsed?.error?.status
    if (status === 'UNAUTHENTICATED') return true
    // Some Google Ads 401 responses don't include `status` at the top level;
    // fall back to message-string heuristics. Be specific to avoid false
    // positives for "PERMISSION_DENIED"-shaped 401s.
    const msg = parsed?.error?.message?.toLowerCase() ?? ''
    if (msg.includes('invalid authentication credentials')) return true
    if (msg.includes('access token has expired')) return true
    if (msg.includes('oauth 2 access error')) return true
    return false
  } catch {
    // Body wasn't JSON; fall back to text matching.
    return /invalid authentication credentials|access token has expired/i.test(body)
  }
}

/**
 * Phase 2b.1.b.2 — load just the OAuth bits for the customer / conversion-action
 * picker routes. The picker UI runs BEFORE `customer_id` /
 * `conversion_action_resource_name` are set, so `loadGoogleAdsConfig()` would
 * (correctly) return null. This loader returns whatever is stored — refresh
 * token + (optionally) login_customer_id — and is null only when the tenant
 * has no active row or hasn't connected OAuth yet.
 */
export async function loadGoogleAdsOAuthOnly(
  supabase: SupabaseClient,
  tenantId: string
): Promise<GoogleAdsConfig | null> {
  const { data, error } = await supabase
    .from('google_lead_form_configs')
    .select('oauth_refresh_token_encrypted, login_customer_id, customer_id, conversion_action_resource_name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (error || !data) return null
  const row = data as {
    oauth_refresh_token_encrypted: string | null
    login_customer_id: string | null
    customer_id: string | null
    conversion_action_resource_name: string | null
  }
  if (!row.oauth_refresh_token_encrypted) return null
  return {
    oauth_refresh_token_encrypted: row.oauth_refresh_token_encrypted,
    login_customer_id: row.login_customer_id,
    customer_id: row.customer_id ?? undefined,
    conversion_action_resource_name: row.conversion_action_resource_name ?? undefined,
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
