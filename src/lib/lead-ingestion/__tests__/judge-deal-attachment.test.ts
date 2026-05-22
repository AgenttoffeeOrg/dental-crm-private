/**
 * @jest-environment node
 *
 * Phase 2b.24.1 — Inbound deal-attachment judgement.
 *
 * Mocks `routePipeline` and walks the truth table:
 *   empty message       → uncertain (empty_message)
 *   router null         → uncertain (no_router_signal)
 *   router throws       → uncertain (router_error)
 *   source = unsorted   → uncertain (unsorted_fallback)
 *   source = none       → uncertain (unsorted_fallback)
 *   matching pipeline   → reuse_matching_pipeline
 *   non-matching        → new_pipeline
 *   multiple matches    → caller's concern; judge returns the FIRST hit
 */

import type { RouteResult } from '@/lib/automations/pipeline-router'

const routePipelineMock = jest.fn<Promise<RouteResult | null>, [unknown, unknown]>()
jest.mock('@/lib/automations/pipeline-router', () => ({
  routePipeline: (...args: unknown[]) => routePipelineMock(args[0], args[1]),
}))

import { judgeInboundDealAttachment } from '../judge-deal-attachment'

const tenantId = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const supabase = {} as never

beforeEach(() => {
  routePipelineMock.mockReset()
})

describe('judgeInboundDealAttachment', () => {
  it('short-circuits to uncertain when message text is empty', async () => {
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: '   ',
      openDeals: [{ id: 'd1', pipelineId: 'p1' }],
      supabase,
    })
    expect(result).toEqual({ kind: 'uncertain', reason: 'empty_message' })
    expect(routePipelineMock).not.toHaveBeenCalled()
  })

  it('returns uncertain when router returns null', async () => {
    routePipelineMock.mockResolvedValue(null)
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'thanks',
      openDeals: [{ id: 'd1', pipelineId: 'p1' }],
      supabase,
    })
    expect(result).toEqual({ kind: 'uncertain', reason: 'no_router_signal' })
  })

  it('returns uncertain when router throws', async () => {
    routePipelineMock.mockRejectedValue(new Error('boom'))
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'thanks',
      openDeals: [{ id: 'd1', pipelineId: 'p1' }],
      supabase,
    })
    expect(result).toEqual({ kind: 'uncertain', reason: 'router_error' })
  })

  it('returns uncertain when router falls back to unsorted', async () => {
    routePipelineMock.mockResolvedValue({ pipelineId: 'unsorted_pipeline', source: 'unsorted' })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'hi',
      openDeals: [{ id: 'd1', pipelineId: 'p1' }],
      supabase,
    })
    expect(result).toEqual({ kind: 'uncertain', reason: 'unsorted_fallback' })
  })

  it('treats source=none as uncertain too (defensive — router should never return this, but if it does)', async () => {
    routePipelineMock.mockResolvedValue({ pipelineId: 'p_x', source: 'none' as never })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'hi',
      openDeals: [{ id: 'd1', pipelineId: 'p1' }],
      supabase,
    })
    expect(result).toEqual({ kind: 'uncertain', reason: 'unsorted_fallback' })
  })

  it('reuses the matching open deal when AI classifies into its pipeline', async () => {
    routePipelineMock.mockResolvedValue({ pipelineId: 'p_implants', source: 'ai', confidence: 92 })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'when can I book my implant consult?',
      openDeals: [
        { id: 'd_invisalign', pipelineId: 'p_invisalign' },
        { id: 'd_implants', pipelineId: 'p_implants' },
      ],
      supabase,
    })
    expect(result).toEqual({
      kind: 'reuse_matching_pipeline',
      dealId: 'd_implants',
      pipelineId: 'p_implants',
      confidence: 92,
      source: 'ai',
    })
  })

  it('reuses when the match is via a keyword rule, not AI', async () => {
    routePipelineMock.mockResolvedValue({
      pipelineId: 'p_implants',
      source: 'keyword',
      matchedKeyword: 'implant',
    })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'implant question',
      openDeals: [{ id: 'd_implants', pipelineId: 'p_implants' }],
      supabase,
    })
    expect(result).toMatchObject({
      kind: 'reuse_matching_pipeline',
      dealId: 'd_implants',
      pipelineId: 'p_implants',
      source: 'keyword',
      confidence: null,
    })
  })

  it('returns new_pipeline when the classified pipeline matches no existing open deal', async () => {
    routePipelineMock.mockResolvedValue({ pipelineId: 'p_invisalign', source: 'ai', confidence: 88 })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'hi, also wondering about Invisalign',
      openDeals: [{ id: 'd_implants', pipelineId: 'p_implants' }],
      supabase,
    })
    expect(result).toEqual({
      kind: 'new_pipeline',
      pipelineId: 'p_invisalign',
      confidence: 88,
      source: 'ai',
    })
  })

  it('returns new_pipeline when there are NO open deals to match against', async () => {
    routePipelineMock.mockResolvedValue({ pipelineId: 'p_implants', source: 'ai', confidence: 80 })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'I want implants',
      openDeals: [],
      supabase,
    })
    expect(result).toMatchObject({ kind: 'new_pipeline', pipelineId: 'p_implants' })
  })

  it('picks the first matching open deal when multiple are in the same pipeline', async () => {
    routePipelineMock.mockResolvedValue({ pipelineId: 'p_implants', source: 'ai', confidence: 75 })
    const result = await judgeInboundDealAttachment({
      tenantId,
      messageText: 'hi',
      openDeals: [
        { id: 'd_implants_old', pipelineId: 'p_implants' },
        { id: 'd_implants_new', pipelineId: 'p_implants' },
      ],
      supabase,
    })
    // Caller (ingestLead) is responsible for resolving "most recently active"
    // among multiple matches — the judge just signals reuse.
    expect(result).toMatchObject({ kind: 'reuse_matching_pipeline', dealId: 'd_implants_old' })
  })

  it('passes the supabase client through to the router', async () => {
    routePipelineMock.mockResolvedValue(null)
    const sb = { __mark: 'service' } as unknown as never
    await judgeInboundDealAttachment({
      tenantId,
      messageText: 'hello',
      openDeals: [],
      supabase: sb,
    })
    expect(routePipelineMock).toHaveBeenCalledWith(
      { tenantId, intentText: 'hello' },
      { supabase: sb }
    )
  })
})
