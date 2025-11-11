'use client'

import { createClient } from '@/lib/supabase-client'

const supabaseBrowser = createClient()

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession()

  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
    }
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

