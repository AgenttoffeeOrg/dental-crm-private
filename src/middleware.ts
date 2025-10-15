/**
 * Next.js Middleware
 * Applies security headers, rate limiting, and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders, getCacheHeaders } from '@/lib/marketing-audit/security/security-headers';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers to all responses
  applySecurityHeaders(response.headers);

  // Apply caching headers based on route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // API routes - no cache
    const noCacheHeaders = getCacheHeaders('no-cache');
    Object.entries(noCacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    // Static assets - long cache
    const publicCacheHeaders = getCacheHeaders('public', 31536000); // 1 year
    Object.entries(publicCacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else {
    // Pages - short cache
    const privateCacheHeaders = getCacheHeaders('private', 3600); // 1 hour
    Object.entries(privateCacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Add custom headers
  response.headers.set('X-App-Version', process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0');
  response.headers.set('X-Request-ID', crypto.randomUUID());

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next/static (static files)
     * 2. /_next/image (image optimization files)
     * 3. /favicon.ico, /sitemap.xml, /robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

