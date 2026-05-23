/**
 * @jest-environment node
 *
 * Phase 2b.34.1 — deal-title generator tests.
 *
 * Mocks the Anthropic client so we exercise the prompt-shape +
 * cleaning logic without hitting the network. cleanTitle is also
 * tested directly because it absorbs every edge case Claude can
 * emit.
 */

import { cleanTitle, generateDealTitle } from '../deal-title'

const mockClaudeOneShot = jest.fn<Promise<string | null>, [unknown]>()
const mockIsAnthropicConfigured = jest.fn<boolean, []>()

jest.mock('@/lib/anthropic-client', () => ({
  DEFAULT_CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
  claudeOneShot: (args: unknown) => mockClaudeOneShot(args),
  isAnthropicConfigured: () => mockIsAnthropicConfigured(),
}))

beforeEach(() => {
  mockClaudeOneShot.mockReset()
  mockIsAnthropicConfigured.mockReset()
  mockIsAnthropicConfigured.mockReturnValue(true)
})

describe('cleanTitle', () => {
  it('strips a leading "Title:" prefix', () => {
    expect(cleanTitle('Title: Implant Consult')).toBe('Implant Consult')
  })

  it('strips surrounding double quotes', () => {
    expect(cleanTitle('"Invisalign Enquiry"')).toBe('Invisalign Enquiry')
  })

  it('strips surrounding smart quotes', () => {
    expect(cleanTitle('“Whitening Question”')).toBe('Whitening Question')
  })

  it('strips trailing punctuation', () => {
    expect(cleanTitle('Implant Consult.')).toBe('Implant Consult')
    expect(cleanTitle('General Enquiry!')).toBe('General Enquiry')
  })

  it('keeps only the first line if Claude adds explanation', () => {
    expect(cleanTitle('Implant Consult\n\nThe patient asked about implants.')).toBe(
      'Implant Consult'
    )
  })

  it('rejects an empty string', () => {
    expect(cleanTitle('   ')).toBeNull()
  })

  it('rejects 9+ word outputs (Claude got verbose)', () => {
    expect(cleanTitle('Patient enquiring about cosmetic dentistry options for veneers and whitening')).toBeNull()
  })

  it('rejects titles longer than the 60-char cap', () => {
    const long = 'A'.repeat(80)
    expect(cleanTitle(long)).toBeNull()
  })

  it('strips a list-bullet prefix', () => {
    expect(cleanTitle('- Implant Consult')).toBe('Implant Consult')
    expect(cleanTitle('* Implant Consult')).toBe('Implant Consult')
  })
})

describe('generateDealTitle', () => {
  it('uses fallback when intent text is empty', async () => {
    const out = await generateDealTitle({ intentText: '', fallback: 'Inquiry' })
    expect(out).toBe('Inquiry')
    expect(mockClaudeOneShot).not.toHaveBeenCalled()
  })

  it('uses fallback when intent text is shorter than the minimum', async () => {
    const out = await generateDealTitle({ intentText: 'hi', fallback: 'Inquiry' })
    expect(out).toBe('Inquiry')
    expect(mockClaudeOneShot).not.toHaveBeenCalled()
  })

  it('uses fallback when Anthropic is not configured', async () => {
    mockIsAnthropicConfigured.mockReturnValue(false)
    const out = await generateDealTitle({
      intentText: 'Hi, I want to plan my implant treatment',
      fallback: 'Inquiry',
    })
    expect(out).toBe('Inquiry')
    expect(mockClaudeOneShot).not.toHaveBeenCalled()
  })

  it('returns the cleaned Claude title on the happy path', async () => {
    mockClaudeOneShot.mockResolvedValue('Implant Consult')
    const out = await generateDealTitle({
      intentText: 'Hi, I want to plan my implant treatment',
    })
    expect(out).toBe('Implant Consult')
  })

  it('passes the pipeline name into the user prompt as a hint', async () => {
    mockClaudeOneShot.mockResolvedValue('Whitening Consult')
    await generateDealTitle({
      intentText: 'I would like to whiten my teeth',
      pipelineName: 'Cosmetic Dentistry',
    })
    expect(mockClaudeOneShot).toHaveBeenCalledTimes(1)
    const call = (mockClaudeOneShot.mock.calls[0][0] ?? {}) as { user?: string }
    expect(call.user ?? '').toContain('Cosmetic Dentistry')
  })

  it('falls back when Claude throws', async () => {
    mockClaudeOneShot.mockRejectedValue(new Error('boom'))
    const out = await generateDealTitle({
      intentText: 'Hi, I want to plan my implant treatment',
      fallback: 'Inquiry',
    })
    expect(out).toBe('Inquiry')
  })

  it('falls back when Claude returns garbage that fails cleaning', async () => {
    mockClaudeOneShot.mockResolvedValue('   ')
    const out = await generateDealTitle({
      intentText: 'real message about implants',
      fallback: 'Inquiry',
    })
    expect(out).toBe('Inquiry')
  })

  it('falls back when Claude returns an over-long title', async () => {
    mockClaudeOneShot.mockResolvedValue(
      'A really long verbose response that exceeds reasonable title length'
    )
    const out = await generateDealTitle({
      intentText: 'real message',
      fallback: 'Inquiry',
    })
    expect(out).toBe('Inquiry')
  })

  it('default fallback is "Inquiry" when none is passed', async () => {
    mockIsAnthropicConfigured.mockReturnValue(false)
    const out = await generateDealTitle({
      intentText: 'real message about implants',
    })
    expect(out).toBe('Inquiry')
  })
})
