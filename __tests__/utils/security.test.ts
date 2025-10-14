import { sanitizeInput, validateEmail, validatePhone, escapeHtml } from '@/lib/utils/security'

describe('Security Utils', () => {
  describe('sanitizeInput', () => {
    it('removes dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
    })

    it('removes javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
    })
  })

  describe('validateEmail', () => {
    it('validates correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user+tag@domain.co.uk')).toBe(true)
    })

    it('rejects invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })
  })

  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      expect(escapeHtml('<div>Test & "quotes"</div>')).toBe(
        '&lt;div&gt;Test &amp; &quot;quotes&quot;&lt;/div&gt;'
      )
    })
  })
})


