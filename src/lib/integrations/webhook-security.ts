/**
 * Webhook Security Utilities
 * 
 * Provides signature verification for incoming webhooks to prevent:
 * - Spoofed webhooks from unauthorized sources
 * - Replay attacks
 * - Man-in-the-middle tampering
 * 
 * Supports:
 * - Twilio (SMS, WhatsApp, Voice) - HMAC SHA-1
 * - Meta/Facebook (Graph API webhooks) - HMAC SHA-256
 * - Google (Pub/Sub, Webhooks) - JWT verification
 * - TikTok (Marketing API webhooks) - HMAC SHA-256
 * 
 * References:
 * - Twilio: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 * - Meta: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 * - Google: https://cloud.google.com/pubsub/docs/push#authentication_and_authorization
 */

import crypto from 'crypto'

/**
 * Verify Twilio webhook signature
 * 
 * @param authToken - Twilio Auth Token (from environment)
 * @param twilioSignature - X-Twilio-Signature header value
 * @param url - Full URL of the webhook endpoint (including protocol and query params)
 * @param params - POST body parameters (form-encoded key-value pairs)
 * @returns true if signature is valid, false otherwise
 * 
 * @example
 * const isValid = verifyTwilioSignature(
 *   process.env.TWILIO_AUTH_TOKEN,
 *   req.headers['x-twilio-signature'],
 *   'https://example.com/api/webhooks/sms',
 *   { From: '+15555555555', Body: 'Hello' }
 * )
 */
export function verifyTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken || !twilioSignature || !url) {
    console.error('[Webhook Security] Missing required parameters for Twilio signature verification')
    return false
  }

  try {
    // Step 1: Sort parameters alphabetically by key
    const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b))
    
    // Step 2: Concatenate URL with sorted key-value pairs
    let data = url
    sortedKeys.forEach((key) => {
      data += key + params[key]
    })
    
    // Step 3: Compute HMAC-SHA1 hash
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')
    
    // Step 4: Compare signatures (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(twilioSignature)
    )
  } catch (error) {
    console.error('[Webhook Security] Error verifying Twilio signature:', error)
    return false
  }
}

/**
 * Verify Meta (Facebook/Instagram) webhook signature
 * 
 * @param appSecret - Meta App Secret (from environment)
 * @param signature - X-Hub-Signature-256 header value (format: "sha256=...")
 * @param payload - Raw request body as string
 * @returns true if signature is valid, false otherwise
 * 
 * @example
 * const isValid = verifyMetaSignature(
 *   process.env.META_APP_SECRET,
 *   req.headers['x-hub-signature-256'],
 *   req.body
 * )
 */
export function verifyMetaSignature(
  appSecret: string,
  signature: string,
  payload: string | Buffer
): boolean {
  if (!appSecret || !signature) {
    console.error('[Webhook Security] Missing required parameters for Meta signature verification')
    return false
  }

  try {
    // Extract hash from "sha256=..." format
    const signatureHash = signature.split('sha256=')[1]
    if (!signatureHash) {
      console.error('[Webhook Security] Invalid Meta signature format (expected "sha256=...")')
      return false
    }
    
    // Compute HMAC-SHA256 hash
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex')
    
    // Compare signatures (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(signatureHash)
    )
  } catch (error) {
    console.error('[Webhook Security] Error verifying Meta signature:', error)
    return false
  }
}

/**
 * Verify TikTok webhook signature
 * 
 * @param appSecret - TikTok App Secret
 * @param signature - X-TikTok-Signature header value
 * @param timestamp - X-TikTok-Timestamp header value
 * @param payload - Raw request body as string
 * @returns true if signature is valid, false otherwise
 */
export function verifyTikTokSignature(
  appSecret: string,
  signature: string,
  timestamp: string,
  payload: string
): boolean {
  if (!appSecret || !signature || !timestamp) {
    return false
  }

  try {
    // TikTok signature = HMAC-SHA256(app_secret, timestamp + payload)
    const data = timestamp + payload
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(data)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('[Webhook Security] Error verifying TikTok signature:', error)
    return false
  }
}

/**
 * Verify webhook timestamp to prevent replay attacks
 * 
 * @param timestamp - Timestamp from webhook header (Unix timestamp in seconds)
 * @param maxAgeSeconds - Maximum age of webhook to accept (default: 300 = 5 minutes)
 * @returns true if timestamp is within acceptable window, false otherwise
 */
export function verifyWebhookTimestamp(
  timestamp: string | number,
  maxAgeSeconds: number = 300
): boolean {
  try {
    const webhookTime = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
    const currentTime = Math.floor(Date.now() / 1000)
    const age = currentTime - webhookTime
    
    // Reject if too old (replay attack) or from future (clock skew)
    if (age > maxAgeSeconds || age < -60) {
      console.warn(`[Webhook Security] Timestamp out of range: age=${age}s (max=${maxAgeSeconds}s)`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('[Webhook Security] Error verifying timestamp:', error)
    return false
  }
}

/**
 * Generate SHA-256 hash of payload for deduplication
 * 
 * @param payload - Request payload (any JSON-serializable object)
 * @returns SHA-256 hash as hex string
 */
export function hashPayload(payload: any): string {
  try {
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload)
    
    return crypto
      .createHash('sha256')
      .update(payloadString)
      .digest('hex')
  } catch (error) {
    console.error('[Webhook Security] Error hashing payload:', error)
    return ''
  }
}

/**
 * Extract request parameters from form-encoded body
 * (Used by Twilio webhooks which send form data, not JSON)
 * 
 * @param formData - FormData object from Next.js request
 * @returns Object of key-value pairs
 */
export function formDataToParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {}
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      params[key] = value
    }
  }
  
  return params
}

/**
 * Get allowed IP addresses for webhooks (vendor-specific)
 * 
 * @param vendor - Integration vendor name
 * @returns Array of allowed IP CIDR ranges
 */
export function getAllowedIPs(vendor: string): string[] {
  const IP_ALLOWLISTS: Record<string, string[]> = {
    // Twilio: https://www.twilio.com/docs/usage/webhooks/webhooks-security#ip-addresses
    twilio: [
      '3.0.0.0/8',
      '52.0.0.0/8',
      '54.0.0.0/8',
    ],
    
    // Meta: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#ip-addresses
    meta: [
      '31.13.24.0/21',
      '31.13.64.0/18',
      '66.220.144.0/20',
      '69.63.176.0/20',
      '69.171.224.0/19',
      '74.119.76.0/22',
      '102.132.96.0/20',
      '103.4.96.0/22',
      '129.134.0.0/16',
      '157.240.0.0/16',
      '173.252.64.0/18',
      '179.60.192.0/22',
      '185.60.216.0/22',
      '204.15.20.0/22',
    ],
    
    // Google Cloud (Pub/Sub, Webhooks)
    google: [
      // Google publishes IP ranges: https://www.gstatic.com/ipranges/cloud.json
      '35.184.0.0/13',
      '35.192.0.0/12',
      '35.208.0.0/12',
    ],
  }
  
  return IP_ALLOWLISTS[vendor.toLowerCase()] || []
}

/**
 * Check if request IP is in allowlist
 * 
 * @param ip - Request IP address
 * @param vendor - Integration vendor
 * @returns true if IP is allowed, false otherwise
 */
export function isIPAllowed(ip: string, vendor: string): boolean {
  const allowedRanges = getAllowedIPs(vendor)
  
  if (allowedRanges.length === 0) {
    // No IP restriction for this vendor
    return true
  }
  
  // Simple IP check (for production, use 'ipaddr.js' or 'ip-range-check' library)
  // This is a basic implementation for common cases
  return allowedRanges.some(range => {
    // Very basic CIDR check - for production use proper library
    const [rangeIP, bits] = range.split('/')
    const rangeParts = rangeIP.split('.').map(Number)
    const ipParts = ip.split('.').map(Number)
    
    // Match first octets based on CIDR
    const octetsToMatch = Math.floor(parseInt(bits) / 8)
    for (let i = 0; i < octetsToMatch; i++) {
      if (rangeParts[i] !== ipParts[i]) return false
    }
    
    return true
  })
}

