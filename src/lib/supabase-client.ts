import { createBrowserClient } from '@supabase/ssr'

// Browser client for client-side operations
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'dental-crm-auth',
      },
    }
  )
}
