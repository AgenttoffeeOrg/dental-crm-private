/**
 * Phase 2a.2b — Dedup review queue: single-item detail endpoint.
 *
 * GET /api/dedup-queue/[id]
 *
 * Same auth + enrichment as the list endpoint; returns one row by id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { enrichWithMatchedContacts } from '../route'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user } = context
    const { id } = params

    const { data: hasPerm, error: permError } = await supabase.rpc(
      'user_has_permission',
      {
        p_user_id: user.id,
        p_tenant_id: tenantId,
        p_permission_code: 'contacts.dedup_queue_manage',
      }
    )

    if (permError) {
      console.error('[API:dedup-queue/:id] permission check failed', permError)
      return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
    }
    if (!hasPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: item, error } = await supabase
      .from('dedup_review_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[API:dedup-queue/:id] fetch failed', error)
      return NextResponse.json({ error: 'Failed to fetch queue item' }, { status: 500 })
    }
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [enriched] = await enrichWithMatchedContacts(supabase, tenantId, [
      item as { matched_contact_ids: string[] | null },
    ])

    return NextResponse.json({ item: enriched })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[API:dedup-queue/:id] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
