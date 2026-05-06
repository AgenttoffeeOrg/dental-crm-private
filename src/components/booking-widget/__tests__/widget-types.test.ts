import { buildWhatsAppLink, isValidSlug } from '@/lib/booking-widget/types'

describe('isValidSlug', () => {
  it('accepts well-formed slugs', () => {
    expect(isValidSlug('acme-dental')).toBe(true)
    expect(isValidSlug('a1b2c3')).toBe(true)
    expect(isValidSlug('practice-name-1234')).toBe(true)
  })
  it('rejects malformed slugs', () => {
    expect(isValidSlug('Ac')).toBe(false)
    expect(isValidSlug('-acme-dental')).toBe(false)
    expect(isValidSlug('acme--dental-')).toBe(false)
    expect(isValidSlug('acme dental')).toBe(false)
    expect(isValidSlug('Acme-Dental')).toBe(false)
    expect(isValidSlug('a')).toBe(false)
  })
})

describe('buildWhatsAppLink', () => {
  it('strips non-digits from the number', () => {
    const url = buildWhatsAppLink('+44 7700 900900', null, null)
    expect(url).toMatch(/wa\.me\/447700900900\?/)
  })
  it('substitutes the {treatment} token in the prefill template', () => {
    const url = buildWhatsAppLink('447700900900', "Hi, I'd like info about {treatment}.", 'Whitening')
    const decoded = decodeURIComponent(new URL(url).searchParams.get('text') ?? '')
    expect(decoded).toContain("Hi, I'd like info about Whitening.")
  })
  it('falls back to a generic treatment when no label provided', () => {
    const url = buildWhatsAppLink('447700900900', 'Hi about {treatment}!', null)
    const decoded = decodeURIComponent(new URL(url).searchParams.get('text') ?? '')
    expect(decoded).toBe('Hi about a treatment!')
  })
})
