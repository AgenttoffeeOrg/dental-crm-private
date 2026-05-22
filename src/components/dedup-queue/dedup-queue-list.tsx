'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ShieldAlert, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authFetch } from '@/lib/auth-fetch'
import { sourceChannelToLabel } from '@/lib/lead-ingestion/source-labels'
import { DedupReviewModal, type DedupQueueItem } from './dedup-review-modal'

type StatusFilter = 'pending' | 'merged' | 'new_contact' | 'dismissed' | 'all'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'merged', label: 'Merged' },
  { value: 'new_contact', label: 'Created new' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
]

export function DedupQueueList() {
  const [status, setStatus] = useState<StatusFilter>('pending')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [items, setItems] = useState<DedupQueueItem[]>([])
  const [pendingTotal, setPendingTotal] = useState<number | null>(null)
  // 2b.33 — also track resolved-total so the subtitle hints there's
  // history when pending = 0 but past leads have been merged /
  // dismissed. Audit noted operators couldn't tell the difference
  // between "no dedup activity ever" and "all clean, but past
  // resolutions exist".
  const [resolvedTotal, setResolvedTotal] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<DedupQueueItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Debounce search input by 300ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ status, limit: '50' })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await authFetch(`/api/dedup-queue?${params.toString()}`)
      const data = await res.json().catch(() => ({}))

      if (res.status === 403) {
        setPermissionDenied(true)
        setItems([])
        setTotal(0)
        return
      }
      setPermissionDenied(false)

      if (!res.ok) {
        setError(data?.error ?? 'Failed to load queue')
        setItems([])
        setTotal(0)
        return
      }

      setItems(data.items ?? [])
      setTotal(data.total ?? 0)

      // Maintain a separate pending total used for the page subtitle.
      if (status === 'pending') {
        setPendingTotal(data.total ?? 0)
      }
    } catch (err) {
      console.error('[DedupQueueList] fetch failed', err)
      setError('Network error')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [status, debouncedQ])

  // Separate fetch for the pending count so the subtitle stays accurate even
  // when the active filter is something else (Resolved / Dismissed / All).
  const fetchPendingCount = useCallback(async () => {
    if (status === 'pending') return // already in items query
    try {
      const res = await authFetch('/api/dedup-queue?status=pending&limit=1')
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (data && typeof data.total === 'number') setPendingTotal(data.total)
    } catch {
      // ignore — pending count is decorative
    }
  }, [status])

  // 2b.33 — fetch the "all resolved" total once on mount so the subtitle
  // can hint at history when pending == 0. "All" status returns every
  // row regardless of resolution state.
  const fetchResolvedCount = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        authFetch('/api/dedup-queue?status=pending&limit=1'),
        authFetch('/api/dedup-queue?status=all&limit=1'),
      ])
      const pendingBody = pendingRes.ok
        ? await pendingRes.json().catch(() => null)
        : null
      const allBody = allRes.ok ? await allRes.json().catch(() => null) : null
      const pending = pendingBody?.total ?? 0
      const all = allBody?.total ?? 0
      const resolved = Math.max(0, all - pending)
      setResolvedTotal(resolved)
    } catch {
      // decorative
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetchPendingCount()
    fetchResolvedCount()
  }, [fetchPendingCount, fetchResolvedCount])

  const handleReview = (item: DedupQueueItem) => {
    setActiveItem(item)
    setModalOpen(true)
  }

  const handleResolved = useCallback(() => {
    fetchItems()
    fetchPendingCount()
  }, [fetchItems, fetchPendingCount])

  const subtitle = useMemo(() => {
    if (permissionDenied) return 'Access required'
    if (pendingTotal === null) return 'Loading…'
    const base = `${pendingTotal} pending — review and resolve`
    // 2b.33 — when pending = 0 but resolved history exists, hint at it
    // so the operator knows to flip the filter to see what happened.
    if (pendingTotal === 0 && resolvedTotal && resolvedTotal > 0) {
      return `${base} · ${resolvedTotal} resolved earlier (switch the filter to view)`
    }
    return base
  }, [permissionDenied, pendingTotal, resolvedTotal])

  if (permissionDenied) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Dedup Queue" subtitle="Access required" />
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="h-5 w-5 text-gray-500 mt-0.5 shrink-0"
              aria-hidden
            />
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                You don't have access to the dedup queue.
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Ask your practice owner or admin to grant you the{' '}
                <span className="font-medium">Manage dedup review queue</span>{' '}
                permission in Settings → Roles.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dedup Queue" subtitle={subtitle} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            aria-hidden
          />
          <Input
            placeholder="Search email, phone, or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <Th>Candidate name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Source</Th>
                  <Th>Possible matches</Th>
                  <Th>Status</Th>
                  <Th>Arrived</Th>
                  <Th className="text-right">&nbsp;</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <Td className="font-medium text-gray-900">
                      {item.candidate_name?.trim() || 'Unknown lead'}
                    </Td>
                    <Td className="text-gray-700 truncate max-w-[220px]">
                      {item.candidate_email ?? '—'}
                    </Td>
                    <Td className="text-gray-700">
                      {item.candidate_phone ?? '—'}
                    </Td>
                    <Td className="text-gray-700">
                      {sourceChannelToLabel(item.source_channel)}
                    </Td>
                    <Td>
                      <Badge variant="secondary">
                        {item.matched_contact_ids?.length ?? 0}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td className="text-gray-500 whitespace-nowrap">
                      {safeRelative(item.created_at)}
                    </Td>
                    <Td className="text-right">
                      {item.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleReview(item)}
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(item)}
                        >
                          View
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > items.length && (
            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
              Showing {items.length} of {total}.
            </div>
          )}
        </div>
      )}

      <DedupReviewModal
        item={activeItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onResolved={handleResolved}
      />
    </div>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
    </div>
  )
}

function EmptyState({ status }: { status: StatusFilter }) {
  if (status === 'pending') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
        <h2 className="text-base font-semibold text-gray-900">
          No leads need review right now.
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
          When the system isn't sure whether a new lead is the same person as
          an existing contact, it'll show up here.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">
      No queue items match the current filter.
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant: 'default' | 'secondary' | 'success' | 'destructive' =
    status === 'pending'
      ? 'default'
      : status === 'merged'
      ? 'success'
      : status === 'new_contact'
      ? 'success'
      : status === 'dismissed'
      ? 'destructive'
      : 'secondary'
  const label =
    status === 'new_contact' ? 'Created new' : capitalise(status)
  return <Badge variant={variant}>{label}</Badge>
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Th({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <th className={`px-4 py-2 ${className}`}>{children}</th>
}

function Td({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>
}

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return iso
  }
}
