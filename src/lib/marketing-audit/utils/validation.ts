/**
 * Validation Utilities
 * 
 * Input validation and sanitization for security and data integrity.
 */

/**
 * Validate domain/URL format
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  
  // Remove protocol and trailing slashes
  const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Basic domain regex
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
  
  return domainRegex.test(cleaned);
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate score (0-100)
 */
export function isValidScore(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 100 && !isNaN(score);
}

/**
 * Validate audit status
 */
export function isValidAuditStatus(status: string): boolean {
  const validStatuses = ['pending', 'running', 'completed', 'failed'];
  return validStatuses.includes(status);
}

/**
 * Validate category name
 */
export function isValidCategory(category: string): boolean {
  const validCategories = [
    'technical_seo',
    'local_presence',
    'content_authority',
    'analytics_hygiene',
    'conversion_ux',
  ];
  return validCategories.includes(category);
}

/**
 * Validate impact level
 */
export function isValidImpact(impact: string): boolean {
  return ['low', 'medium', 'high'].includes(impact);
}

/**
 * Validate effort level
 */
export function isValidEffort(effort: string): boolean {
  return ['low', 'medium', 'high'].includes(effort);
}

/**
 * Validate confidence level
 */
export function isValidConfidence(confidence: string): boolean {
  return ['low', 'medium', 'high'].includes(confidence);
}

/**
 * Sanitize string for SQL/XSS prevention
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input
  
  // Remove < and > using split/join
  sanitized = sanitized.split('<').join('').split('>').join('')
  
  // Remove dangerous URL protocols using split/join
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:']
  for (const scheme of dangerousSchemes) {
    sanitized = sanitized.split(new RegExp(scheme, 'gi')).join('')
  }
  
  // Remove event handlers using split/join
  const eventHandlerPattern = /\bon\w+=/gi
  sanitized = sanitized.split(eventHandlerPattern).join('')
  
  return sanitized.trim().slice(0, 1000); // Limit length
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Validate and clamp numeric value
 */
export function clampNumber(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate date range
 */
export function isValidDateRange(start: Date, end: Date): boolean {
  if (!(start instanceof Date) || !(end instanceof Date)) return false;
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return start <= end;
}

/**
 * Validate audit frequency
 */
export function isValidFrequency(frequency: string): boolean {
  return ['daily', 'weekly', 'monthly'].includes(frequency);
}

/**
 * Validate day of week (0-6)
 */
export function isValidDayOfWeek(day: number): boolean {
  return typeof day === 'number' && day >= 0 && day <= 6;
}

/**
 * Validate day of month (1-31)
 */
export function isValidDayOfMonth(day: number): boolean {
  return typeof day === 'number' && day >= 1 && day <= 31;
}

/**
 * Validate hour (0-23)
 */
export function isValidHour(hour: number): boolean {
  return typeof hour === 'number' && hour >= 0 && hour <= 23;
}

/**
 * Validate pagination params
 */
export function validatePagination(limit?: number, offset?: number): {
  limit: number;
  offset: number;
} {
  return {
    limit: clampNumber(limit || 10, 1, 100),
    offset: clampNumber(offset || 0, 0, 10000),
  };
}

/**
 * Validate API key format (basic check)
 */
export function isValidAPIKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  
  // Must be at least 20 characters
  if (key.length < 20) return false;
  
  // Must contain only alphanumeric and common special chars
  const keyRegex = /^[a-zA-Z0-9_\-\.]+$/;
  return keyRegex.test(key);
}

/**
 * Validate share token format
 */
export function isValidShareToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Must be 64 hex characters (32 bytes in hex)
  const tokenRegex = /^[0-9a-f]{64}$/i;
  return tokenRegex.test(token);
}

/**
 * Validate and parse JSON safely
 */
export function parseJSONSafely<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate recommendation status
 */
export function isValidRecommendationStatus(status: string): boolean {
  return ['open', 'in_progress', 'completed', 'dismissed'].includes(status);
}

