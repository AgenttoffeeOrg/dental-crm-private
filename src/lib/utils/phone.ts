export function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone) return ''

  const trimmed = phone.trim()
  if (!trimmed) return ''

  // Keep leading + if present, otherwise we'll add one after cleaning digits
  const hasPlus = trimmed.startsWith('+')

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  if (hasPlus) {
    return `+${digits}`
  }

  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`
  }

  return `+${digits}`
}


