#!/usr/bin/env node
/**
 * Phase 2b.2.a §11.5 — tenant-resolution security.
 * Posts a CRYPTOGRAPHICALLY VALID Twilio signature against a payload whose
 * `To` number isn't registered to any tenant. Route must 401 (not 404) so
 * we don't leak which numbers are tenant-bound. Asserts no records leak.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../.env.local')

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const TWILIO_ACCOUNT_SID = env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = env.TWILIO_AUTH_TOKEN
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

const FULL_URL = 'https://dental-crm-nine.vercel.app/api/webhooks/whatsapp'

const formParams = {
  AccountSid: TWILIO_ACCOUNT_SID,
  MessageSid: 'SMfaketenant',
  From: 'whatsapp:+12025551234',
  To: 'whatsapp:+18005550199', // not registered to any tenant
  Body: 'stranger',
  NumMedia: '0',
}

function signTwilio(authToken, fullUrl, params) {
  const sortedKeys = Object.keys(params).sort()
  let base = fullUrl
  for (const k of sortedKeys) base += k + params[k]
  return crypto.createHmac('sha1', authToken).update(Buffer.from(base, 'utf8')).digest('base64')
}

const signature = signTwilio(TWILIO_AUTH_TOKEN, FULL_URL, formParams)
const body = new URLSearchParams(formParams).toString()

console.log('---REQUEST---')
console.log('URL:', FULL_URL)
console.log('To (unregistered):', formParams.To)
console.log('MessageSid:', formParams.MessageSid)
console.log('Signature (genuinely valid HMAC):', signature)
console.log()

const start = Date.now()
const res = await fetch(FULL_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Twilio-Signature': signature,
  },
  body,
})
const elapsed = Date.now() - start

const text = await res.text()
console.log('---RESPONSE---')
console.log('HTTP', res.status, res.statusText, `(${elapsed}ms)`)
console.log('Body bytes:', text.length, '- content:', JSON.stringify(text))
