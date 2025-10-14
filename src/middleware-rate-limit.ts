// Rate limiting middleware

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, number[]>()

const RATE_LIMIT = 100 // requests
const WINDOW_MS = 60 * 1000 // 1 minute

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  
  const requests = rateLimit.get(ip) || []
  const validRequests = requests.filter(time => now - time < WINDOW_MS)
  
  if (validRequests.length >= RATE_LIMIT) {
    return new NextResponse('Too many requests', { status: 429 })
  }
  
  validRequests.push(now)
  rateLimit.set(ip, validRequests)
  
  return NextResponse.next()
}


