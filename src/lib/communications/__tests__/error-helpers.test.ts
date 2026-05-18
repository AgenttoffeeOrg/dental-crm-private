import { getFriendlyErrorMessage } from '@/lib/communications/error-helpers'

describe('getFriendlyErrorMessage', () => {
  it('returns message for Send failed — prefix', () => {
    const err = new Error('Send failed — invalid SMS credentials')
    expect(getFriendlyErrorMessage(err)).toBe('Send failed — invalid SMS credentials')
  })

  it('returns message for Email provider not configured prefix', () => {
    const err = new Error(
      'Email provider not configured. Please configure in Settings → Integrations.'
    )
    expect(getFriendlyErrorMessage(err)).toBe(err.message)
  })

  it('returns message for SMS provider not configured prefix', () => {
    const err = new Error(
      'SMS provider not configured. Please configure in Settings → Integrations.'
    )
    expect(getFriendlyErrorMessage(err)).toBe(err.message)
  })

  it('returns message for WhatsApp provider not configured prefix', () => {
    const err = new Error(
      'WhatsApp provider not configured. Please configure in Settings → Integrations.'
    )
    expect(getFriendlyErrorMessage(err)).toBe(err.message)
  })

  it('returns null for unknown message', () => {
    expect(getFriendlyErrorMessage(new Error('database connection failed'))).toBeNull()
  })

  it('returns null for non-Error value', () => {
    expect(getFriendlyErrorMessage('oops')).toBeNull()
    expect(getFriendlyErrorMessage(null)).toBeNull()
  })
})
