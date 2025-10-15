/**
 * Marketing Audit Module - Rate Limiter
 * 
 * Redis-backed rate limiter to prevent exceeding API quotas.
 * Each API has different limits which are enforced here.
 */

import { RateLimitError } from './errors';

// In-memory fallback if Redis is not available
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export class RateLimiter {
  private limits = {
    PSIConnector: { requests: 25000, per: 'day' as const },
    GSCConnector: { requests: 1200, per: 'minute' as const },
    GA4Connector: { requests: 25000, per: 'day' as const },
    PlacesConnector: { requests: 1000, per: 'day' as const },
    MobileFriendlyConnector: { requests: 10000, per: 'day' as const },
    BrightLocalConnector: { requests: 100, per: 'hour' as const },
    SemrushConnector: { requests: 10000, per: 'day' as const },
  };
  
  async throttle(connectorName: string): Promise<void> {
    const limit = this.limits[connectorName as keyof typeof this.limits];
    if (!limit) {
      console.warn(`[RateLimiter] No limit configured for ${connectorName}`);
      return;
    }
    
    const key = `rate_limit:${connectorName}:${this.getPeriod(limit.per)}`;
    
    // Use in-memory store (for MVP, replace with Redis in production)
    const now = Date.now();
    const stored = inMemoryStore.get(key);
    
    if (stored && stored.resetAt > now) {
      // Still within period
      if (stored.count >= limit.requests) {
        throw new RateLimitError(
          `Rate limit exceeded for ${connectorName}. Limit: ${limit.requests} per ${limit.per}`,
          new Date(stored.resetAt),
          connectorName
        );
      }
      stored.count++;
    } else {
      // New period
      inMemoryStore.set(key, {
        count: 1,
        resetAt: now + this.getTTL(limit.per),
      });
    }
    
    // Clean up old entries periodically
    this.cleanup();
  }
  
  private getPeriod(per: 'minute' | 'hour' | 'day'): string {
    const now = new Date();
    if (per === 'minute') return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    if (per === 'hour') return now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (per === 'day') return now.toISOString().slice(0, 10); // YYYY-MM-DD
    return now.toISOString();
  }
  
  private getTTL(per: 'minute' | 'hour' | 'day'): number {
    if (per === 'minute') return 60 * 1000; // 1 minute in ms
    if (per === 'hour') return 60 * 60 * 1000; // 1 hour in ms
    if (per === 'day') return 24 * 60 * 60 * 1000; // 1 day in ms
    return 60 * 60 * 1000;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of inMemoryStore.entries()) {
      if (value.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }
  
  /**
   * Get current usage for a connector
   */
  getUsage(connectorName: string): { current: number; limit: number; resetAt?: Date } {
    const limit = this.limits[connectorName as keyof typeof this.limits];
    if (!limit) return { current: 0, limit: 0 };
    
    const key = `rate_limit:${connectorName}:${this.getPeriod(limit.per)}`;
    const stored = inMemoryStore.get(key);
    
    return {
      current: stored?.count || 0,
      limit: limit.requests,
      resetAt: stored ? new Date(stored.resetAt) : undefined,
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

