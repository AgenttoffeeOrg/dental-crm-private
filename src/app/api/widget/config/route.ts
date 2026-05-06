/**
 * Phase 2a.3 — Public widget config endpoint.
 *
 *   GET /api/widget/config?slug=<slug>
 *
 * Unauthenticated. Cached for 60s at the edge. CORS open (the widget runs on
 * arbitrary practice websites). Rate-limited per IP at 30 req/min.
 */

import { NextResponse } from 'next/server'
import { isValidSlug } from '@/lib/booking-widget/types'
import { loadWidgetConfigBySlug } from '@/lib/booking-widget/load-config'
import {
  applyWidgetRateLimit,
  widgetCorsHeaders,
  widgetPreflightResponse,
} from '@/lib/booking-widget/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const cors = widgetCorsHeaders()

  const rl = await applyWidgetRateLimit(req, { key: 'widget-config' })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      {
        status: 429,
        headers: {
          ...cors,
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    )
  }

  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json(
      { error: 'slug_required' },
      { status: 400, headers: cors }
    )
  }
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'invalid_slug_format' },
      { status: 400, headers: cors }
    )
  }

  const result = await loadWidgetConfigBySlug(slug)

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.status, headers: cors }
    )
  }

  return NextResponse.json(result.config, {
    status: 200,
    headers: {
      ...cors,
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  })
}

export async function OPTIONS(): Promise<Response> {
  return widgetPreflightResponse()
}
