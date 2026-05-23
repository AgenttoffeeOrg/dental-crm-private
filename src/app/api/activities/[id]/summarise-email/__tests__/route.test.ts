/**
 * @jest-environment node
 *
 * Phase 2b.43 / 2b.57.3 (MEDIUM #5) — Tests for the lazy email
 * summariser endpoint.
 *
 * Asserts:
 *   - 401 when unauthenticated.
 *   - 404 when activity not found.
 *   - 400 when activity type isn't 'email'.
 *   - Returns cached summary without calling summariser when present.
 *   - Generates + persists summary on first call (writes metadata).
 *   - `force: true` re-summarises even with a cached value present.
 */

import { NextRequest } from 'next/server'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'
const ACTIVITY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

let authError: { status: number; message: string } | null = null
let activity: Record<string, unknown> | null = null
let updateCalls: Array<{ metadata: unknown }> = []

const mockSummariseEmail = jest.fn()

jest.mock('@/lib/communications/email-summariser', () => ({
  summariseEmail: (...args: unknown[]) => mockSummariseEmail(...args),
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
  let updatePayload: Record<string, unknown> | null = null
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    update: (values: Record<string, unknown>) => {
      updatePayload = values
      return builder
    },
    maybeSingle: async () => ({ data: activity, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      if (table === 'activities' && updatePayload) {
        updateCalls.push(updatePayload as { metadata: unknown })
        return Promise.resolve({ data: null, error: null }).then(resolve)
      }
      return Promise.resolve({ data: null, error: null }).then(resolve)
    },
  }
  return builder
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route')

beforeEach(() => {
  authError = null
  activity = null
  updateCalls = []
  mockSummariseEmail.mockReset()
  mockSummariseEmail.mockResolvedValue({
    summary: 'Mocked email summary.',
    isFallback: false,
    modelVersion: 'mock-model-v1',
  })
})

function req(body?: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost/api/activities/${ACTIVITY}/summarise-email`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }
  )
}

describe('POST /api/activities/[id]/summarise-email', () => {
  it('returns 401 when unauthenticated', async () => {
    authError = { status: 401, message: 'Unauthorized' }
    const res = await POST(req(), { params: { id: ACTIVITY } })
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid uuid', async () => {
    const r = new NextRequest('http://localhost/api/activities/bad/summarise-email', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(r, { params: { id: 'bad' } })
    expect(res.status).toBe(400)
  })

  it('returns 404 when activity not found', async () => {
    activity = null
    const res = await POST(req(), { params: { id: ACTIVITY } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when activity is not an email', async () => {
    activity = {
      id: ACTIVITY,
      type: 'sms',
      direction: 'inbound',
      subject: null,
      description: 'hi',
      snippet: null,
      body: null,
      rich_content: null,
      metadata: null,
    }
    const res = await POST(req(), { params: { id: ACTIVITY } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('not_an_email')
  })

  it('returns cached summary without re-summarising when present', async () => {
    activity = {
      id: ACTIVITY,
      type: 'email',
      direction: 'inbound',
      subject: 'Re: implants',
      description: 'full body...',
      snippet: null,
      body: null,
      rich_content: null,
      metadata: {
        ai_email_summary: 'Pre-cached summary.',
        ai_email_summary_is_fallback: false,
      },
    }
    const res = await POST(req(), { params: { id: ACTIVITY } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
    expect(body.summary).toBe('Pre-cached summary.')
    expect(mockSummariseEmail).not.toHaveBeenCalled()
    expect(updateCalls.length).toBe(0)
  })

  it('generates + persists summary on first call', async () => {
    activity = {
      id: ACTIVITY,
      type: 'email',
      direction: 'inbound',
      subject: 'Re: implants',
      description: 'Patient asking about pricing',
      snippet: null,
      body: null,
      rich_content: null,
      metadata: {},
    }
    const res = await POST(req(), { params: { id: ACTIVITY } })
    expect(res.status).toBe(200)
    expect(mockSummariseEmail).toHaveBeenCalledTimes(1)
    expect(updateCalls.length).toBe(1)
    expect((updateCalls[0].metadata as any).ai_email_summary).toBe('Mocked email summary.')
    expect((updateCalls[0].metadata as any).ai_email_summary_is_fallback).toBe(false)
    expect((updateCalls[0].metadata as any).ai_email_summary_model).toBe('mock-model-v1')
  })

  it('force: true re-summarises even when cache is present', async () => {
    activity = {
      id: ACTIVITY,
      type: 'email',
      direction: 'outbound',
      subject: 'Reply',
      description: null,
      snippet: null,
      body: null,
      rich_content: '<p>HTML body</p>',
      metadata: {
        ai_email_summary: 'Stale cached.',
        ai_email_summary_is_fallback: false,
      },
    }
    const res = await POST(req({ force: true }), { params: { id: ACTIVITY } })
    expect(res.status).toBe(200)
    expect(mockSummariseEmail).toHaveBeenCalledTimes(1)
    expect(updateCalls.length).toBe(1)
    expect((updateCalls[0].metadata as any).ai_email_summary).toBe('Mocked email summary.')
  })
})
