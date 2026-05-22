/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server'

const mockRequire = jest.fn()
const mockAssertBodyTenantMatches = jest.fn()

class FakeAuthApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

jest.mock('@/lib/auth/api-auth-helpers', () => ({
  AuthApiError: FakeAuthApiError,
  requireAuthenticatedTenantUser: (...args: unknown[]) => mockRequire(...args),
  assertBodyTenantMatches: (...args: unknown[]) => mockAssertBodyTenantMatches(...args),
  authErrorResponse: (err: unknown) => {
    if (err instanceof FakeAuthApiError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status }
      )
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  },
}))

let integrationMaybeRow: Record<string, unknown> | null | undefined
let lastUpsertArg: Record<string, unknown> | null
let lastTenantUpdateArg: Record<string, unknown> | null
let lastTenantUpdateId: string | null
let tenantUpdateError: { message: string } | null

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => ({
    from(table: string) {
      if (table === 'tenants') {
        return {
          update(patch: Record<string, unknown>) {
            lastTenantUpdateArg = patch
            return {
              eq(_col: string, val: string) {
                lastTenantUpdateId = val
                return Promise.resolve({ data: null, error: tenantUpdateError })
              },
            }
          },
        }
      }
      expect(table).toBe('integration_settings')
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: jest.fn().mockResolvedValue({
                  data: integrationMaybeRow === undefined ? null : integrationMaybeRow,
                  error: null,
                }),
              }
            },
          }
        },
        upsert: jest.fn((arg: Record<string, unknown>) => {
          lastUpsertArg = arg
          return {
            select() {
              return {
                single: jest.fn().mockResolvedValue({
                  data: { ...arg, id: arg.id ?? 'row-id-test' },
                  error: null,
                }),
              }
            },
          }
        }),
      }
    },
  })),
}))

import { createServiceClient } from '@/lib/supabase-server'
import { GET, PATCH } from '../route'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function makePatchReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/settings/communications/integrations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetReq(): NextRequest {
  return new NextRequest('http://localhost/api/settings/communications/integrations', {
    method: 'GET',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  integrationMaybeRow = undefined
  lastUpsertArg = null
  lastTenantUpdateArg = null
  lastTenantUpdateId = null
  tenantUpdateError = null
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
})

describe('PATCH /api/settings/communications/integrations', () => {
  it('returns 401 when unauthenticated — no integration_settings upsert', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(401, 'unauthenticated', 'Login required')
    )

    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: 'ACx',
          sms_auth_token: 'tok',
          sms_from_number: '+1',
        },
      })
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthenticated')
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('returns 403 tenant_mismatch when body tenant_id differs (defensive assertion)', async () => {
    mockAssertBodyTenantMatches.mockImplementationOnce(() => {
      throw new FakeAuthApiError(403, 'tenant_mismatch', 'Request tenant_id does not match authenticated user tenant')
    })
    const res = await PATCH(
      makePatchReq({
        tenant_id: OTHER_TENANT,
        channel: 'sms',
        payload: {
          sms_account_sid: 'ACx',
          sms_auth_token: 'tok',
          sms_from_number: '+1',
        },
      })
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('tenant_mismatch')
  })

  it('accepts valid SMS payload without tenant_id in body — upserts SMS columns only, is_sms_configured true', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          sms_auth_token: 'auth',
          sms_from_number: '+14155551234',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(mockAssertBodyTenantMatches).not.toHaveBeenCalled()
    expect(lastUpsertArg?.tenant_id).toBe(TENANT)
    expect(lastUpsertArg?.is_sms_configured).toBe(true)
    expect(lastUpsertArg).toMatchObject({
      tenant_id: TENANT,
      sms_account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      sms_auth_token: 'auth',
      sms_from_number: '+14155551234',
      is_sms_configured: true,
    })
    expect(lastUpsertArg).not.toHaveProperty('email_provider')
    expect(lastUpsertArg).not.toHaveProperty('voice_from_number')
  })
  it('returns 400 invalid_payload when channel is not whitelisted', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'foo',
        payload: {},
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_payload')
  })

  it('returns 400 when a required SMS field is absent', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_auth_token: 'tok',
          sms_from_number: '+1',
        },
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_payload')
  })

  it('returns 200 for SMS payload with empty required field and sets is_sms_configured false', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: '',
          sms_auth_token: 'tok',
          sms_from_number: '+1',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(lastUpsertArg?.is_sms_configured).toBe(false)
  })

  it('strips unrecognized payload keys — upsert receives only SMS whitelisted columns', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          sms_auth_token: 'auth',
          sms_from_number: '+14155551234',
          email_api_key: 'should-strip',
          evil_key: 'nope',
          tenant_id: 'should-not-merge',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(lastUpsertArg).not.toHaveProperty('email_api_key')
    expect(lastUpsertArg).not.toHaveProperty('evil_key')
    expect(lastUpsertArg?.tenant_id).toBe(TENANT)
    expect(lastUpsertArg?.sms_account_sid).toBe('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    expect(lastUpsertArg?.is_sms_configured).toBe(true)
  })

  // 2b.25.1 — SMS inbound number is mirrored to tenants.sms_phone_number
  it('mirrors sms_from_number to tenants.sms_phone_number so the inbound webhook resolver works', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          sms_auth_token: 'auth',
          sms_from_number: '+14155551234',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(lastTenantUpdateId).toBe(TENANT)
    expect(lastTenantUpdateArg).toMatchObject({ sms_phone_number: '+14155551234' })
    // The outbound integration_settings upsert STILL happened after the mirror.
    expect(lastUpsertArg?.sms_from_number).toBe('+14155551234')
  })

  it('mirrors whatsapp_from_number to tenants.whatsapp_phone_number', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'whatsapp',
        payload: {
          whatsapp_account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          whatsapp_auth_token: 'tok',
          whatsapp_from_number: '+447782218044',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(lastTenantUpdateId).toBe(TENANT)
    expect(lastTenantUpdateArg).toMatchObject({ whatsapp_phone_number: '+447782218044' })
  })

  it('clears tenants.sms_phone_number when sms_from_number is set to an empty string (unbind)', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: 'sid',
          sms_auth_token: 'tok',
          sms_from_number: '   ',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(lastTenantUpdateArg).toMatchObject({ sms_phone_number: null })
  })

  it('does NOT touch tenants for email channel — no inbound counterpart', async () => {
    const res = await PATCH(
      makePatchReq({
        channel: 'email',
        payload: {
          email_provider: 'resend',
          email_api_key: 'key',
          email_from_address: 'practice@example.com',
        },
      })
    )
    expect(res.status).toBe(200)
    expect(lastTenantUpdateArg).toBeNull()
  })

  it('returns 500 inbound_number_bind_failed when the tenants update errors — and integration_settings upsert is NOT attempted', async () => {
    tenantUpdateError = { message: 'simulated failure' }
    const res = await PATCH(
      makePatchReq({
        channel: 'sms',
        payload: {
          sms_account_sid: 'sid',
          sms_auth_token: 'tok',
          sms_from_number: '+14155551234',
        },
      })
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('inbound_number_bind_failed')
    // The integration_settings upsert was never attempted — confirms we
    // didn't leave a half-state where outbound was configured but inbound
    // routing was silently broken.
    expect(lastUpsertArg).toBeNull()
  })
})

describe('GET /api/settings/communications/integrations', () => {
  it('returns 401 when unauthenticated — no integration_settings query', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(401, 'unauthenticated', 'Login required')
    )
    const res = await GET(makeGetReq())
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('returns existing row when one exists', async () => {
    integrationMaybeRow = {
      tenant_id: TENANT,
      sms_account_sid: 'sid',
      is_sms_configured: true,
    }
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.row.tenant_id).toBe(TENANT)
    expect(body.row.sms_account_sid).toBe('sid')
  })

  it('returns empty defaults when tenant has no row yet', async () => {
    integrationMaybeRow = null
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.row.tenant_id).toBe(TENANT)
    expect(body.row.email_api_key).toBeNull()
    expect(body.row.is_email_configured).toBe(false)
  })
})
