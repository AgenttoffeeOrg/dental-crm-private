/**
 * @jest-environment node
 *
 * Phase 2b.1.b.1 — unit tests for fireGoogleConversionEvent.
 *
 * We mock GoogleAdsClient via jest.mock so the test never touches network. The
 * Supabase client is a hand-rolled in-memory mock that records inserts and lets
 * each test arrange the responses for the SELECT short-circuits.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fireGoogleConversionEvent,
  type FireConversionInput,
} from '../fire-conversion-event'

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

const mockUpload = jest.fn()
const mockLoadConfig = jest.fn()

jest.mock('../google-ads-client', () => {
  const actual = jest.requireActual('../google-ads-client')
  return {
    ...actual,
    GoogleAdsClient: jest.fn().mockImplementation(() => ({
      uploadClickConversion: mockUpload,
    })),
    loadGoogleAdsConfig: (...args: unknown[]) => mockLoadConfig(...args),
  }
})

// -----------------------------------------------------------------------------
// Fake Supabase
// -----------------------------------------------------------------------------

interface FakeSelectQuery {
  eq: (col: string, val: unknown) => FakeSelectQuery
  maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
}

interface FakeInsertQuery {
  select: () => Promise<{ data: unknown; error: null }>
}

interface FakeTable {
  select: () => FakeSelectQuery
  insert: (row: unknown) => Promise<{ error: { message: string } | null }> & FakeInsertQuery
}

function fakeSupabase(opts: {
  priorSuccess?: { id: string } | null
  priorSelectError?: { message: string } | null
}): { client: SupabaseClient; inserts: Array<Record<string, unknown>> } {
  const inserts: Array<Record<string, unknown>> = []

  const buildSelectChain = (): FakeSelectQuery => {
    const chain: FakeSelectQuery = {
      eq: () => chain,
      maybeSingle: async () => ({
        data: opts.priorSuccess ?? null,
        error: opts.priorSelectError ?? null,
      }),
    }
    return chain
  }

  const fromImpl = (_table: string): FakeTable => ({
    select: () => buildSelectChain(),
    insert: ((row: Record<string, unknown>) => {
      inserts.push(row)
      return Promise.resolve({ error: null }) as unknown as Promise<{ error: { message: string } | null }> &
        FakeInsertQuery
    }) as FakeTable['insert'],
  })

  const client = { from: fromImpl } as unknown as SupabaseClient
  return { client, inserts }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function baseInput(overrides: Partial<FireConversionInput> = {}): FireConversionInput {
  return {
    tenant_id: 'tenant-uuid',
    deal_id: 'deal-uuid',
    contact_id: 'contact-uuid',
    event_type: 'Lead',
    gclid: 'TEST_GCLID',
    email: 'sarah@example.com',
    phone_e164: '+447700900100',
    occurred_at: '2026-05-06T12:00:00.000Z',
    ...overrides,
  }
}

function activeConfig() {
  return {
    customer_id: '1675268286',
    login_customer_id: '9374708799',
    conversion_action_resource_name: 'customers/1675268286/conversionActions/7600535419',
    oauth_refresh_token_encrypted: 'cipher',
  }
}

beforeEach(() => {
  mockUpload.mockReset()
  mockLoadConfig.mockReset()
})

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('fireGoogleConversionEvent', () => {
  it('skips silently when a prior success row exists for the same (deal, event, platform)', async () => {
    const { client, inserts } = fakeSupabase({ priorSuccess: { id: 'existing' } })
    await fireGoogleConversionEvent(baseInput(), client)
    expect(inserts).toHaveLength(0)
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockLoadConfig).not.toHaveBeenCalled()
  })

  it('records `skipped_no_gclid` when gclid is null and never calls Google', async () => {
    const { client, inserts } = fakeSupabase({})
    await fireGoogleConversionEvent(baseInput({ gclid: null }), client)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({
      tenant_id: 'tenant-uuid',
      deal_id: 'deal-uuid',
      contact_id: 'contact-uuid',
      platform: 'google_ads',
      event_type: 'Lead',
      gclid: null,
      status: 'skipped_no_gclid',
    })
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockLoadConfig).not.toHaveBeenCalled()
  })

  it('records `skipped_other` when no active Google Ads config is found', async () => {
    mockLoadConfig.mockResolvedValueOnce(null)
    const { client, inserts } = fakeSupabase({})
    await fireGoogleConversionEvent(baseInput(), client)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({
      status: 'skipped_other',
      gclid: 'TEST_GCLID',
    })
    expect(inserts[0].error_message).toMatch(/No active Google Ads config/)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('records `success` with http_status and excerpt when Google returns 200', async () => {
    mockLoadConfig.mockResolvedValueOnce(activeConfig())
    mockUpload.mockResolvedValueOnce({
      ok: true,
      http_status: 200,
      response_excerpt: '{"results":[{}]}',
    })

    const { client, inserts } = fakeSupabase({})
    await fireGoogleConversionEvent(baseInput(), client)

    expect(mockUpload).toHaveBeenCalledTimes(1)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({
      status: 'success',
      http_status: 200,
      response_excerpt: '{"results":[{}]}',
      retry_count: 0,
      conversion_action_resource_name: 'customers/1675268286/conversionActions/7600535419',
      gclid: 'TEST_GCLID',
    })
  })

  it('does NOT retry on 4xx — records failure, retry_count=0', async () => {
    mockLoadConfig.mockResolvedValueOnce(activeConfig())
    mockUpload.mockResolvedValueOnce({
      ok: false,
      http_status: 400,
      response_excerpt: '{"error":{"code":400,"message":"bad"}}',
      error_message: 'HTTP 400',
    })

    const { client, inserts } = fakeSupabase({})
    await fireGoogleConversionEvent(baseInput(), client)

    expect(mockUpload).toHaveBeenCalledTimes(1)
    expect(inserts[0]).toMatchObject({
      status: 'failure',
      http_status: 400,
      retry_count: 0,
      error_message: 'HTTP 400',
    })
  })

  it('retries once on 5xx and records success when the second attempt wins (retry_count=1)', async () => {
    mockLoadConfig.mockResolvedValueOnce(activeConfig())
    mockUpload
      .mockResolvedValueOnce({ ok: false, http_status: 503, response_excerpt: 'unavailable', error_message: 'HTTP 503' })
      .mockResolvedValueOnce({ ok: true, http_status: 200, response_excerpt: '{"results":[{}]}' })

    const { client, inserts } = fakeSupabase({})
    await fireGoogleConversionEvent(baseInput(), client)

    expect(mockUpload).toHaveBeenCalledTimes(2)
    expect(inserts[0]).toMatchObject({
      status: 'success',
      http_status: 200,
      retry_count: 1,
    })
  })

  it('retries once on 5xx and records failure when the second attempt also fails (retry_count=1)', async () => {
    mockLoadConfig.mockResolvedValueOnce(activeConfig())
    mockUpload
      .mockResolvedValueOnce({ ok: false, http_status: 502, response_excerpt: 'gateway', error_message: 'HTTP 502' })
      .mockResolvedValueOnce({ ok: false, http_status: 502, response_excerpt: 'gateway', error_message: 'HTTP 502' })

    const { client, inserts } = fakeSupabase({})
    await fireGoogleConversionEvent(baseInput(), client)

    expect(mockUpload).toHaveBeenCalledTimes(2)
    expect(inserts[0]).toMatchObject({
      status: 'failure',
      http_status: 502,
      retry_count: 1,
      error_message: 'HTTP 502',
    })
  })

  it('does not throw when the prior-success SELECT errors (proceeds to fire)', async () => {
    mockLoadConfig.mockResolvedValueOnce(activeConfig())
    mockUpload.mockResolvedValueOnce({ ok: true, http_status: 200, response_excerpt: '{}' })
    const { client, inserts } = fakeSupabase({ priorSelectError: { message: 'transient' } })

    await fireGoogleConversionEvent(baseInput(), client)
    expect(mockUpload).toHaveBeenCalledTimes(1)
    expect(inserts[0].status).toBe('success')
  })
})
