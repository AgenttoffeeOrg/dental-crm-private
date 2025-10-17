// Security utilities

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/(?:javascript|data|vbscript|file|about):/gi, '') // Check all dangerous URL schemes
    .trim()
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone: string): boolean {
  const re = /^[\d\s\-\+\(\)]+$/
  return re.test(phone)
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

export function generateId(): string {
  // Use crypto for secure random IDs
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return `${Date.now()}-${Date.now().toString(36)}`
}

/**
 * Generate a cryptographically secure random integer between 0 (inclusive) and max (exclusive)
 */
export function secureRandomInt(max: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return array[0] % max
  }
  // Fallback to Math.random (less secure but functional)
  return Math.floor(Math.random() * max)
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  check(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(key, validRequests)
    return true
  }
}


