/**
 * Security Utilities
 * CSRF protection, rate limiting, input sanitization
 */

import { NextRequest } from 'next/server'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Rate Limiter (in-memory)
 * TODO: Replace with Redis in production
 */
class RateLimiter {
  private requests = new Map<string, number[]>()

  check(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Filter out old requests outside the window
    const recentRequests = requests.filter(time => now - time < windowMs)
    
    if (recentRequests.length >= maxRequests) {
      return false // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)
    
    return true
  }

  clear(identifier: string): void {
    this.requests.delete(identifier)
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Rate limit middleware
 */
export function checkRateLimit(
  request: NextRequest,
  maxRequests = 100,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number } {
  const identifier = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

  const allowed = rateLimiter.check(identifier, maxRequests, windowMs)
  
  return {
    allowed,
    remaining: maxRequests - (rateLimiter['requests'].get(identifier)?.length || 0),
  }
}

/**
 * Sanitize HTML input
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

/**
 * Sanitize user input (remove XSS)
 */
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Validate CSRF token
 * TODO: Implement actual CSRF token validation
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const token = request.headers.get('x-csrf-token')
  const cookie = request.cookies.get('csrf-token')?.value
  
  // For now, just check if both exist
  // In production, validate cryptographically
  return !!(token && cookie && token === cookie)
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const randomValues = new Uint8Array(length)
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues)
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto')
    for (let i = 0; i < length; i++) {
      randomValues[i] = nodeCrypto.randomInt(0, 256)
    }
  }
  
  for (let i = 0; i < length; i++) {
    token += charset[randomValues[i] % charset.length]
  }
  
  return token
}

/**
 * Hash sensitive data (one-way)
 */
export async function hashData(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } else {
    // Node.js fallback
    const nodeCrypto = require('crypto')
    return nodeCrypto.createHash('sha256').update(data).digest('hex')
  }
}

/**
 * Redact sensitive data from logs
 */
export function redactPII(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const redacted = { ...obj }
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'ssn',
    'creditCard',
    'credit_card',
  ]

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase()
    
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]'
    } else if (lowerKey.includes('email')) {
      // Partially redact email
      const email = redacted[key]
      if (typeof email === 'string' && email.includes('@')) {
        const [local, domain] = email.split('@')
        redacted[key] = `${local.charAt(0)}***@${domain}`
      }
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPII(redacted[key])
    }
  }

  return redacted
}

/**
 * Check user permissions
 */
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const supabase = createClient()

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role, permissions')
    .eq('id', userId)
    .single()

  if (!appUser) {
    return false
  }

  // Super admin has all permissions
  if (appUser.role === 'super_admin' || appUser.role === 'owner') {
    return true
  }

  // Check role-based permissions
  const rolePermissions: Record<string, string[]> = {
    admin: ['read', 'write', 'delete', 'manage_team'],
    manager: ['read', 'write', 'delete'],
    user: ['read', 'write'],
    viewer: ['read'],
  }

  const userPermissions = rolePermissions[appUser.role] || []
  return userPermissions.includes(permission)
}

/**
 * Audit log helper
 */
export async function auditLog(data: {
  userId: string
  tenantId: string
  action: string
  resource: string
  resourceId?: string
  oldValue?: any
  newValue?: any
  metadata?: Record<string, any>
}): Promise<void> {
  const supabase = createClient()

  try {
    await supabase.from('audit_logs').insert([{
      user_id: data.userId,
      tenant_id: data.tenantId,
      action: data.action,
      resource: data.resource,
      resource_id: data.resourceId,
      old_value: data.oldValue,
      new_value: data.newValue,
      metadata: data.metadata,
      ip_address: null, // Would be populated from request
      user_agent: null, // Would be populated from request
    }])
  } catch (error) {
    logger.error({ error, ...data }, 'Failed to write audit log')
  }
}

