/**
 * Phase 2b.2.a — Twilio webhook signature verification.
 *
 * Tri-state result:
 *   'valid'             — header present and HMAC matches.
 *   'missing_header'    — `X-Twilio-Signature` was not on the request.
 *   'invalid_signature' — header present but did not match the computed HMAC.
 *
 * Callers MUST treat 'missing_header' and 'invalid_signature' identically
 * (both → 401). The pre-2b.2.a route silently treated 'missing_header' as
 * 'valid' (`if (signature && !verify(...))`), which let anyone who knew the
 * URL post fake messages. Closing that hole is the security half of this
 * phase.
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *   - Signature = HMAC-SHA1(authToken, fullUrl + sortedKeys.flat())
 *   - sortedKeys are the form-encoded body keys, sorted ASCII-ascending,
 *     each concatenated as `key + value` with no separator.
 *   - Compare base64-encoded HMAC against the header, constant-time.
 */

import crypto from 'node:crypto'

export type TwilioSignatureResult =
  | 'valid'
  | 'missing_header'
  | 'invalid_signature'

export interface VerifyTwilioSignatureArgs {
  /** Account auth token. The route reads this from `process.env.TWILIO_AUTH_TOKEN`. */
  authToken: string
  /** Raw `X-Twilio-Signature` header value, or null when absent. */
  signatureHeader: string | null
  /** Full URL Twilio POSTed to, including any query string. Read from `request.url`. */
  fullUrl: string
  /** Form-encoded body parsed into a plain object (string values only). */
  formParams: Record<string, string>
}

/**
 * Compute the canonical HMAC base for a Twilio webhook request:
 *   fullUrl + Σ (key + value) for keys sorted ASCII-ascending.
 *
 * Pulled out as a small helper so the route never needs to know the spec.
 */
function buildSignatureBase(
  fullUrl: string,
  formParams: Record<string, string>
): string {
  const sortedKeys = Object.keys(formParams).sort()
  let base = fullUrl
  for (const key of sortedKeys) {
    base += key + formParams[key]
  }
  return base
}

/**
 * Constant-time compare of two base64-encoded strings.
 * `timingSafeEqual` requires equal-length buffers; if lengths differ we know
 * the comparison fails — return false without leaking via early return.
 */
function constantTimeBase64Equal(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf-8')
  const bBuf = Buffer.from(b, 'utf-8')
  if (aBuf.length !== bBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function verifyTwilioSignature(
  args: VerifyTwilioSignatureArgs
): TwilioSignatureResult {
  const { authToken, signatureHeader, fullUrl, formParams } = args

  if (signatureHeader === null || signatureHeader === undefined) {
    return 'missing_header'
  }

  if (!authToken || !fullUrl) {
    // Misconfiguration on our side — surface as invalid_signature so the
    // route returns 401 instead of leaking the underlying cause.
    return 'invalid_signature'
  }

  let expected: string
  try {
    const base = buildSignatureBase(fullUrl, formParams)
    expected = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(base, 'utf-8'))
      .digest('base64')
  } catch {
    return 'invalid_signature'
  }

  return constantTimeBase64Equal(expected, signatureHeader)
    ? 'valid'
    : 'invalid_signature'
}
