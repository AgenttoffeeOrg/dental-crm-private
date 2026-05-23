'use client'

/**
 * Phase 2b.53 — Dashboard global search.
 *
 * Persistent search bar in the dashboard header. Searches across
 * contacts + deals + activity bodies. Cmd+K (Ctrl+K on Windows)
 * focuses the input from anywhere on the dashboard. Results render
 * in a dropdown directly under the search input.
 *
 * No backend endpoint needed — three parallel Supabase queries from
 * the user-scoped client (RLS enforces tenant). Debounced 200ms.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, User, Target, MessageSquare, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

interface SearchResultContact {
  kind: 'contact'
  id: string
  primary: string
  secondary: string | null
}
interface SearchResultDeal {
  kind: 'deal'
  id: string
  primary: string
  secondary: string | null
}
interface SearchResultActivity {
  kind: 'activity'
  id: string
  contact_id: string | null
  primary: string
  secondary: string | null
}
type SearchResult = SearchResultContact | SearchResultDeal | SearchResultActivity

interface DashboardGlobalSearchProps {
  tenantId: string | null | undefined
}

const DEBOUNCE_MS = 200
const MAX_PER_KIND = 5

// 2b.57.1 (audit HIGH #6) — PostgREST `or=` string syntax uses
// `,` `(` `)` and `:` as clause delimiters. Stripping them prevents
// a search like `foo,full_name.eq.X` from breaking the parser.
// SQL wildcards (`%` `_`) get squashed to spaces so they don't bleed
// into the ILIKE. RLS still gates results — this is defence-in-depth
// against query-parser misbehaviour, not RLS bypass.
function sanitiseSearchInput(s: string): string {
  return s.replace(/[%_,():]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function search(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  q: string
): Promise<SearchResult[]> {
  const safe = sanitiseSearchInput(q)
  if (!safe) return []
  const wildcard = `%${safe}%`

  const [contactsRes, dealsRes, activitiesRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, full_name, primary_phone, primary_email')
      .eq('tenant_id', tenantId)
      .or(
        `full_name.ilike.${wildcard},primary_email.ilike.${wildcard},primary_phone.ilike.${wildcard}`
      )
      .limit(MAX_PER_KIND),
    supabase
      .from('deals')
      .select('id, title, value_estimate_cents')
      .eq('tenant_id', tenantId)
      .ilike('title', wildcard)
      .is('deleted_at', null)
      .limit(MAX_PER_KIND),
    supabase
      .from('activities')
      .select('id, contact_id, subject, snippet, type, occurred_at')
      .eq('tenant_id', tenantId)
      .or(`subject.ilike.${wildcard},snippet.ilike.${wildcard}`)
      .order('occurred_at', { ascending: false })
      .limit(MAX_PER_KIND),
  ])

  const out: SearchResult[] = []
  for (const c of (contactsRes.data ?? []) as Array<{
    id: string
    full_name: string | null
    primary_phone: string | null
    primary_email: string | null
  }>) {
    out.push({
      kind: 'contact',
      id: c.id,
      primary: c.full_name ?? c.primary_phone ?? c.primary_email ?? '(unnamed contact)',
      secondary: c.primary_email ?? c.primary_phone ?? null,
    })
  }
  for (const d of (dealsRes.data ?? []) as Array<{
    id: string
    title: string | null
    value_estimate_cents: number | null
  }>) {
    const value = d.value_estimate_cents
      ? `£${Math.round(d.value_estimate_cents / 100).toLocaleString('en-GB')}`
      : null
    out.push({
      kind: 'deal',
      id: d.id,
      primary: d.title ?? '(untitled deal)',
      secondary: value,
    })
  }
  for (const a of (activitiesRes.data ?? []) as Array<{
    id: string
    contact_id: string | null
    subject: string | null
    snippet: string | null
    type: string | null
    occurred_at: string
  }>) {
    const preview = (a.snippet ?? a.subject ?? '').slice(0, 80)
    out.push({
      kind: 'activity',
      id: a.id,
      contact_id: a.contact_id,
      primary: preview || `(${a.type ?? 'activity'})`,
      secondary: a.type ? `${a.type} · ${new Date(a.occurred_at).toLocaleDateString('en-GB')}` : null,
    })
  }
  return out
}

export function DashboardGlobalSearch({ tenantId }: DashboardGlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // ⌘+K / Ctrl+K focuses the input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click-outside closes the dropdown.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Debounced search.
  useEffect(() => {
    if (!tenantId) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const supabase = createClient()
    const handle = setTimeout(async () => {
      const found = await search(supabase, tenantId, trimmed)
      setResults(found)
      setSearching(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query, tenantId])

  const handlePick = (r: SearchResult) => {
    setOpen(false)
    setQuery('')
    if (r.kind === 'contact') router.push(`/contacts/${r.id}`)
    else if (r.kind === 'deal') router.push(`/deals/${r.id}`)
    else if (r.kind === 'activity' && r.contact_id) router.push(`/contacts/${r.contact_id}`)
  }

  const grouped = useMemo(() => {
    const c = results.filter((r): r is SearchResultContact => r.kind === 'contact')
    const d = results.filter((r): r is SearchResultDeal => r.kind === 'deal')
    const a = results.filter((r): r is SearchResultActivity => r.kind === 'activity')
    return { contacts: c, deals: d, activities: a }
  }, [results])

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search contacts, deals, messages…  ⌘K"
          className="pl-9 pr-3 h-9 text-sm"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {searching && (
            <div className="px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="px-3 py-3 text-sm text-gray-500">
              No matches for &ldquo;{query}&rdquo;.
            </div>
          )}
          {!searching && grouped.contacts.length > 0 && (
            <ResultGroup
              title="Contacts"
              icon={User}
              items={grouped.contacts}
              onPick={handlePick}
            />
          )}
          {!searching && grouped.deals.length > 0 && (
            <ResultGroup title="Deals" icon={Target} items={grouped.deals} onPick={handlePick} />
          )}
          {!searching && grouped.activities.length > 0 && (
            <ResultGroup
              title="Messages"
              icon={MessageSquare}
              items={grouped.activities}
              onPick={handlePick}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface ResultGroupProps {
  title: string
  icon: typeof User
  items: SearchResult[]
  onPick: (r: SearchResult) => void
}

function ResultGroup({ title, icon: Icon, items, onPick }: ResultGroupProps) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      {items.map((r) => (
        <button
          key={`${r.kind}-${r.id}`}
          type="button"
          onClick={() => onPick(r)}
          className={cn(
            'w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-blue-50 transition-colors'
          )}
        >
          <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 truncate">{r.primary}</div>
            {r.secondary && (
              <div className="text-xs text-gray-500 truncate">{r.secondary}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
