import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/database'

// Server client for server-side operations (Route Handlers, Server Components)
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
        get(name: string) {
          const cookie = cookieStore.get(name)
          return cookie ? { name: cookie.name, value: cookie.value } : undefined
        },
        set(name: string, value: string, options?: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options?: Parameters<typeof cookieStore.delete>[1]) {
          try {
            cookieStore.delete(name, options)
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
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
