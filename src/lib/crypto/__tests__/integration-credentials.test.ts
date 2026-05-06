/**
 * @jest-environment node
 *
 * Phase 2b.1.b.1 — unit tests for the AES-256-GCM credential helper.
 */

import {
  encryptIntegrationCredential,
  decryptIntegrationCredential,
  _resetCachedKeyForTests,
} from '../integration-credentials'

const ORIGINAL_KEY = process.env.INTEGRATION_CREDENTIAL_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.INTEGRATION_CREDENTIAL_KEY
  } else {
    process.env.INTEGRATION_CREDENTIAL_KEY = ORIGINAL_KEY
  }
  _resetCachedKeyForTests()
})

describe('integration-credentials helper', () => {
  it('round-trips with a valid base64-32-byte key', () => {
    process.env.INTEGRATION_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString('base64')
    _resetCachedKeyForTests()

    const plain = 'gho_supersecret_refresh_token_value_123'
    const ct = encryptIntegrationCredential(plain)
    expect(ct).not.toContain(plain)
    expect(decryptIntegrationCredential(ct)).toBe(plain)
  })

  it('round-trips with a passphrase that is not base64-32-bytes (SHA-256-derived key)', () => {
    process.env.INTEGRATION_CREDENTIAL_KEY = 'Agenttoffee!1406milo'
    _resetCachedKeyForTests()

    const plain = '1//abc.refresh_token'
    const ct = encryptIntegrationCredential(plain)
    expect(decryptIntegrationCredential(ct)).toBe(plain)
  })

  it('produces a different ciphertext per encrypt call (random IV)', () => {
    process.env.INTEGRATION_CREDENTIAL_KEY = Buffer.alloc(32, 1).toString('base64')
    _resetCachedKeyForTests()

    const plain = 'same-plaintext'
    const ct1 = encryptIntegrationCredential(plain)
    const ct2 = encryptIntegrationCredential(plain)
    expect(ct1).not.toBe(ct2)
    expect(decryptIntegrationCredential(ct1)).toBe(plain)
    expect(decryptIntegrationCredential(ct2)).toBe(plain)
  })

  it('throws when the env var is unset', () => {
    delete process.env.INTEGRATION_CREDENTIAL_KEY
    _resetCachedKeyForTests()
    expect(() => encryptIntegrationCredential('x')).toThrow(/INTEGRATION_CREDENTIAL_KEY/)
  })

  it('throws on tampered ciphertext (auth-tag mismatch)', () => {
    process.env.INTEGRATION_CREDENTIAL_KEY = Buffer.alloc(32, 9).toString('base64')
    _resetCachedKeyForTests()

    const ct = encryptIntegrationCredential('payload')
    const tampered = Buffer.from(ct, 'base64')
    // flip a byte in the middle (inside the ciphertext region)
    tampered[16] ^= 0xff
    expect(() =>
      decryptIntegrationCredential(tampered.toString('base64'))
    ).toThrow()
  })

  it('throws on too-short ciphertext', () => {
    process.env.INTEGRATION_CREDENTIAL_KEY = Buffer.alloc(32, 2).toString('base64')
    _resetCachedKeyForTests()

    expect(() => decryptIntegrationCredential('aGk=')).toThrow(/too short/)
  })

  it('throws TypeError on non-string plaintext', () => {
    process.env.INTEGRATION_CREDENTIAL_KEY = Buffer.alloc(32, 3).toString('base64')
    _resetCachedKeyForTests()

    expect(() =>
      encryptIntegrationCredential(undefined as unknown as string)
    ).toThrow(TypeError)
  })

  it('rejects a 32-byte ASCII passphrase that base64-decodes to 24 bytes (uses SHA-256 path instead)', () => {
    // 'abcdefghijklmnopqrstuvwxyzABCDEF' is 32 ASCII chars; as base64 it decodes to 24 bytes.
    // The helper must NOT accept this as a "valid base64 32-byte key".
    process.env.INTEGRATION_CREDENTIAL_KEY = 'abcdefghijklmnopqrstuvwxyzABCDEF'
    _resetCachedKeyForTests()

    const plain = 'p'
    const ct = encryptIntegrationCredential(plain)
    // round-trip still works (SHA-256 fallback)
    expect(decryptIntegrationCredential(ct)).toBe(plain)
  })
})
