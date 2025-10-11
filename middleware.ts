import { createMiddlewareClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request)

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes - require authentication
  const protectedPaths = ['/pipeline', '/deals', '/contacts', '/tasks', '/settings', '/analytics']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // If accessing protected route without session, redirect to login
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing login with session, redirect to pipeline (dashboard)
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/pipeline', request.url))
  }

  // Redirect root to pipeline if authenticated, otherwise to login
  if (request.nextUrl.pathname === '/') {
    const redirectUrl = session ? new URL('/pipeline', request.url) : new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (auth API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
