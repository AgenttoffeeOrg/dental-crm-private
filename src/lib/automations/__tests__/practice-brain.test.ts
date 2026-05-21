/**
 * @jest-environment node
 *
 * Phase 2b.13 — Practice Brain helper tests.
 * Pure-logic coverage on the prompt-fragment builder + the empty-default
 * fallback. The loadPracticeBrain happy/sad paths are exercised against
 * a mocked service client.
 */

let lastTable: string | null = null
let mockMaybeSingleResult: { data: Record<string, unknown> | null; error: unknown } = {
  data: null,
  error: null,
}

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => ({
    from(table: string) {
      lastTable = table
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: jest.fn().mockResolvedValue(mockMaybeSingleResult),
              }
            },
          }
        },
      }
    },
  })),
}))

import {
  buildPracticeBrainPromptFragment,
  emptyPracticeBrain,
  loadPracticeBrain,
  type PracticeBrain,
} from '../practice-brain'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'

beforeEach(() => {
  jest.clearAllMocks()
  lastTable = null
  mockMaybeSingleResult = { data: null, error: null }
})

describe('emptyPracticeBrain', () => {
  it('returns a brain with empty defaults and the given tenant id', () => {
    const brain = emptyPracticeBrain(TENANT)
    expect(brain.tenant_id).toBe(TENANT)
    expect(brain.brand_voice).toBeNull()
    expect(brain.services_offered).toEqual([])
    expect(brain.pricing).toEqual([])
    expect(brain.opening_hours).toEqual({})
    expect(brain.faqs).toEqual([])
  })
})

describe('loadPracticeBrain', () => {
  it('queries the tenant_ai_context table', async () => {
    await loadPracticeBrain(TENANT)
    expect(lastTable).toBe('tenant_ai_context')
  })

  it('returns empty default when no row exists', async () => {
    mockMaybeSingleResult = { data: null, error: null }
    const brain = await loadPracticeBrain(TENANT)
    expect(brain.tenant_id).toBe(TENANT)
    expect(brain.brand_voice).toBeNull()
    expect(brain.services_offered).toEqual([])
  })

  it('returns empty default on db error (does not throw)', async () => {
    mockMaybeSingleResult = { data: null, error: { message: 'boom' } }
    const brain = await loadPracticeBrain(TENANT)
    expect(brain.tenant_id).toBe(TENANT)
    expect(brain.brand_voice).toBeNull()
  })

  it('hydrates fields from a real row', async () => {
    mockMaybeSingleResult = {
      data: {
        tenant_id: TENANT,
        brand_voice: 'Warm, conversational.',
        practice_description: 'Family-run dental practice.',
        services_offered: [{ name: 'Invisalign' }],
        pricing: [{ service: 'Whitening', price: 'from £350' }],
        opening_hours: { monday: { open: '09:00', close: '17:00' } },
        faqs: [{ question: 'NHS?', answer: 'Private only.' }],
        escalation_rules: 'Pain → escalate',
        additional_instructions: null,
        updated_at: '2026-05-21T12:00:00Z',
      },
      error: null,
    }
    const brain = await loadPracticeBrain(TENANT)
    expect(brain.brand_voice).toBe('Warm, conversational.')
    expect(brain.services_offered).toEqual([{ name: 'Invisalign' }])
    expect(brain.opening_hours.monday).toEqual({ open: '09:00', close: '17:00' })
    expect(brain.faqs[0]?.question).toBe('NHS?')
  })

  it('coerces malformed jsonb arrays/objects to safe defaults', async () => {
    mockMaybeSingleResult = {
      data: {
        tenant_id: TENANT,
        brand_voice: null,
        practice_description: null,
        services_offered: 'not-an-array',
        pricing: null,
        opening_hours: null,
        faqs: 'nope',
        escalation_rules: null,
        additional_instructions: null,
        updated_at: null,
      },
      error: null,
    }
    const brain = await loadPracticeBrain(TENANT)
    expect(brain.services_offered).toEqual([])
    expect(brain.pricing).toEqual([])
    expect(brain.opening_hours).toEqual({})
    expect(brain.faqs).toEqual([])
  })
})

describe('buildPracticeBrainPromptFragment', () => {
  it('omits sections with no content', () => {
    const brain: PracticeBrain = emptyPracticeBrain(TENANT)
    expect(buildPracticeBrainPromptFragment(brain)).toBe('')
  })

  it('renders practice description and brand voice', () => {
    const brain: PracticeBrain = {
      ...emptyPracticeBrain(TENANT),
      practice_description: 'Family practice.',
      brand_voice: 'Warm and reassuring.',
    }
    const out = buildPracticeBrainPromptFragment(brain)
    expect(out).toContain('About the practice:')
    expect(out).toContain('Family practice.')
    expect(out).toContain('Brand voice:')
    expect(out).toContain('Warm and reassuring.')
  })

  it('renders structured fields', () => {
    const brain: PracticeBrain = {
      ...emptyPracticeBrain(TENANT),
      services_offered: [{ name: 'Whitening', description: 'In-chair' }],
      pricing: [{ service: 'Whitening', price: 'from £350', notes: 'inc. consult' }],
      opening_hours: {
        monday: { open: '09:00', close: '17:00' },
        sunday: { closed: true },
      },
      faqs: [{ question: 'NHS?', answer: 'Private only.' }],
      escalation_rules: 'Pain → escalate to duty dentist.',
    }
    const out = buildPracticeBrainPromptFragment(brain)
    expect(out).toContain('Services offered:')
    expect(out).toContain('- Whitening — In-chair')
    expect(out).toContain('Pricing:')
    expect(out).toContain('Whitening: from £350 (inc. consult)')
    expect(out).toContain('Opening hours:')
    expect(out).toContain('- monday: 09:00–17:00')
    expect(out).toContain('- sunday: closed')
    expect(out).toContain('Frequently asked questions:')
    expect(out).toContain('Q: NHS?')
    expect(out).toContain('A: Private only.')
    expect(out).toContain('Escalation rules')
  })

  it('skips list rows with missing required fields', () => {
    const brain: PracticeBrain = {
      ...emptyPracticeBrain(TENANT),
      services_offered: [
        { name: '' },
        { name: 'Real one' },
      ],
      pricing: [
        { service: '', price: '£100' },
        { service: 'Real', price: '£200' },
      ],
      faqs: [
        { question: 'No answer', answer: '' },
        { question: 'Real Q', answer: 'Real A' },
      ],
    }
    const out = buildPracticeBrainPromptFragment(brain)
    expect(out).toContain('- Real one')
    expect(out).not.toMatch(/^- $/m)
    expect(out).toContain('Real: £200')
    expect(out).toContain('Q: Real Q')
    expect(out).not.toContain('Q: No answer')
  })
})
