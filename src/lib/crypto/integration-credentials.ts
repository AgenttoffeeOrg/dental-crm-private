/**
 * Phase 2b.1.b.1 — AES-256-GCM encrypt/decrypt for integration credentials at rest.
 *
 * Used for the Google Ads OAuth refresh token (and any future per-tenant integration
 * secret stored as a TEXT column rather than via the `integration_secret_vault` /
 * `pgp_sym_*` Postgres flow).
 *
 * Key source: `process.env.INTEGRATION_CREDENTIAL_KEY`.
 *   - Preferred: a base64-encoded random 32-byte value (generated via
 *     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
 *   - Backwards-compat fallback: any non-empty passphrase. The helper SHA-256-hashes
 *     the raw bytes to derive a deterministic 32-byte key, which lets the same env
 *     value continue to drive both this AES-GCM helper and the existing pgcrypto
 *     `pgp_sym_encrypt`-based `integration_secret_vault` flow without rotation.
 *
 * Output format: base64( iv(12 bytes) || ciphertext || authTag(16 bytes) )
 *
 * Ciphertexts are NOT portable across keys — rotating `INTEGRATION_CREDENTIAL_KEY`
 * invalidates anything previously encrypted by this helper. Rows in
 * `google_lead_form_configs.oauth_refresh_token_encrypted` are the only consumer
 * today; rotating means re-running the OAuth connect flow per tenant.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

let cachedKey: Buffer | null = null

function deriveKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.INTEGRATION_CREDENTIAL_KEY
  if (!raw) {
    throw new Error('INTEGRATION_CREDENTIAL_KEY is not set')
  }

  // Preferred path: env value is base64 of exactly 32 bytes.
  let candidate: Buffer | null = null
  try {
    const decoded = Buffer.from(raw, 'base64')
    // Guard against base64 silently round-tripping non-base64 input. We require
    // both: (a) the decoded length is exactly 32 bytes, and (b) re-encoding the
    // decoded bytes reproduces the original env value (modulo padding) — this
    // catches the case where the env value is an arbitrary 22-char ASCII string
    // that happens to base64-decode without throwing.
    if (decoded.length === KEY_LEN && decoded.toString('base64').replace(/=+$/, '') === raw.replace(/=+$/, '')) {
      candidate = decoded
    }
  } catch {
    // ignore — fall through to passphrase derivation
  }

  // Fallback path: derive a deterministic 32-byte key from the passphrase.
  // SHA-256 is fixed-output 32 bytes; deterministic so a single env value
  // produces the same AES key across processes/restarts.
  if (!candidate) {
    candidate = createHash('sha256').update(raw, 'utf8').digest()
  }

  cachedKey = candidate
  return cachedKey
}

/** Test-only helper: clear the cached derived key so a changed env var takes effect. */
export function _resetCachedKeyForTests(): void {
  cachedKey = null
}

export function encryptIntegrationCredential(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encryptIntegrationCredential: plaintext must be a string')
  }
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, deriveKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, ct, tag]).toString('base64')
}

export function decryptIntegrationCredential(ciphertext: string): string {
  if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
    throw new TypeError('decryptIntegrationCredential: ciphertext must be a non-empty string')
  }
  const buf = Buffer.from(ciphertext, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('decryptIntegrationCredential: ciphertext too short')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(buf.length - TAG_LEN)
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN)
  const decipher = createDecipheriv(ALGO, deriveKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
