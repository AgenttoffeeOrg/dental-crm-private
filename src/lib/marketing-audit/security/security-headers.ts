/**
 * Security Headers Configuration
 * Comprehensive security headers for production
 */

export interface SecurityHeaders {
  [key: string]: string;
}

/**
 * Content Security Policy
 */
export function generateCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://accounts.google.com https://www.googleapis.com https://*.google-analytics.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join('; ');
}

/**
 * Get all security headers
 */
export function getSecurityHeaders(): SecurityHeaders {
  return {
    // Content Security Policy
    'Content-Security-Policy': generateCSP(),

    // Strict Transport Security (HSTS)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    // X-Frame-Options (prevent clickjacking)
    'X-Frame-Options': 'DENY',

    // X-Content-Type-Options (prevent MIME sniffing)
    'X-Content-Type-Options': 'nosniff',

    // X-XSS-Protection (legacy, but doesn't hurt)
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()', // Disable FLoC
      'payment=()',
      'usb=()',
    ].join(', '),

    // Cross-Origin policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',

    // Remove server information
    'X-Powered-By': '',
    'Server': '',
  };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(headers: Headers): Headers {
  const securityHeaders = getSecurityHeaders();

  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, value);
    } else {
      headers.delete(key); // Remove headers we want to hide
    }
  });

  return headers;
}

/**
 * Validate origin for CORS
 */
export function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * CORS headers
 */
export function getCORSHeaders(origin?: string): SecurityHeaders {
  if (!origin || !isAllowedOrigin(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Rate limit headers
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): SecurityHeaders {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetAt.toString(),
    'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
  };
}

/**
 * Sanitize request headers (remove sensitive info)
 */
export function sanitizeHeaders(headers: Headers): Headers {
  const sanitized = new Headers(headers);
  
  // Remove potentially sensitive headers
  const sensitiveHeaders = [
    'cookie',
    'authorization',
    'x-api-key',
    'x-auth-token',
  ];

  sensitiveHeaders.forEach(header => {
    sanitized.delete(header);
  });

  return sanitized;
}

/**
 * Add cache headers
 */
export function getCacheHeaders(
  type: 'public' | 'private' | 'no-cache',
  maxAge: number = 0
): SecurityHeaders {
  switch (type) {
    case 'public':
      return {
        'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
        'Expires': new Date(Date.now() + maxAge * 1000).toUTCString(),
      };
    
    case 'private':
      return {
        'Cache-Control': `private, max-age=${maxAge}, must-revalidate`,
      };
    
    case 'no-cache':
    default:
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
  }
}

/**
 * Security audit score
 */
export function auditSecurityHeaders(headers: Headers): {
  score: number;
  missing: string[];
  warnings: string[];
} {
  const requiredHeaders = [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
  ];

  const recommendedHeaders = [
    'Permissions-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Opener-Policy',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  requiredHeaders.forEach(header => {
    if (!headers.has(header)) {
      missing.push(header);
    }
  });

  recommendedHeaders.forEach(header => {
    if (!headers.has(header)) {
      warnings.push(header);
    }
  });

  // Check for insecure values
  if (headers.get('X-Powered-By')) {
    warnings.push('X-Powered-By header should be removed');
  }

  const score = Math.max(
    0,
    100 - (missing.length * 15) - (warnings.length * 5)
  );

  return { score, missing, warnings };
}

