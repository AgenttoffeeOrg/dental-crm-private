import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/database'

// Server client for server-side operations (Route Handlers, Server Components)
//
// Uses the modern `@supabase/ssr` `getAll`/`setAll` cookie API. The previous
// implementation used the deprecated single-cookie `get(name)`/`set(name,...)`
// adapter, which fails when `@supabase/ssr` chunks the session JWT across
// multiple cookies (e.g. `sb-<ref>-auth-token.0`, `…1`) — the adapter looks up
// the legacy unchunked name, gets nothing, and `auth.getUser()` returns null
// even when the user is fully authenticated. API routes were masked from this
// failure because `getSupabaseAuthContext` falls back to the `Authorization:
// Bearer` header sent by the browser-side client, but Server Components have
// no such header and broke catastrophically (see Phase 2b.1.b.2 §3 row J,
// surfaced when the new `/settings/integrations/google` page consistently
// rendered the "session needs to refresh" shell). `getAll`/`setAll` matches
// what `createMiddlewareClient` in `./supabase.ts` already uses.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  let headerStore: Headers | null = null

  try {
    headerStore = headers()
  } catch {
    headerStore = null
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          // Server Components cannot mutate cookies — middleware refreshes
          // sessions for us, so the try/catch here is defensive against the
          // expected exception. Route handlers can mutate, and they will.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Intentional no-op. See doc comment above.
          }
        },
      },
      headers: {
        get(name: string) {
          if (!headerStore) return undefined
          return headerStore.get(name) ?? undefined
        },
      },
    }
  )
}

// Service role client for admin operations (use sparingly and only on server)
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client')
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    }
  )
}

// Aliases for compatibility with existing code
export const createClient = createServiceClient
// Note: createServerClient is imported from @supabase/ssr, use createServerSupabaseClient for the wrapper
