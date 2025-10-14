/**
 * Idempotency Helper
 * 
 * Ensures API operations can be safely retried without creating duplicates.
 * Uses Redis or in-memory cache to track processed requests.
 * 
 * @module lib/idempotency
 */

/**
 * In-memory cache for idempotency keys
 * TODO: Replace with Redis in production for distributed systems
 */
const idempotencyCache = new Map<string, {
  response: any
  timestamp: number
  ttl: number
}>()

/**
 * Default TTL for idempotency keys (24 hours)
 */
const DEFAULT_TTL = 24 * 60 * 60 * 1000

/**
 * Generate an idempotency key from request details
 * 
 * @param userId - User ID making the request
 * @param operation - Operation type (e.g., 'create_contact')
 * @param data - Request data (used for generating hash)
 * @returns Idempotency key
 */
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  data: any
): string {
  // Simple hash function - in production, use crypto.createHash
  const dataString = JSON.stringify(data)
  const hash = Buffer.from(dataString).toString('base64').slice(0, 16)
  return `${userId}:${operation}:${hash}`
}

/**
 * Check if an idempotency key exists and return cached response
 * 
 * @param key - Idempotency key
 * @returns Cached response if exists and not expired, null otherwise
 */
export function checkIdempotency(key: string): any | null {
  const cached = idempotencyCache.get(key)
  
  if (!cached) {
    return null
  }
  
  // Check if expired
  const now = Date.now()
  if (now - cached.timestamp > cached.ttl) {
    idempotencyCache.delete(key)
    return null
  }
  
  return cached.response
}

/**
 * Store idempotency key with response
 * 
 * @param key - Idempotency key
 * @param response - Response to cache
 * @param ttl - Time to live in milliseconds (default: 24 hours)
 */
export function storeIdempotency(
  key: string,
  response: any,
  ttl: number = DEFAULT_TTL
): void {
  idempotencyCache.set(key, {
    response,
    timestamp: Date.now(),
    ttl,
  })
}

/**
 * Clear expired idempotency keys
 * Should be called periodically (e.g., every hour)
 */
export function clearExpiredIdempotencyKeys(): number {
  const now = Date.now()
  let cleared = 0
  
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      idempotencyCache.delete(key)
      cleared++
    }
  }
  
  return cleared
}

/**
 * Get idempotency statistics
 * Useful for monitoring and debugging
 */
export function getIdempotencyStats() {
  return {
    totalKeys: idempotencyCache.size,
    keys: Array.from(idempotencyCache.keys()),
  }
}

/**
 * Clear all idempotency keys
 * Use with caution - mainly for testing
 */
export function clearAllIdempotencyKeys(): void {
  idempotencyCache.clear()
}

/**
 * Idempotent wrapper for async functions
 * 
 * Usage:
 * ```ts
 * const result = await withIdempotency(
 *   'user-123',
 *   'create_contact',
 *   contactData,
 *   async () => {
 *     return await createContact(contactData)
 *   }
 * )
 * ```
 * 
 * @param userId - User ID
 * @param operation - Operation type
 * @param data - Request data
 * @param fn - Function to execute
 * @param ttl - Cache TTL (optional)
 * @returns Result of function or cached result
 */
export async function withIdempotency<T>(
  userId: string,
  operation: string,
  data: any,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Generate idempotency key
  const key = generateIdempotencyKey(userId, operation, data)
  
  // Check if already processed
  const cached = checkIdempotency(key)
  if (cached !== null) {
    return cached as T
  }
  
  // Execute function
  const result = await fn()
  
  // Store result
  storeIdempotency(key, result, ttl)
  
  return result
}

/**
 * Extract idempotency key from request headers
 * 
 * @param headers - Request headers
 * @returns Idempotency key or null
 */
export function extractIdempotencyKey(headers: Headers): string | null {
  return headers.get('x-idempotency-key') || 
         headers.get('idempotency-key') ||
         null
}

/**
 * Validate idempotency key format
 * 
 * @param key - Idempotency key to validate
 * @returns True if valid format
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Must be non-empty string, max 255 chars
  if (!key || typeof key !== 'string' || key.length > 255) {
    return false
  }
  
  // Should contain only safe characters
  const validPattern = /^[a-zA-Z0-9_\-:]+$/
  return validPattern.test(key)
}

