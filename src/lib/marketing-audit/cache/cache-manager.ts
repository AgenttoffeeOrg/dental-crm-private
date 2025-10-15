/**
 * Cache Manager
 * 
 * Intelligent caching layer for API responses and computed data.
 * Performance: Reduce API calls, improve response times.
 */

import { createClient } from '@supabase/supabase-js';

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 3600000; // 1 hour in ms
  
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && Date.now() < memEntry.expiresAt) {
      return memEntry.value as T;
    }
    
    // Memory cache miss or expired
    if (memEntry) {
      this.memoryCache.delete(key);
    }
    
    return null;
  }
  
  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt,
      createdAt: Date.now(),
    };
    
    this.memoryCache.set(key, entry);
    
    // Cleanup old entries if cache is too large
    if (this.memoryCache.size > 1000) {
      this.cleanup();
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
  }
  
  /**
   * Get or compute value
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await compute();
    await this.set(key, value, ttl);
    return value;
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.memoryCache.delete(key));
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    avgAge: number;
  } {
    const now = Date.now();
    let totalAge = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalAge += now - entry.createdAt;
    }
    
    return {
      size: this.memoryCache.size,
      hitRate: 0, // Would need tracking
      avgAge: this.memoryCache.size > 0 ? totalAge / this.memoryCache.size : 0,
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache key generators
 */
export const CacheKeys = {
  auditRun: (auditId: string) => `audit:${auditId}`,
  competitors: (practiceId: string) => `competitors:${practiceId}`,
  metrics: (auditId: string, category: string) => `metrics:${auditId}:${category}`,
  recommendations: (auditId: string) => `recommendations:${auditId}`,
  psiData: (url: string, strategy: string) => `psi:${url}:${strategy}`,
  gscData: (domain: string, date: string) => `gsc:${domain}:${date}`,
  ga4Data: (propertyId: string, date: string) => `ga4:${propertyId}:${date}`,
};

