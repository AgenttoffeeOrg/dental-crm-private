/**
 * @jest-environment node
 *
 * Phase 2b.2.a — Twilio signature helper tests.
 *
 * The signature scheme is well-known (HMAC-SHA1 of authToken over
 * fullUrl + sortedKeys.flat()). We generate a known-good signature locally
 * with the same primitive and pin it as the fixture, mirroring Twilio's
 * SDK reference implementation.
 */

import crypto from 'node:crypto'
import { verifyTwilioSignature } from '../twilio-signature'

const AUTH_TOKEN = 'test-auth-token-2b2a'
const FULL_URL = 'https://dental-crm-nine.vercel.app/api/webhooks/whatsapp'

const FORM = {
  AccountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  Body: 'Hello from new lead test',
  From: 'whatsapp:+919916558958',
  MessageSid: 'SM21e529441bf3ed5b583a6be82303b50c',
  NumMedia: '0',
  ProfileName: 'Deepak',
  To: 'whatsapp:+14155238886',
}

function computeKnownGoodSignature(
  url: string,
  params: Record<string, string>,
  token: string
): string {
  const sortedKeys = Object.keys(params).sort()
  let base = url
  for (const key of sortedKeys) {
    base += key + params[key]
  }
  return crypto
    .createHmac('sha1', token)
    .update(Buffer.from(base, 'utf-8'))
    .digest('base64')
}

describe('verifyTwilioSignature', () => {
  const validSignature = computeKnownGoodSignature(FULL_URL, FORM, AUTH_TOKEN)

  it('returns "valid" when the header matches the HMAC of url + sorted form params', () => {
    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: validSignature,
        fullUrl: FULL_URL,
        formParams: FORM,
      })
    ).toBe('valid')
  })

  it('returns "missing_header" when signatureHeader is null', () => {
    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: null,
        fullUrl: FULL_URL,
        formParams: FORM,
      })
    ).toBe('missing_header')
  })

  it('returns "invalid_signature" when the body has been tampered with', () => {
    const tamperedForm = { ...FORM, Body: 'totally different body' }
    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: validSignature,
        fullUrl: FULL_URL,
        formParams: tamperedForm,
      })
    ).toBe('invalid_signature')
  })

  it('returns "invalid_signature" when the URL has been tampered with', () => {
    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: validSignature,
        fullUrl: 'https://dental-crm-nine.vercel.app/api/webhooks/whatsapp?evil=1',
        formParams: FORM,
      })
    ).toBe('invalid_signature')
  })

  it('returns "invalid_signature" when the signature header is garbage', () => {
    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: 'not-a-real-signature',
        fullUrl: FULL_URL,
        formParams: FORM,
      })
    ).toBe('invalid_signature')
  })

  it('returns "invalid_signature" when the signature header is the right length but wrong bytes', () => {
    // Same length as a base64 SHA1 (28 chars) but completely different bytes.
    const fakeSignature = 'A'.repeat(validSignature.length - 1) + '='
    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: fakeSignature,
        fullUrl: FULL_URL,
        formParams: FORM,
      })
    ).toBe('invalid_signature')
  })

  it('returns "invalid_signature" when the auth token is the wrong one', () => {
    expect(
      verifyTwilioSignature({
        authToken: 'completely-different-token',
        signatureHeader: validSignature,
        fullUrl: FULL_URL,
        formParams: FORM,
      })
    ).toBe('invalid_signature')
  })

  it('produces the same signature regardless of insertion order of formParams (sorted keys)', () => {
    const reordered: Record<string, string> = {}
    // Insert in deliberately-jumbled order
    reordered.To = FORM.To
    reordered.From = FORM.From
    reordered.Body = FORM.Body
    reordered.AccountSid = FORM.AccountSid
    reordered.NumMedia = FORM.NumMedia
    reordered.MessageSid = FORM.MessageSid
    reordered.ProfileName = FORM.ProfileName

    expect(
      verifyTwilioSignature({
        authToken: AUTH_TOKEN,
        signatureHeader: validSignature,
        fullUrl: FULL_URL,
        formParams: reordered,
      })
    ).toBe('valid')
  })

  it('returns "missing_header" before any HMAC work happens (null short-circuits)', () => {
    // No HMAC call, no auth token needed — proves the missing_header branch
    // doesn't accidentally fall through to a HMAC compare.
    expect(
      verifyTwilioSignature({
        authToken: '',
        signatureHeader: null,
        fullUrl: FULL_URL,
        formParams: FORM,
      })
    ).toBe('missing_header')
  })
})
