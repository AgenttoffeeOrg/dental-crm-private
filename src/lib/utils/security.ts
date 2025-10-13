// Security utilities

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
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
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

