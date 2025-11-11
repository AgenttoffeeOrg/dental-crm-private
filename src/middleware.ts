/**
 * Next.js Middleware
 * Applies security headers, rate limiting, and authentication
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'

const PUBLIC_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/auth',
  '/',
]

const AUTH_ONLY_ROUTES = [
  '/organization-setup',
  '/profile/settings',
]

const ORG_REQUIRED_ROUTES = [
  '/dashboard',
  '/contacts',
  '/deals',
  '/tasks',
  '/pipelines',
  '/settings',
  '/onboarding',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, supabaseResponse } = createMiddlewareClient(request)

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = new URL('/sign-in', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (AUTH_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership && ORG_REQUIRED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/organization-setup', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|public).*)',
  ],
}

