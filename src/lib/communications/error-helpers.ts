const FRIENDLY_ERROR_PREFIXES = [
  'Send failed —',
  'Email provider not configured',
  'SMS provider not configured',
  'WhatsApp provider not configured',
] as const

export function getFriendlyErrorMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null
  if (!err.message) return null
  for (const prefix of FRIENDLY_ERROR_PREFIXES) {
    if (err.message.startsWith(prefix)) return err.message
  }
  return null
}
