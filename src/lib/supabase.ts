import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Re-export client functions
export { createClient } from './supabase-client'
export { createServerSupabaseClient, createServiceClient } from './supabase-server'

// Middleware client for auth refresh
export function createMiddlewareClient(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const accessToken = request.cookies.get('sb-access-token')?.value

  if (accessToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value }) => {
            if (name === 'sb-access-token') {
              requestHeaders.set('Authorization', `Bearer ${value}`)
            }
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, supabaseResponse }
}
