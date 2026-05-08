/**
 * Phase 2b.1.b.2 — small fetch helpers used by the customer / conversion-action
 * pickers. Pulled into their own module so the renderer files stay small enough
 * for Lizard's per-file complexity gate.
 */

import type { ListState } from './types'

interface FetchListResult<T> {
  ok: boolean
  status: number
  body: Partial<T> & { error?: string; detail?: string }
}

export async function fetchListJson<T>(url: string): Promise<FetchListResult<T>> {
  try {
    const res = await fetch(url)
    let body: unknown = {}
    try {
      body = await res.json()
    } catch {
      body = {}
    }
    return {
      ok: res.ok,
      status: res.status,
      body: (body ?? {}) as Partial<T> & { error?: string; detail?: string },
    }
  } catch {
    return {
      ok: false,
      status: 0,
      body: { error: 'network_error' } as Partial<T> & { error?: string },
    }
  }
}

export function toListState<T, B>(
  r: FetchListResult<B>,
  pluck: (b: Partial<B>) => T[]
): ListState<T> {
  if (r.status === 401) {
    globalThis.location.assign('/login')
    return { kind: 'loading' }
  }
  if (!r.ok) {
    if (r.body.error === 'oauth_revoked' || r.body.error === 'oauth_not_connected') {
      return { kind: 'oauth_revoked' }
    }
    return { kind: 'error', detail: r.body.detail }
  }
  return { kind: 'ready', items: pluck(r.body) }
}

export function formatConnectedAt(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
