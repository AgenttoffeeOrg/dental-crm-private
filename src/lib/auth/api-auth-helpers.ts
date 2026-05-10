/**
 * Phase 2b.5 — Outbound communications auth helpers.
 *
 * Closes the D03 §1 unauthenticated-send P0 by giving every
 * `/api/communications/send-*` route a single shared way to:
 *
 *   1. Demand a logged-in CRM session (`requireAuthenticatedTenantUser`).
 *   2. Refuse cross-tenant impersonation via the request body
 *      (`assertBodyTenantMatches`).
 *   3. Enforce a per-tenant per-channel rate limit
 *      (`enforceOutboundRateLimit`).
 *   4. Surface helper failures as the standard error JSON shape
 *      (`authErrorResponse`).
 *
 * The session/tenant/role resolution piggy-backs on the existing canonical
 * helpers (`getSupabaseAuthContext` + `getApiRequestContext` in
 * `lib/api/`), and the rate-limit primitive is the existing Redis-backed
 * `checkRateLimit` in `lib/rate-limiter.ts`. We do NOT duplicate either.
 *
 * Live-shape note (captured in `docs/2b/2b-5-changes.md` §3): the live
 * `features` table has `crm_base`, `marketing`, `automations`, and
 * marketing-nested addons (`marketing_sms`, `marketing_whatsapp`, …). It
 * does NOT yet have per-channel CRM entitlements (`email`, `sms`,
 * `whatsapp`, `voice`, `ai_features`) of the kind the planner's prompt
 * referenced. The `requireEntitlement` plumbing here is the mechanism the
 * future entitlement schema will hook into; for this phase the send
 * routes do NOT pass `requireEntitlement` (1:1 outbound from a contact
 * card is part of `crm_base`, which every active tenant has implicitly).
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSupabaseAuthContext } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/rate-limiter'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutboundChannel = 'email' | 'sms' | 'whatsapp' | 'voice'

export type AuthenticatedTenantUser = {
  userId: string
  tenantId: string
  email: string
  role: 'owner' | 'admin' | 'manager' | 'member' | string
  /**
   * Resolved feature codes the tenant is currently entitled to, as
   * reported by `tenant_entitlements` join `features`. Empty array if the
   * tenant has no rows in `tenant_entitlements` (which is the case for
   * the seed test tenant — see §3 of the change log).
   */
  entitlements: string[]
}

export type AuthErrorStatus = 401 | 403 | 429

export class AuthApiError extends Error {
  public readonly status: AuthErrorStatus
  public readonly code: string
  constructor(status: AuthErrorStatus, code: string, message: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }
}

// ---------------------------------------------------------------------------
// Rate-limit configuration (locked for this phase per prompt §2.3)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000

const RATE_LIMITS: Record<OutboundChannel, number> = {
  email: 60,
  sms: 30,
  whatsapp: 30,
  voice: 10,
}

// ---------------------------------------------------------------------------
// Auth + tenant resolution
// ---------------------------------------------------------------------------

interface RequireAuthOptions {
  /**
   * If set, the helper will fail-closed with `entitlement_missing` when
   * the resolved tenant's entitlements don't include the given code.
   * Only pass this once channel-level entitlement codes are seeded —
   * see the live-shape note above. The send routes in 2b.5 leave it
   * undefined.
   */
  requireEntitlement?: string
}

/**
 * Mirrors the canonical resolution in `lib/api/context.ts`
 * (`getApiRequestContext`): tenant comes from `app_users.active_tenant_id`,
 * membership/role comes from `user_tenant_memberships` filtered to
 * status='active'. Returns the (tenantId, role) tuple or throws
 * AuthApiError(403, 'no_tenant').
 *
 * Extracted so `requireAuthenticatedTenantUser` stays under the
 * cyclomatic complexity limit.
 */
async function resolveActiveTenantMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<{ tenantId: string; role: string }> {
  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('active_tenant_id')
    .eq('id', userId)
    .single()

  if (appUserError || !appUser?.active_tenant_id) {
    throw new AuthApiError(403, 'no_tenant', 'User is not a member of any tenant')
  }

  const tenantId = appUser.active_tenant_id as string

  const { data: membership, error: membershipError } = await supabase
    .from('user_tenant_memberships')
    .select('role, status')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    throw new AuthApiError(403, 'no_tenant', 'User is not a member of any tenant')
  }

  return { tenantId, role: membership.role as string }
}

/**
 * Resolves the authenticated tenant user for an API route.
 *
 * @throws AuthApiError(401, 'unauthenticated') if no valid Supabase session.
 * @throws AuthApiError(403, 'no_tenant') if the user has no active membership.
 * @throws AuthApiError(403, 'entitlement_missing') if `requireEntitlement` is set and absent.
 */
export async function requireAuthenticatedTenantUser(
  request: NextRequest,
  options?: RequireAuthOptions
): Promise<AuthenticatedTenantUser> {
  const { supabase, user, error: authError } = await getSupabaseAuthContext(request)

  if (authError || !user) {
    throw new AuthApiError(401, 'unauthenticated', 'Login required')
  }

  const { tenantId, role } = await resolveActiveTenantMembership(supabase, user.id)
  const entitlements = await resolveTenantEntitlements(supabase, tenantId)

  if (options?.requireEntitlement && !entitlements.includes(options.requireEntitlement)) {
    throw new AuthApiError(
      403,
      'entitlement_missing',
      `Tenant does not have ${options.requireEntitlement} enabled`
    )
  }

  return {
    userId: user.id,
    tenantId,
    email: user.email ?? '',
    role,
    entitlements,
  }
}

/**
 * Reads the tenant's currently-enabled feature codes via the
 * `tenant_entitlements` join. Empty array if no rows.
 */
async function resolveTenantEntitlements(
  // The supabase client returned by `getSupabaseAuthContext` is fully typed
  // by `Database`, but we don't depend on that here — we only need
  // `from(...).select(...).eq(...).eq(...)`. `any` is the pragmatic shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('tenant_entitlements')
      .select('is_enabled, features:feature_id(code)')
      .eq('tenant_id', tenantId)
      .eq('is_enabled', true)

    if (error || !Array.isArray(data)) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => row?.features?.code)
      .filter((code: unknown): code is string => typeof code === 'string')
  } catch {
    // Entitlement resolution must never break the auth gate. If the join
    // fails (table missing, network blip, etc.) we treat it as "no
    // entitlements visible". The caller's `requireEntitlement` check —
    // when set — will then trip `entitlement_missing`, which fails-closed.
    return []
  }
}

// ---------------------------------------------------------------------------
// Body tenant_id verification (block the impersonation attack)
// ---------------------------------------------------------------------------

/**
 * If the request body provides a `tenant_id`, verify it matches the
 * authenticated user's tenant. If absent / null / empty, no-op.
 *
 * @throws AuthApiError(403, 'tenant_mismatch') on mismatch.
 */
export function assertBodyTenantMatches(
  bodyTenantId: string | null | undefined,
  authenticatedTenantId: string
): void {
  if (typeof bodyTenantId !== 'string' || bodyTenantId.length === 0) return
  if (bodyTenantId === authenticatedTenantId) return
  throw new AuthApiError(
    403,
    'tenant_mismatch',
    'Request tenant_id does not match authenticated user tenant'
  )
}

// ---------------------------------------------------------------------------
// Per-tenant outbound rate limit
// ---------------------------------------------------------------------------

/**
 * Increments the (tenant, channel) counter and throws AuthApiError(429)
 * if the tenant has exceeded the per-minute limit. Backed by the existing
 * Redis-backed `checkRateLimit` (in-memory fallback when Redis is
 * unavailable). The window is sliding 60s; counters are isolated per
 * (tenant, channel) by the identifier prefix.
 */
export async function enforceOutboundRateLimit(
  tenantId: string,
  channel: OutboundChannel
): Promise<void> {
  const limit = RATE_LIMITS[channel]
  if (!limit) return

  const result = await checkRateLimit({
    identifier: `outbound:${channel}:${tenantId}`,
    maxRequests: limit,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!result.allowed) {
    throw new AuthApiError(
      429,
      'rate_limit_exceeded',
      `Tenant exceeded ${channel} send limit (${limit}/min)`
    )
  }
}

// ---------------------------------------------------------------------------
// Error → NextResponse
// ---------------------------------------------------------------------------

/**
 * Standard catch-block helper. AuthApiError → its status + JSON shape.
 * Anything else → 500 with the standard `internal_error` shape and a
 * console.error so the underlying cause is still surfaced in logs.
 */
export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthApiError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status }
    )
  }
  console.error('[api-auth-helpers] Unexpected error:', err)
  return NextResponse.json({ error: 'internal_error' }, { status: 500 })
}
