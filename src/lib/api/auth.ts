'use server'

import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function getSupabaseAuthContext(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null
  if (!bearerToken) {
    console.warn('[getSupabaseAuthContext] No bearer token on request', request.nextUrl?.pathname ?? '')
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          return cookie ? { name: cookie.name, value: cookie.value } : undefined
        },
        set() {
          // Route handlers run on the server without direct cookie mutation.
          // Supabase may attempt to refresh tokens; ignore in this context.
        },
        remove() {
          // No-op for the same reason as above.
        },
      },
      headers: {
        get(name: string) {
          if (name.toLowerCase() === 'authorization' && bearerToken) {
            return `Bearer ${bearerToken}`
          }
          return request.headers.get(name) ?? undefined
        },
      },
      ...(bearerToken
        ? {
            global: {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            },
          }
        : {}),
    }
  )

  let {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user && bearerToken) {
    const result = await supabase.auth.getUser(bearerToken)
    user = result.data.user
    if (result.error) {
      error = result.error
    }
  }

  return { supabase, user, error }
}

