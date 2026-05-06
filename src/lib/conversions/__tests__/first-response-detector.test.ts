/**
 * @jest-environment node
 *
 * Phase 2b.1.b.1 — unit tests for detectAndFireFirstResponse.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { detectAndFireFirstResponse } from '../first-response-detector'

const mockFire = jest.fn()
jest.mock('../fire-conversion-event', () => ({
  fireGoogleConversionEvent: (...args: unknown[]) => mockFire(...args),
}))

interface FakeRow {
  data: Record<string, unknown> | null
}

function rowFor(table: string, rows: { deal?: FakeRow; touchpoint?: FakeRow; contact?: FakeRow }): Record<string, unknown> | null {
  const map: Record<string, FakeRow | undefined> = {
    deals: rows.deal,
    attribution_touchpoints: rows.touchpoint,
    contacts: rows.contact,
  }
  return map[table]?.data ?? null
}

function fakeSupabase(rows: {
  deal?: FakeRow
  touchpoint?: FakeRow
  contact?: FakeRow
}): SupabaseClient {
  const fromImpl = (table: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: rowFor(table, rows), error: null }),
    }
    return chain
  }
  return { from: fromImpl } as unknown as SupabaseClient
}

beforeEach(() => mockFire.mockReset())

describe('detectAndFireFirstResponse', () => {
  const baseArgs = {
    tenant_id: 'tenant-uuid',
    contact_id: 'contact-uuid',
    deal_id: 'deal-uuid',
    direction: 'outbound' as const,
    occurred_at: '2026-05-06T12:00:00.000Z',
  }

  it('no-ops on inbound activities', async () => {
    await detectAndFireFirstResponse({ ...baseArgs, direction: 'inbound' }, fakeSupabase({}))
    expect(mockFire).not.toHaveBeenCalled()
  })

  it('no-ops when deal_id is null', async () => {
    await detectAndFireFirstResponse({ ...baseArgs, deal_id: null }, fakeSupabase({}))
    expect(mockFire).not.toHaveBeenCalled()
  })

  it('no-ops when the deal lookup returns no row', async () => {
    await detectAndFireFirstResponse(baseArgs, fakeSupabase({ deal: { data: null } }))
    expect(mockFire).not.toHaveBeenCalled()
  })

  it('no-ops when first_response_at is null on the deal', async () => {
    await detectAndFireFirstResponse(
      baseArgs,
      fakeSupabase({ deal: { data: { id: 'deal-uuid', contact_id: 'contact-uuid', first_response_at: null } } })
    )
    expect(mockFire).not.toHaveBeenCalled()
  })

  it('no-ops when first_response_at is more than the window earlier (already-fired deal)', async () => {
    // Simulate "first response was an hour ago, this is a follow-up": first_response_at much earlier than args.occurred_at.
    await detectAndFireFirstResponse(
      baseArgs,
      fakeSupabase({
        deal: {
          data: {
            id: 'deal-uuid',
            contact_id: 'contact-uuid',
            first_response_at: '2026-05-06T11:00:00.000Z',
          },
        },
      })
    )
    expect(mockFire).not.toHaveBeenCalled()
  })

  it('fires when first_response_at matches occurred_at within the 5s window', async () => {
    await detectAndFireFirstResponse(
      baseArgs,
      fakeSupabase({
        deal: {
          data: {
            id: 'deal-uuid',
            contact_id: 'contact-uuid',
            first_response_at: '2026-05-06T12:00:01.500Z',
          },
        },
        touchpoint: { data: { gclid: 'TP_GCLID' } },
        contact: { data: { primary_email_norm: 'sarah@example.com', primary_phone_e164: '+447700900100' } },
      })
    )

    expect(mockFire).toHaveBeenCalledTimes(1)
    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-uuid',
        deal_id: 'deal-uuid',
        contact_id: 'contact-uuid',
        event_type: 'FirstResponse',
        gclid: 'TP_GCLID',
        email: 'sarah@example.com',
        phone_e164: '+447700900100',
        occurred_at: '2026-05-06T12:00:00.000Z',
      }),
      expect.anything()
    )
  })

  it('falls back to deal.contact_id when caller-supplied contact_id is null', async () => {
    await detectAndFireFirstResponse(
      { ...baseArgs, contact_id: null },
      fakeSupabase({
        deal: {
          data: {
            id: 'deal-uuid',
            contact_id: 'fallback-contact',
            first_response_at: '2026-05-06T12:00:00.000Z',
          },
        },
        contact: { data: { primary_email: 'fallback@example.com', primary_phone_e164: null } },
      })
    )

    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({ contact_id: 'fallback-contact', email: 'fallback@example.com', phone_e164: null }),
      expect.anything()
    )
  })

  it('passes gclid=null when no touchpoint with gclid exists', async () => {
    await detectAndFireFirstResponse(
      baseArgs,
      fakeSupabase({
        deal: {
          data: {
            id: 'deal-uuid',
            contact_id: 'contact-uuid',
            first_response_at: '2026-05-06T12:00:00.000Z',
          },
        },
        touchpoint: { data: null },
        contact: { data: { primary_email: 'p@example.com', primary_phone_e164: null } },
      })
    )

    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({ gclid: null, email: 'p@example.com' }),
      expect.anything()
    )
  })
})
