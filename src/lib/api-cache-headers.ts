/**
 * API Response Cache Headers Utility
 * 
 * Provides consistent cache control headers for API routes to prevent
 * browser caching of dynamic data.
 * 
 * @module lib/api-cache-headers
 */

import { NextResponse } from 'next/server'

/**
 * Cache strategies for different types of API responses
 */
export const CacheStrategy = {
  /**
   * No caching - for dynamic, user-specific data
   * Use for: user data, real-time updates, sensitive information
   */
  NO_CACHE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  },

  /**
   * Short cache - for frequently changing data
   * Use for: lists, search results, aggregations (30 seconds)
   */
  SHORT: {
    'Cache-Control': 'private, max-age=30, must-revalidate',
  },

  /**
   * Medium cache - for semi-static data
   * Use for: dropdown options, static lists (5 minutes)
   */
  MEDIUM: {
    'Cache-Control': 'private, max-age=300, must-revalidate',
  },

  /**
   * Long cache - for static data
   * Use for: configuration, static resources (1 hour)
   */
  LONG: {
    'Cache-Control': 'private, max-age=3600, must-revalidate',
  },

  /**
   * Public cache - for public, static data
   * Use for: public assets, documentation (1 day)
   */
  PUBLIC: {
    'Cache-Control': 'public, max-age=86400, immutable',
  },
} as const

/**
 * Create a NextResponse with no-cache headers
 */
export function createNoCacheResponse<T>(
  data: T,
  options?: {
    status?: number
    additionalHeaders?: Record<string, string>
  }
): NextResponse<T> {
  const headers = {
    ...CacheStrategy.NO_CACHE,
    'Content-Type': 'application/json',
    ...(options?.additionalHeaders || {}),
  }

  return NextResponse.json(data, {
    status: options?.status || 200,
    headers,
  })
}

/**
 * Create a NextResponse with custom cache strategy
 */
export function createCachedResponse<T>(
  data: T,
  strategy: keyof typeof CacheStrategy = 'NO_CACHE',
  options?: {
    status?: number
    additionalHeaders?: Record<string, string>
  }
): NextResponse<T> {
  const headers = {
    ...CacheStrategy[strategy],
    'Content-Type': 'application/json',
    ...(options?.additionalHeaders || {}),
  }

  return NextResponse.json(data, {
    status: options?.status || 200,
    headers,
  })
}

/**
 * Add no-cache headers to an existing NextResponse
 */
export function addNoCacheHeaders(response: NextResponse): NextResponse {
  Object.entries(CacheStrategy.NO_CACHE).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

/**
 * Check if request is from development environment
 */
export function isDevelopmentRequest(request: Request): boolean {
  const host = request.headers.get('host') || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

/**
 * Get appropriate cache strategy based on route pattern
 */
export function getCacheStrategyForRoute(pathname: string): keyof typeof CacheStrategy {
  // Real-time data - no cache
  if (pathname.includes('/api/realtime') || 
      pathname.includes('/api/webhook') ||
      pathname.includes('/api/auth')) {
    return 'NO_CACHE'
  }

  // User-specific data - no cache
  if (pathname.includes('/api/users') || 
      pathname.includes('/api/profile') ||
      pathname.includes('/api/contacts') ||
      pathname.includes('/api/deals')) {
    return 'NO_CACHE'
  }

  // Lists and searches - short cache
  if (pathname.includes('/api/search') || 
      pathname.includes('/api/list')) {
    return 'SHORT'
  }

  // Configuration and static data - medium cache
  if (pathname.includes('/api/config') || 
      pathname.includes('/api/settings') ||
      pathname.includes('/api/options')) {
    return 'MEDIUM'
  }

  // Public data - long cache
  if (pathname.includes('/api/public')) {
    return 'PUBLIC'
  }

  // Default to no cache for safety
  return 'NO_CACHE'
}

/**
 * Wrapper for API route handlers that automatically adds cache headers
 * 
 * @example
 * export const GET = withCacheHeaders(async (request) => {
 *   const data = await fetchData()
 *   return NextResponse.json(data)
 * })
 */
export function withCacheHeaders<T = unknown>(
  handler: (request: Request, ...args: any[]) => Promise<NextResponse<T>>,
  strategy: keyof typeof CacheStrategy = 'NO_CACHE'
) {
  return async (request: Request, ...args: any[]): Promise<NextResponse<T>> => {
    const response = await handler(request, ...args)
    
    // Add cache headers if not already set
    if (!response.headers.has('Cache-Control')) {
      Object.entries(CacheStrategy[strategy]).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
    
    return response
  }
}

