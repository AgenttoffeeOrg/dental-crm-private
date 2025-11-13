/**
 * Production-ready rate limiter with Redis backend
 * Falls back to in-memory storage if Redis is unavailable
 *
 * Features:
 * - Distributed rate limiting (works across multiple instances)
 * - Sliding window algorithm (more accurate than fixed window)
 * - Graceful degradation to in-memory if Redis unavailable
 * - Automatic cleanup of expired entries
 */

import { getRedisClient } from './redis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (in-memory fallback only)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitOptions {
  identifier: string; // IP address or user ID
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit using Redis (with in-memory fallback)
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // Use Redis if available (production mode)
  if (redis) {
    return checkRateLimitRedis(options, redis);
  }

  // Fallback to in-memory (development mode or Redis unavailable)
  return checkRateLimitMemory(options);
}

/**
 * Redis-based rate limiting using sliding window
 */
async function checkRateLimitRedis(
  options: RateLimitOptions,
  redis: ReturnType<typeof getRedisClient>
): Promise<RateLimitResult> {
  const { identifier, maxRequests, windowMs } = options;
  const now = Date.now();
  const windowStart = now - windowMs;
  const key = `ratelimit:${identifier}`;

  try {
    // Use sliding window: remove old entries, add current, count remaining
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const count = (results[2]?.[1] as number) || 0;
    const allowed = count <= maxRequests;
    const resetTime = now + windowMs;

    return {
      allowed,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetTime,
    };
  } catch (error) {
    console.warn('[RateLimiter] Redis error, falling back to memory:', error);
    // Fallback to in-memory on Redis error
    return checkRateLimitMemory(options);
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function checkRateLimitMemory(options: RateLimitOptions): RateLimitResult {
  const { identifier, maxRequests, windowMs } = options;
  const now = Date.now();

  const entry = rateLimitStore.get(identifier);

  // If no entry exists, create one
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // If window has expired, reset
  if (now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  maxRequests: number,
  windowMs: number = 60 * 60 * 1000
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      const key = `ratelimit:${identifier}`;

      const count = await redis.zcount(key, windowStart, now);
      const remaining = Math.max(0, maxRequests - count);

      return {
        allowed: count < maxRequests,
        limit: maxRequests,
        remaining,
        resetTime: now + windowMs,
      };
    } catch (error) {
      console.warn('[RateLimiter] Redis error in getStatus:', error);
    }
  }

  // Fallback to memory
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests,
      resetTime: now + windowMs,
    };
  }

  return {
    allowed: entry.count < maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.del(`ratelimit:${identifier}`);
      return;
    } catch (error) {
      console.warn('[RateLimiter] Redis error in reset:', error);
    }
  }

  // Fallback to memory
  rateLimitStore.delete(identifier);
}

/**
 * Get remaining time until reset in seconds
 */
export function getTimeUntilReset(resetTime: number): number {
  return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
}
