/**
 * @jest-environment node
 *
 * Phase 2b.23 — Pipeline router unit tests.
 *
 * Mocks the Supabase client; exercises the three-tier chain
 * (keyword → AI → unsorted → null fallthrough) and the per-rule
 * priority order.
 */

let settingsRow: Record<string, unknown> | null = null

const supabaseMock = {
  from(table: string) {
    if (table === 'tenant_routing_settings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: settingsRow, error: null }),
          }),
        }),
      }
    }
    if (table === 'pipelines') {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }
    }
    return {} as never
  },
}

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => supabaseMock),
}))

jest.mock('@/lib/anthropic-client', () => ({
  isAnthropicConfigured: jest.fn(() => false),
  claudeOneShot: jest.fn(),
  DEFAULT_CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
}))

jest.mock('@/lib/automations/practice-brain', () => ({
  loadPracticeBrain: jest.fn().mockResolvedValue({ services_offered: [] }),
}))

import { routePipeline } from '../pipeline-router'

beforeEach(() => {
  settingsRow = null
})

describe('routePipeline', () => {
  it('returns null when routing disabled', async () => {
    settingsRow = { routing_enabled: false }
    const result = await routePipeline(
      { tenantId: 't1', intentText: 'anything' },
      { supabase: supabaseMock as never }
    )
    expect(result).toBeNull()
  })

  it('matches a keyword rule (case-insensitive)', async () => {
    settingsRow = {
      routing_enabled: true,
      ai_routing_enabled: false,
      ai_keyword_matching_enabled: true,
      unsorted_pipeline_id: null,
      keyword_pipeline_rules: [
        { keywords: ['Braces'], pipeline_id: 'pipe-orthodontics', priority: 5 },
      ],
    }
    const result = await routePipeline(
      { tenantId: 't1', intentText: 'do you offer braces for adults?' },
      { supabase: supabaseMock as never }
    )
    expect(result).toEqual(
      expect.objectContaining({
        pipelineId: 'pipe-orthodontics',
        source: 'keyword',
        matchedKeyword: 'Braces',
      })
    )
  })

  it('honours rule priority order', async () => {
    settingsRow = {
      routing_enabled: true,
      ai_routing_enabled: false,
      ai_keyword_matching_enabled: true,
      unsorted_pipeline_id: null,
      keyword_pipeline_rules: [
        { keywords: ['whitening'], pipeline_id: 'low-priority', priority: 1 },
        { keywords: ['whitening'], pipeline_id: 'high-priority', priority: 99 },
      ],
    }
    const result = await routePipeline(
      { tenantId: 't1', intentText: 'whitening please' },
      { supabase: supabaseMock as never }
    )
    expect(result?.pipelineId).toBe('high-priority')
  })

  it('falls back to unsorted when no keyword matches', async () => {
    settingsRow = {
      routing_enabled: true,
      ai_routing_enabled: false,
      ai_keyword_matching_enabled: true,
      unsorted_pipeline_id: 'pipe-unsorted',
      keyword_pipeline_rules: [],
    }
    const result = await routePipeline(
      { tenantId: 't1', intentText: 'just saying hi' },
      { supabase: supabaseMock as never }
    )
    expect(result).toEqual({ pipelineId: 'pipe-unsorted', source: 'unsorted' })
  })

  it('returns null when no rule hits and no unsorted pipeline', async () => {
    settingsRow = {
      routing_enabled: true,
      ai_routing_enabled: false,
      ai_keyword_matching_enabled: true,
      unsorted_pipeline_id: null,
      keyword_pipeline_rules: [],
    }
    const result = await routePipeline(
      { tenantId: 't1', intentText: 'just saying hi' },
      { supabase: supabaseMock as never }
    )
    expect(result).toBeNull()
  })

  it('skips keyword path entirely when intentText is empty', async () => {
    settingsRow = {
      routing_enabled: true,
      ai_routing_enabled: false,
      ai_keyword_matching_enabled: true,
      unsorted_pipeline_id: 'pipe-unsorted',
      keyword_pipeline_rules: [
        { keywords: ['braces'], pipeline_id: 'pipe-ortho', priority: 1 },
      ],
    }
    const result = await routePipeline(
      { tenantId: 't1', intentText: '' },
      { supabase: supabaseMock as never }
    )
    expect(result?.pipelineId).toBe('pipe-unsorted')
  })
})
