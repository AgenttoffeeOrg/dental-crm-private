/**
 * @jest-environment node
 *
 * Phase 2b.5 — auth helper unit tests. Mocks the Supabase auth context and
 * the rate-limiter primitive so nothing touches the network.
 */

import { NextRequest } from 'next/server'

const mockGetSupabaseAuthContext = jest.fn()
const mockCheckRateLimit = jest.fn()

jest.mock('@/lib/api/auth', () => ({
  getSupabaseAuthContext: (...args: unknown[]) =>
    mockGetSupabaseAuthContext(...args),
}))

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  AuthApiError,
  requireAuthenticatedTenantUser,
  assertBodyTenantMatches,
  enforceOutboundRateLimit,
  authErrorResponse,
} = require('../api-auth-helpers')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER_ID = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'
const USER_EMAIL = 'deepakshegde@example.com'

interface SupabaseStub {
  from: jest.Mock
  __appUser: {
    select: jest.Mock
    eq: jest.Mock
    single: jest.Mock
  }
  __membership: {
    select: jest.Mock
    eq: jest.Mock
    single: jest.Mock
  }
  __entitlements: {
    select: jest.Mock
    eq: jest.Mock
  }
}

function makeSupabase(opts: {
  appUser?: { active_tenant_id: string } | null
  appUserError?: unknown
  membership?: { role: string; status: string } | null
  membershipError?: unknown
  entitlements?: Array<{ is_enabled: boolean; features: { code: string } | null }>
  entitlementsError?: unknown
}): SupabaseStub {
  // app_users
  const appUserSingle = jest
    .fn()
    .mockResolvedValue({ data: opts.appUser ?? null, error: opts.appUserError ?? null })
  const appUserEq = jest.fn(() => ({ single: appUserSingle }))
  const appUserSelect = jest.fn(() => ({ eq: appUserEq }))
  const appUser = { select: appUserSelect, eq: appUserEq, single: appUserSingle }

  // user_tenant_memberships — needs three .eq() calls then .single()
  const membershipSingle = jest
    .fn()
    .mockResolvedValue({ data: opts.membership ?? null, error: opts.membershipError ?? null })
  const membershipEqChain = {
    eq: jest.fn(() => membershipEqChain),
    single: membershipSingle,
  } as { eq: jest.Mock; single: jest.Mock }
  const membershipSelect = jest.fn(() => membershipEqChain)
  const membership = {
    select: membershipSelect,
    eq: membershipEqChain.eq,
    single: membershipSingle,
  }

  // tenant_entitlements — two .eq() calls return data
  const entitlementsRows = opts.entitlements ?? []
  const entitlementsTerminal = {
    then: undefined as unknown,
  }
  const entitlementsEq2 = jest
    .fn()
    .mockResolvedValue({ data: entitlementsRows, error: opts.entitlementsError ?? null })
  const entitlementsEq1 = jest.fn(() => ({ eq: entitlementsEq2 }))
  const entitlementsSelect = jest.fn(() => ({ eq: entitlementsEq1 }))
  const entitlements = {
    select: entitlementsSelect,
    eq: entitlementsEq1,
  }
  void entitlementsTerminal

  const from = jest.fn((table: string) => {
    switch (table) {
      case 'app_users':
        return { select: appUserSelect }
      case 'user_tenant_memberships':
        return { select: membershipSelect }
      case 'tenant_entitlements':
        return { select: entitlementsSelect }
      default:
        throw new Error(`unexpected from(${table})`)
    }
  })

  return { from, __appUser: appUser, __membership: membership, __entitlements: entitlements }
}

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/communications/send-email', {
    method: 'POST',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  // Permissive rate-limiter default — individual tests override.
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    limit: 60,
    remaining: 59,
    resetTime: Date.now() + 60_000,
  })
})

describe('AuthApiError', () => {
  it('preserves status, code, and message', () => {
    const err = new AuthApiError(429, 'rate_limit_exceeded', 'Too many sends')
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(429)
    expect(err.code).toBe('rate_limit_exceeded')
    expect(err.message).toBe('Too many sends')
  })
})

describe('requireAuthenticatedTenantUser', () => {
  it('throws 401 when there is no session', async () => {
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase: makeSupabase({}),
      user: null,
      error: null,
    })

    await expect(requireAuthenticatedTenantUser(makeReq())).rejects.toMatchObject({
      status: 401,
      code: 'unauthenticated',
    })
  })

  it('throws 401 when getUser returns an error', async () => {
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase: makeSupabase({}),
      user: null,
      error: { message: 'jwt expired' },
    })

    await expect(requireAuthenticatedTenantUser(makeReq())).rejects.toMatchObject({
      status: 401,
      code: 'unauthenticated',
    })
  })

  it('throws 403 (no_tenant) when app_users has no active_tenant_id', async () => {
    const supabase = makeSupabase({ appUser: null })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    await expect(requireAuthenticatedTenantUser(makeReq())).rejects.toMatchObject({
      status: 403,
      code: 'no_tenant',
    })
  })

  it('throws 403 (no_tenant) when membership lookup returns no active row', async () => {
    const supabase = makeSupabase({
      appUser: { active_tenant_id: TENANT },
      membership: null,
    })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    await expect(requireAuthenticatedTenantUser(makeReq())).rejects.toMatchObject({
      status: 403,
      code: 'no_tenant',
    })
  })

  it('returns the resolved user with empty entitlements when none seeded', async () => {
    const supabase = makeSupabase({
      appUser: { active_tenant_id: TENANT },
      membership: { role: 'owner', status: 'active' },
      entitlements: [],
    })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    const result = await requireAuthenticatedTenantUser(makeReq())
    expect(result).toEqual({
      userId: USER_ID,
      tenantId: TENANT,
      email: USER_EMAIL,
      role: 'owner',
      entitlements: [],
    })
  })

  it('returns the resolved user with entitlements present', async () => {
    const supabase = makeSupabase({
      appUser: { active_tenant_id: TENANT },
      membership: { role: 'admin', status: 'active' },
      entitlements: [
        { is_enabled: true, features: { code: 'crm_base' } },
        { is_enabled: true, features: { code: 'marketing' } },
      ],
    })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    const result = await requireAuthenticatedTenantUser(makeReq())
    expect(result.entitlements).toEqual(['crm_base', 'marketing'])
    expect(result.role).toBe('admin')
  })

  it('passes when requireEntitlement is satisfied', async () => {
    const supabase = makeSupabase({
      appUser: { active_tenant_id: TENANT },
      membership: { role: 'owner', status: 'active' },
      entitlements: [{ is_enabled: true, features: { code: 'marketing' } }],
    })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    const result = await requireAuthenticatedTenantUser(makeReq(), {
      requireEntitlement: 'marketing',
    })
    expect(result.tenantId).toBe(TENANT)
  })

  it('throws 403 (entitlement_missing) when requireEntitlement is absent', async () => {
    const supabase = makeSupabase({
      appUser: { active_tenant_id: TENANT },
      membership: { role: 'owner', status: 'active' },
      entitlements: [{ is_enabled: true, features: { code: 'crm_base' } }],
    })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    await expect(
      requireAuthenticatedTenantUser(makeReq(), { requireEntitlement: 'marketing' })
    ).rejects.toMatchObject({ status: 403, code: 'entitlement_missing' })
  })

  it('treats entitlement-table errors as empty (fails closed when requireEntitlement is set)', async () => {
    const supabase = makeSupabase({
      appUser: { active_tenant_id: TENANT },
      membership: { role: 'owner', status: 'active' },
      entitlementsError: { message: 'relation "tenant_entitlements" does not exist' },
    })
    mockGetSupabaseAuthContext.mockResolvedValueOnce({
      supabase,
      user: { id: USER_ID, email: USER_EMAIL },
      error: null,
    })

    await expect(
      requireAuthenticatedTenantUser(makeReq(), { requireEntitlement: 'sms' })
    ).rejects.toMatchObject({ status: 403, code: 'entitlement_missing' })
  })
})

describe('assertBodyTenantMatches', () => {
  it('no-ops when body tenant_id is undefined', () => {
    expect(() => assertBodyTenantMatches(undefined, TENANT)).not.toThrow()
  })

  it('no-ops when body tenant_id is null', () => {
    expect(() => assertBodyTenantMatches(null, TENANT)).not.toThrow()
  })

  it('no-ops when body tenant_id is an empty string', () => {
    expect(() => assertBodyTenantMatches('', TENANT)).not.toThrow()
  })

  it('no-ops when body tenant_id matches authenticated tenant', () => {
    expect(() => assertBodyTenantMatches(TENANT, TENANT)).not.toThrow()
  })

  it('throws 403 (tenant_mismatch) when body tenant_id differs', () => {
    expect(() => assertBodyTenantMatches(OTHER_TENANT, TENANT)).toThrow(AuthApiError)
    try {
      assertBodyTenantMatches(OTHER_TENANT, TENANT)
    } catch (err) {
      expect((err as InstanceType<typeof AuthApiError>).status).toBe(403)
      expect((err as InstanceType<typeof AuthApiError>).code).toBe('tenant_mismatch')
    }
  })
})

describe('enforceOutboundRateLimit', () => {
  it('no-ops when the rate-limiter reports allowed', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetTime: Date.now() + 60_000,
    })
    await expect(enforceOutboundRateLimit(TENANT, 'email')).resolves.toBeUndefined()
  })

  it('uses (channel, tenant) as the identifier and the per-channel limit', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetTime: Date.now() + 60_000,
    })
    await enforceOutboundRateLimit(TENANT, 'sms')
    expect(mockCheckRateLimit).toHaveBeenCalledWith({
      identifier: `outbound:sms:${TENANT}`,
      maxRequests: 30,
      windowMs: 60_000,
    })
  })

  it('throws 429 (rate_limit_exceeded) when limiter reports denied', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    })
    await expect(enforceOutboundRateLimit(TENANT, 'whatsapp')).rejects.toMatchObject({
      status: 429,
      code: 'rate_limit_exceeded',
    })
  })

  it('uses the voice limit (10/min) for the voice channel', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetTime: Date.now() + 60_000,
    })
    await enforceOutboundRateLimit(TENANT, 'voice')
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ maxRequests: 10 })
    )
  })
})

describe('authErrorResponse', () => {
  it('renders an AuthApiError with its status and JSON shape', async () => {
    const res = authErrorResponse(
      new AuthApiError(401, 'unauthenticated', 'Login required')
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'unauthenticated', message: 'Login required' })
  })

  it('renders a 429 AuthApiError with its status and JSON shape', async () => {
    const res = authErrorResponse(
      new AuthApiError(429, 'rate_limit_exceeded', 'Tenant exceeded sms send limit (30/min)')
    )
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('rate_limit_exceeded')
  })

  it('renders a generic error as 500 internal_error and logs the cause', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = authErrorResponse(new Error('something went wrong'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'internal_error' })
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('renders a non-Error throwable as 500 internal_error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = authErrorResponse('weird string throw')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'internal_error' })
    errorSpy.mockRestore()
  })
})
