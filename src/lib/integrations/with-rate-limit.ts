/**
 * Rate Limit Middleware for Integration API Routes
 * 
 * Wraps API route handlers with automatic rate limiting
 * 
 * Usage:
 * ```typescript
 * export const POST = withRateLimit('twilio_sms', async (request) => {
 *   // Your handler logic
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { checkIntegrationRateLimit } from './rate-limiter-enhanced'

export type IntegrationAPIHandler = (request: NextRequest) => Promise<NextResponse>

/**
 * Wrap an API route with rate limiting
 * 
 * @param integrationType - Type of integration (e.g., 'twilio_sms', 'meta_graph_api')
 * @param handler - Your API route handler
 * @returns Rate-limited handler
 */
export function withRateLimit(
  integrationType: string,
  handler: IntegrationAPIHandler
): IntegrationAPIHandler {
  return async (request: NextRequest) => {
    const supabase = createServiceClient()
    
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      // Check rate limit
      const rateLimitResult = await checkIntegrationRateLimit(
        appUser.tenant_id,
        integrationType
      )
      
      if (!rateLimitResult.allowed) {
        console.warn(
          `[Rate Limit] Blocked request for ${integrationType}: ` +
          `${rateLimitResult.remaining}/${rateLimitResult.limit} remaining`
        )
        
        // Log rate limit hit
        await supabase.from('integration_logs').insert({
          tenant_id: appUser.tenant_id,
          integration_type: integrationType,
          operation: 'rate_limit_check',
          direction: 'outbound',
          status: 'error',
          error_code: 'rate_limit_exceeded',
          error_message: `Rate limit exceeded: ${rateLimitResult.limit} requests per window`,
        })
        
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You have exceeded the rate limit for ${integrationType}`,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetTime: new Date(rateLimitResult.resetTime).toISOString(),
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            },
          }
        )
      }
      
      // Rate limit OK - proceed with handler
      return await handler(request)
    } catch (error) {
      console.error(`[Rate Limit] Error in middleware:`, error)
      
      // On error, allow request (fail open)
      return await handler(request)
    }
  }
}

/**
 * Wrap an API route with rate limiting + idempotency
 * 
 * @param integrationType - Type of integration
 * @param handler - Your API route handler
 * @returns Rate-limited + idempotent handler
 */
export function withRateLimitAndIdempotency(
  integrationType: string,
  handler: IntegrationAPIHandler
): IntegrationAPIHandler {
  return async (request: NextRequest) => {
    // First check rate limit
    const rateLimitedHandler = withRateLimit(integrationType, handler)
    
    // Then check idempotency (if Idempotency-Key header provided)
    const idempotencyKey = request.headers.get('idempotency-key')
    
    if (idempotencyKey) {
      const supabase = createServiceClient()
      
      // Check if we've seen this idempotency key before
      const { data: existingRequest } = await supabase
        .from('integration_logs')
        .select('response_payload, created_at')
        .eq('idempotency_key', idempotencyKey)
        .eq('integration_type', integrationType)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (existingRequest) {
        console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`)
        
        return NextResponse.json({
          ...existingRequest.response_payload,
          idempotent: true,
          cached_at: existingRequest.created_at,
        })
      }
    }
    
    // Proceed with rate-limited handler
    return await rateLimitedHandler(request)
  }
}

