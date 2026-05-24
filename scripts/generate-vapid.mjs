#!/usr/bin/env node
/**
 * One-off script — generate VAPID keypair for Web Push notifications.
 *
 * Usage:
 *   node scripts/generate-vapid.mjs
 *
 * Prints the public + private keys. Add them to:
 *   - .env.local (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT)
 *   - Vercel env vars (Production + Preview + Development)
 *
 * Run once per project. NEVER rotate after launch — every device that
 * subscribed under the old key would silently stop receiving pushes.
 */

import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('# Add these to .env.local and Vercel env vars:')
console.log('')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:deepakshegde@gmail.com`)
console.log('')
console.log('# Public key length:', keys.publicKey.length)
console.log('# Private key length:', keys.privateKey.length)
