/**
 * Phase 2a.3 — IP-based rate limiting helper for the public booking-widget
 * APIs. Thin wrapper over the shared sliding-window rate-limiter so every
 * widget endpoint applies the same policy: 30 req / IP / minute, scoped per
 * endpoint key (so config and sessions don't share a budget).
 */

import { checkRateLimit, getTimeUntilReset, type RateLimitResult } from '@/lib/rate-limiter'

interface ApplyRateLimitOptions {
  /** Endpoint identifier (e.g. "widget-config", "widget-session-start"). */
  key: string
  /** Max requests in the window. Defaults to 30. */
  limit?: number
  /** Window length in seconds. Defaults to 60. */
  windowSeconds?: number
}

interface ApplyRateLimitResult extends RateLimitResult {
  retryAfterSeconds: number
}

/**
 * Extract the originating client IP from a Request. Falls back to a generic
 * sentinel when the headers aren't present (local dev, unit tests).
 */
export function ipFromRequest(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'anonymous'
}

export async function applyWidgetRateLimit(
  req: Request,
  opts: ApplyRateLimitOptions
): Promise<ApplyRateLimitResult> {
  const ip = ipFromRequest(req)
  const limit = opts.limit ?? 30
  const windowSeconds = opts.windowSeconds ?? 60
  const result = await checkRateLimit({
    identifier: `${opts.key}:${ip}`,
    maxRequests: limit,
    windowMs: windowSeconds * 1000,
  })
  return {
    ...result,
    retryAfterSeconds: getTimeUntilReset(result.resetTime),
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
} as const

export function widgetCorsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS }
}

export function widgetPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: widgetCorsHeaders() })
}
