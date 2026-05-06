'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface DedupQueueAccess {
  hasAccess: boolean | null // null while unknown
  pendingCount: number
}

const POLL_INTERVAL_MS = 30_000

/**
 * Phase 2a.2b — fetches the pending dedup queue count and a permission flag
 * derived from the API response. Used by the sidebar nav entry to:
 *   - hide the link entirely when the user lacks `contacts.dedup_queue_manage`
 *     (API returns 403)
 *   - show a count badge next to the link when there are pending items
 *
 * Polls every 30 s. Lightweight — single row fetch, count-only.
 */
export function useDedupQueueAccess(): DedupQueueAccess {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      try {
        const res = await authFetch('/api/dedup-queue?status=pending&limit=1')
        if (cancelled) return
        if (res.status === 403) {
          setHasAccess(false)
          setPendingCount(0)
          return
        }
        if (!res.ok) {
          // Don't flip hasAccess on transient errors; keep last-known.
          return
        }
        const data = (await res.json().catch(() => null)) as
          | { total?: number }
          | null
        if (cancelled) return
        setHasAccess(true)
        if (data && typeof data.total === 'number') setPendingCount(data.total)
      } catch {
        // Network blip — keep prior state.
      }
    }

    tick()
    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { hasAccess, pendingCount }
}
