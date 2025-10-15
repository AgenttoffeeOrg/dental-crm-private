/**
 * Security Middleware for Integration Webhooks
 * 
 * Additional security layers beyond signature verification:
 * - IP allowlisting (vendor-specific)
 * - Replay attack prevention (timestamp validation)
 * - HTTPS-only enforcement
 * - Request size limits
 * 
 * Usage:
 * ```typescript
 * export const POST = withSecurityChecks('twilio', async (request) => {
 *   // Your handler logic
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { isIPAllowed, verifyWebhookTimestamp } from './webhook-security'

export type SecurityCheckHandler = (request: NextRequest) => Promise<NextResponse>

/**
 * Wrap webhook handler with IP allowlisting
 * 
 * @param vendor - Vendor name ('twilio', 'meta', 'google')
 * @param handler - Webhook handler
 * @returns IP-protected handler
 */
export function withIPAllowlist(
  vendor: string,
  handler: SecurityCheckHandler
): SecurityCheckHandler {
  return async (request: NextRequest) => {
    // Get request IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('x-real-ip') ||
               request.headers.get('cf-connecting-ip') || // Cloudflare
               'unknown'
    
    if (ip === 'unknown') {
      console.warn(`[IP Allowlist] Unable to determine IP address for ${vendor} webhook`)
      // In production, you might want to reject this
      // For now, allow but log warning
    } else if (!isIPAllowed(ip, vendor)) {
      console.error(`[IP Allowlist] Rejected request from unauthorized IP: ${ip} (vendor: ${vendor})`)
      
      return NextResponse.json(
        { error: 'Unauthorized IP address' },
        { status: 403 }
      )
    }
    
    // IP is allowed, proceed
    return await handler(request)
  }
}

/**
 * Wrap webhook handler with replay attack prevention
 * 
 * @param maxAgeSeconds - Maximum age of webhook to accept (default: 300 = 5 minutes)
 * @param handler - Webhook handler
 * @returns Replay-protected handler
 */
export function withReplayPrevention(
  maxAgeSeconds: number = 300,
  handler: SecurityCheckHandler
): SecurityCheckHandler {
  return async (request: NextRequest) => {
    // Check timestamp header (vendor-specific)
    const twilioTimestamp = request.headers.get('x-twilio-timestamp')
    const metaTimestamp = request.headers.get('x-hub-signature-timestamp')
    const tiktokTimestamp = request.headers.get('x-tiktok-timestamp')
    
    const timestamp = twilioTimestamp || metaTimestamp || tiktokTimestamp
    
    if (timestamp && !verifyWebhookTimestamp(timestamp, maxAgeSeconds)) {
      console.error(`[Replay Prevention] Rejected old/future webhook: timestamp=${timestamp}`)
      
      return NextResponse.json(
        { error: 'Webhook timestamp out of acceptable range' },
        { status: 400 }
      )
    }
    
    // Timestamp is valid or not provided, proceed
    return await handler(request)
  }
}

/**
 * Wrap handler with HTTPS-only enforcement
 * 
 * @param handler - API handler
 * @returns HTTPS-enforced handler
 */
export function withHTTPSOnly(handler: SecurityCheckHandler): SecurityCheckHandler {
  return async (request: NextRequest) => {
    const url = new URL(request.url)
    
    // Check protocol
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      console.error(`[HTTPS Only] Rejected non-HTTPS request: ${url.protocol}`)
      
      return NextResponse.json(
        { error: 'HTTPS required' },
        { 
          status: 403,
          headers: {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          },
        }
      )
    }
    
    // HTTPS or development mode, proceed
    const response = await handler(request)
    
    // Add security headers to response
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  }
}

/**
 * Wrap handler with request size limit
 * 
 * @param maxSizeBytes - Maximum request body size (default: 1MB)
 * @param handler - API handler
 * @returns Size-limited handler
 */
export function withSizeLimit(
  maxSizeBytes: number = 1024 * 1024, // 1MB
  handler: SecurityCheckHandler
): SecurityCheckHandler {
  return async (request: NextRequest) => {
    const contentLength = request.headers.get('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      console.error(`[Size Limit] Rejected oversized request: ${contentLength} bytes (max: ${maxSizeBytes})`)
      
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      )
    }
    
    // Size is acceptable, proceed
    return await handler(request)
  }
}

/**
 * Combine all security checks
 * 
 * @param vendor - Vendor name for IP allowlisting
 * @param handler - Webhook handler
 * @returns Fully secured handler
 */
export function withSecurityChecks(
  vendor: string,
  handler: SecurityCheckHandler
): SecurityCheckHandler {
  // Compose all security middleware
  return withHTTPSOnly(
    withSizeLimit(
      1024 * 1024, // 1MB
      withReplayPrevention(
        300, // 5 minutes
        withIPAllowlist(
          vendor,
          handler
        )
      )
    )
  )
}

