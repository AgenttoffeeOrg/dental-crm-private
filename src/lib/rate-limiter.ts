/**
 * Simple in-memory rate limiter
 * For production, use Redis or a distributed solution
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  identifier: string // IP address or user ID
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Check if a request is allowed based on rate limits
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { identifier, maxRequests, windowMs } = options
  const now = Date.now()
  
  const entry = rateLimitStore.get(identifier)
  
  // If no entry exists, create one
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    }
  }
  
  // If window has expired, reset
  if (now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    }
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }
  
  // Increment count
  entry.count++
  
  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(identifier: string, maxRequests: number): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)
  
  if (!entry || now > entry.resetTime) {
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests,
      resetTime: now,
    }
  }
  
  return {
    allowed: entry.count < maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  }
}

/**
 * Reset rate limit for a specific identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Get remaining time until reset in seconds
 */
export function getTimeUntilReset(resetTime: number): number {
  return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000))
}

