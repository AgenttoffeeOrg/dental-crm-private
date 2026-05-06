/**
 * Phase 2a.2b — Dedup review queue: list endpoint.
 *
 * GET /api/dedup-queue?status=pending&limit=50&offset=0&q=<search>
 *
 * Auth: requires `contacts.dedup_queue_manage` (granted to owner / admin via
 * 3-arg `public.user_has_permission(uid, tenant_id, code)`).
 *
 * Returns queue items (most recent first) enriched with the actual contact
 * rows referenced in `matched_contact_ids[]`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const VALID_STATUSES = new Set([
  'pending',
  'merged',
  'new_contact',
  'dismissed',
  'all',
])

interface MatchedContactSummary {
  id: string
  full_name: string | null
  primary_email: string | null
  primary_phone: string | null
  created_at: string
  last_touch_at: string | null
}

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user } = context

    const { data: hasPerm, error: permError } = await supabase.rpc(
      'user_has_permission',
      {
        p_user_id: user.id,
        p_tenant_id: tenantId,
        p_permission_code: 'contacts.dedup_queue_manage',
      }
    )

    if (permError) {
      console.error('[API:dedup-queue] permission check failed', permError)
      return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
    }
    if (!hasPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const rawStatus = params.get('status') ?? 'pending'
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'pending'
    const rawLimit = parseInt(params.get('limit') ?? '', 10)
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : DEFAULT_LIMIT
    const rawOffset = parseInt(params.get('offset') ?? '', 10)
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0
    const q = (params.get('q') ?? '').trim()

    let query = supabase
      .from('dedup_review_queue')
      .select(
        'id, candidate_payload, candidate_email, candidate_phone, candidate_name, source_channel, matched_contact_ids, match_signals, status, created_at, expires_at, resolved_at, resolved_by_user_id, resolved_contact_id, resolution_notes',
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (q) {
      // Escape PostgREST `or` reserved characters so user input can't break the
      // filter expression. Commas, parens, and single quotes are stripped.
      const safe = q.replace(/[,()'"]/g, '')
      if (safe.length > 0) {
        query = query.or(
          `candidate_email.ilike.%${safe}%,candidate_phone.ilike.%${safe}%,candidate_name.ilike.%${safe}%`
        )
      }
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('[API:dedup-queue] list query failed', error)
      return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 })
    }

    const enrichedItems = await enrichWithMatchedContacts(supabase, tenantId, items ?? [])

    return NextResponse.json({
      items: enrichedItems,
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[API:dedup-queue] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function enrichWithMatchedContacts<T extends { matched_contact_ids: string[] | null }>(
  supabase: { from: (t: string) => any },
  tenantId: string,
  items: T[]
): Promise<Array<T & { matched_contacts: MatchedContactSummary[] }>> {
  const allMatchedIds = Array.from(
    new Set(items.flatMap((i) => i.matched_contact_ids ?? []))
  )

  let matchedById = new Map<string, MatchedContactSummary>()
  if (allMatchedIds.length > 0) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, primary_email, primary_phone, created_at, last_touch_at')
      .in('id', allMatchedIds)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    matchedById = new Map(
      (contacts ?? []).map((c: MatchedContactSummary) => [c.id, c])
    )
  }

  return items.map((item) => ({
    ...item,
    matched_contacts: (item.matched_contact_ids ?? [])
      .map((id) => matchedById.get(id))
      .filter((c): c is MatchedContactSummary => Boolean(c)),
  }))
}
