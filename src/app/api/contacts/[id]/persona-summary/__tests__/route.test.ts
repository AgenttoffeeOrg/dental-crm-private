/**
 * @jest-environment node
 *
 * Phase 2b.40 / 2b.57.3 (MEDIUM #4) — Tests for the AI persona
 * summary GET + POST endpoint.
 *
 * Asserts:
 *   - 401 when unauthenticated.
 *   - GET returns { needs_generation: true } when no cache row.
 *   - GET returns 500 with structured error when the cache read fails
 *     (2b.57.1 HIGH #2 fix).
 *   - GET returns cached row + stale flag when row exists.
 *   - POST 404 when contact not found.
 *   - POST upserts into contact_persona_summaries with the result of
 *     generatePersonaSummary (mocked so Claude isn't called).
 */

import { NextRequest } from 'next/server'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'
const CONTACT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const MISSING_CONTACT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

let authError: { status: number; message: string } | null = null
let cacheReadShouldFail = false
let cachedRow: Record<string, unknown> | null = null
let contactExists = true

const upsertCalls: Array<Record<string, unknown>> = []

jest.mock('@/lib/contacts/persona-summary', () => ({
  generatePersonaSummary: jest.fn(async () => ({
    summary: 'Mocked persona summary.',
    isFallback: false,
    modelVersion: 'mock-model-v1',
  })),
  AUTO_REFRESH_ACTIVITY_DELTA: 5,
}))

jest.mock('@/lib/api/context', () => {
  const { ApiContextError } = jest.requireActual('@/lib/api/context')
  return {
    ApiContextError,
    getApiRequestContext: jest.fn(async () => {
      if (authError) throw new ApiContextError(authError.status, authError.message)
      return {
        supabase: {},
        user: { id: USER, email: 'test@example.com' },
        tenantId: TENANT,
        activeLocationId: null,
        membership: { id: 'm-1', role: 'owner', status: 'active', all_locations: true },
        accessibleLocationIds: null,
      }
    }),
  }
})

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({
    from(table: string) {
      return makeBuilder(table)
    },
  }),
}))

function makeBuilder(table: string) {
  let countMode = false
  const builder: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      countMode = Boolean(opts?.head)
      return builder
    },
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    gt: () => builder,
    order: () => builder,
    limit: () => builder,
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }),
    upsert: async (values: Record<string, unknown>) => {
      if (table === 'contact_persona_summaries') {
        upsertCalls.push(values)
      }
      return { error: null }
    },
    maybeSingle: async () => {
      if (table === 'contact_persona_summaries') {
        if (cacheReadShouldFail) {
          return { data: null, error: { message: 'simulated cache read failure' } }
        }
        return { data: cachedRow, error: null }
      }
      if (table === 'contacts') {
        if (!contactExists) return { data: null, error: null }
        return { data: { id: CONTACT, full_name: 'Test Patient', source: 'sms', tags: [] }, error: null }
      }
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown; count?: number | null }) => unknown) => {
      // Used by .select(...).eq(...).in(...).order().limit() chains.
      // Activities query for the POST path returns empty list by default.
      if (countMode) {
        return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve)
      }
      return Promise.resolve({ data: [] as unknown[], error: null }).then(resolve)
    },
  }
  return builder
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GET, POST } = require('../route')

beforeEach(() => {
  authError = null
  cacheReadShouldFail = false
  cachedRow = null
  contactExists = true
  upsertCalls.length = 0
})

function getReq() {
  return new NextRequest(
    `http://localhost/api/contacts/${CONTACT}/persona-summary`,
    { method: 'GET' }
  )
}
function postReq() {
  return new NextRequest(
    `http://localhost/api/contacts/${CONTACT}/persona-summary`,
    { method: 'POST', body: '{}' }
  )
}

describe('GET /api/contacts/[id]/persona-summary', () => {
  it('returns 401 when unauthenticated', async () => {
    authError = { status: 401, message: 'Unauthorized' }
    const res = await GET(getReq(), { params: { id: CONTACT } })
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid uuid', async () => {
    const req = new NextRequest('http://localhost/api/contacts/not-a-uuid/persona-summary')
    const res = await GET(req, { params: { id: 'not-a-uuid' } })
    expect(res.status).toBe(400)
  })

  it('returns { needs_generation: true } when no cache row exists', async () => {
    cachedRow = null
    const res = await GET(getReq(), { params: { id: CONTACT } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needs_generation).toBe(true)
    expect(body.summary).toBeNull()
  })

  it('returns 500 with structured error when cache read fails (HIGH #2 fix)', async () => {
    cacheReadShouldFail = true
    const res = await GET(getReq(), { params: { id: CONTACT } })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('cache_read_failed')
    expect(body.message).toContain('simulated cache')
  })

  it('returns cached row with needs_generation: false when row exists', async () => {
    cachedRow = {
      summary: 'Cached summary.',
      generated_at: '2026-05-23T00:00:00.000Z',
      last_activity_seen_at: '2026-05-23T00:00:00.000Z',
      activities_seen_count: 3,
      model_version: 'claude-haiku-4-5',
      is_fallback: false,
    }
    const res = await GET(getReq(), { params: { id: CONTACT } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needs_generation).toBe(false)
    expect(body.summary).toBe('Cached summary.')
    expect(body.stale).toBe(false)
  })
})

describe('POST /api/contacts/[id]/persona-summary', () => {
  it('returns 401 when unauthenticated', async () => {
    authError = { status: 401, message: 'Unauthorized' }
    const res = await POST(postReq(), { params: { id: CONTACT } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when contact not found', async () => {
    contactExists = false
    const res = await POST(postReq(), { params: { id: MISSING_CONTACT } })
    expect(res.status).toBe(404)
  })

  it('upserts persona summary on success', async () => {
    contactExists = true
    const res = await POST(postReq(), { params: { id: CONTACT } })
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(1)
    expect(upsertCalls[0].summary).toBe('Mocked persona summary.')
    expect(upsertCalls[0].tenant_id).toBe(TENANT)
    expect(upsertCalls[0].contact_id).toBe(CONTACT)
    expect(upsertCalls[0].is_fallback).toBe(false)
  })
})
