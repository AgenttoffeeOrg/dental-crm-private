'use client'

import { createClient } from '@/lib/supabase-client'

const supabaseBrowser = createClient()

// Cap the supabase getSession() lookup. @supabase/ssr's browser client takes an
// internal NavigatorLock during token refresh windows; if `authFetch` is called
// from a render that races a refresh (e.g. clicking a Save button at the same
// moment as `onAuthStateChange SIGNED_IN` fires), `getSession()` can hang
// indefinitely. We don't actually need the Bearer header to authenticate — every
// route handler also reads the session from cookies via `getSupabaseAuthContext`,
// and we already send `credentials: 'include'` below. So we time the lookup out
// and fall through to cookie-only auth; the request still goes out.
const GET_SESSION_TIMEOUT_MS = 2500

const TIMED_OUT = Symbol('getSession timed out')

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const result = await Promise.race([
      supabaseBrowser.auth.getSession().then((r) => r.data.session ?? null),
      new Promise<typeof TIMED_OUT>((resolve) =>
        setTimeout(() => resolve(TIMED_OUT), GET_SESSION_TIMEOUT_MS),
      ),
    ])

    if (result === TIMED_OUT) {
      console.warn(
        `[authFetch] supabase.auth.getSession() exceeded ${GET_SESSION_TIMEOUT_MS}ms; falling back to cookie auth`,
      )
      return {}
    }

    if (result?.access_token) {
      return { Authorization: `Bearer ${result.access_token}` }
    }
  } catch (err) {
    console.warn('[authFetch] getSession() failed; falling back to cookie auth', err)
  }

  return {}
}

function normalizeHeaders(input?: HeadersInit): Record<string, string> {
  if (!input) {
    return {}
  }

  if (input instanceof Headers) {
    return Object.fromEntries(input.entries())
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input)
  }

  return { ...input }
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders.Authorization) {
    console.warn('[authFetch] No access token available for request', input.toString?.() ?? input)
  }
  const mergedHeaders = {
    ...normalizeHeaders(init.headers),
    ...authHeaders,
  }

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: mergedHeaders,
  })
}

