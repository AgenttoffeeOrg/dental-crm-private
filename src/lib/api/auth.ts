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

  // Cookie adapter MUST use the modern `getAll`/`setAll` shape — the legacy
  // single-cookie `get(name)` API can't see `@supabase/ssr`'s chunked session
  // tokens (`sb-<ref>-auth-token.0`, `…1`, ...) and returns null for fully
  // authenticated users. This helper is the only auth path for browser
  // `fetch()` calls into our API routes that do NOT set `Authorization:
  // Bearer` (which is most of them, including the new Google Ads UI's
  // disconnect / rotate / customer-list / targets calls). Bearer-token paths
  // (curl with `-H 'Authorization: Bearer …'`, or any caller that explicitly
  // sets the header) still work via the fallback below. See Phase 2b.1.b.2
  // §3 row K.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
        },
        setAll() {
          // Route handlers can mutate cookies, but Supabase token refresh
          // here would race with middleware (which already does it). Treat
          // this as no-op — middleware owns refresh.
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

