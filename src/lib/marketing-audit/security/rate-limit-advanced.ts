/**
 * Advanced Rate Limiting with Multiple Strategies
 * Token bucket, sliding window, and leaky bucket algorithms
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  strategy?: 'token-bucket' | 'sliding-window' | 'fixed-window';
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Fixed window rate limiter
 */
export async function fixedWindowLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:fixed:${key}:${Math.floor(now / config.windowMs)}`;

  const [count] = await redis
    .multi()
    .incr(windowKey)
    .expire(windowKey, Math.ceil(config.windowMs / 1000))
    .exec();

  const requests = (count?.[1] as number) || 0;
  const allowed = requests <= config.maxRequests;

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - requests),
    resetAt: Math.ceil(now / config.windowMs) * config.windowMs + config.windowMs,
    retryAfter: allowed ? undefined : config.windowMs - (now % config.windowMs),
  };
}

/**
 * Sliding window rate limiter (more accurate)
 */
export async function slidingWindowLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const windowKey = `ratelimit:sliding:${key}`;

  // Remove old entries and add current request
  const [, count] = await redis
    .multi()
    .zremrangebyscore(windowKey, 0, windowStart)
    .zadd(windowKey, now, `${now}-${Math.random()}`)
    .zcard(windowKey)
    .expire(windowKey, Math.ceil(config.windowMs / 1000))
    .exec();

  const requests = (count?.[1] as number) || 0;
  const allowed = requests <= config.maxRequests;

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - requests),
    resetAt: now + config.windowMs,
    retryAfter: allowed ? undefined : config.windowMs,
  };
}

/**
 * Token bucket rate limiter (allows bursts)
 */
export async function tokenBucketLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucketKey = `ratelimit:bucket:${key}`;
  const refillRate = config.maxRequests / config.windowMs; // tokens per ms

  // Get current state
  const state = await redis.get(bucketKey);
  let tokens = config.maxRequests;
  let lastRefill = now;

  if (state) {
    const [storedTokens, storedTime] = state.split(':').map(Number);
    const elapsed = now - storedTime;
    tokens = Math.min(
      config.maxRequests,
      storedTokens + elapsed * refillRate
    );
    lastRefill = storedTime;
  }

  const allowed = tokens >= 1;
  if (allowed) {
    tokens -= 1;
  }

  // Save state
  await redis.setex(
    bucketKey,
    Math.ceil(config.windowMs / 1000),
    `${tokens}:${now}`
  );

  return {
    allowed,
    remaining: Math.floor(tokens),
    resetAt: now + (config.maxRequests - tokens) / refillRate,
    retryAfter: allowed ? undefined : (1 - tokens) / refillRate,
  };
}

/**
 * Main rate limit function with strategy selection
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const strategy = config.strategy || 'sliding-window';

  switch (strategy) {
    case 'token-bucket':
      return tokenBucketLimit(key, config);
    case 'fixed-window':
      return fixedWindowLimit(key, config);
    case 'sliding-window':
    default:
      return slidingWindowLimit(key, config);
  }
}

/**
 * IP-based rate limiting
 */
export async function rateLimitByIP(
  ip: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimit(`ip:${ip}`, config);
}

/**
 * User-based rate limiting
 */
export async function rateLimitByUser(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}`, config);
}

/**
 * Endpoint-based rate limiting
 */
export async function rateLimitByEndpoint(
  endpoint: string,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimit(`endpoint:${endpoint}:${identifier}`, config);
}

/**
 * Combined rate limiting (check multiple limits)
 */
export async function rateLimitCombined(
  limits: Array<{ key: string; config: RateLimitConfig }>
): Promise<RateLimitResult> {
  const results = await Promise.all(
    limits.map(({ key, config }) => rateLimit(key, config))
  );

  // If any limit is exceeded, return that result
  const blocked = results.find(r => !r.allowed);
  if (blocked) return blocked;

  // Return most restrictive remaining count
  const minRemaining = Math.min(...results.map(r => r.remaining));
  const earliestReset = Math.min(...results.map(r => r.resetAt));

  return {
    allowed: true,
    remaining: minRemaining,
    resetAt: earliestReset,
  };
}

/**
 * Clear rate limit for a key
 */
export async function clearRateLimit(key: string): Promise<void> {
  const patterns = [
    `ratelimit:fixed:${key}:*`,
    `ratelimit:sliding:${key}`,
    `ratelimit:bucket:${key}`,
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

/**
 * Get rate limit status without consuming a token
 */
export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<Omit<RateLimitResult, 'allowed'>> {
  const now = Date.now();
  const windowKey = `ratelimit:sliding:${key}`;
  const windowStart = now - config.windowMs;

  const count = await redis.zcount(windowKey, windowStart, now);
  const remaining = Math.max(0, config.maxRequests - count);

  return {
    remaining,
    resetAt: now + config.windowMs,
  };
}

/**
 * Exponential backoff for repeated violations
 */
export async function exponentialBackoff(
  key: string,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 300000 // 5 minutes
): Promise<number> {
  const backoffKey = `backoff:${key}`;
  const violations = await redis.incr(backoffKey);
  await redis.expire(backoffKey, 3600); // Reset after 1 hour

  const delay = Math.min(baseDelayMs * Math.pow(2, violations - 1), maxDelayMs);
  return delay;
}

/**
 * Reset backoff counter
 */
export async function resetBackoff(key: string): Promise<void> {
  await redis.del(`backoff:${key}`);
}

