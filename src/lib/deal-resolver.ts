import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolveDealInput {
  tenantId: string
  contactId: string
  supabase: SupabaseClient
}

export interface ResolvedDeal {
  id: string
  title: string
}

export interface DealStageFlags {
  is_won?: boolean | null
  is_lost?: boolean | null
}

export interface DealForAttachment {
  id: string
  title: string
  updated_at?: string | null
  stage?: DealStageFlags | null
  last_activity_at?: string | null
}

/** Open = stage is not won and not lost (flag-based single source of truth). */
export function isDealOpen(stage: DealStageFlags | null | undefined): boolean {
  return !Boolean(stage?.is_won) && !Boolean(stage?.is_lost)
}

export function isDealClosedByStage(stage: DealStageFlags | null | undefined): boolean {
  return Boolean(stage?.is_won || stage?.is_lost)
}

type DealRow = {
  id: string
  title: string
  updated_at: string | null
  pipeline_stages: DealStageFlags | DealStageFlags[]
}

function normalizeStage(
  stage: DealStageFlags | DealStageFlags[] | null | undefined
): DealStageFlags | null {
  if (!stage) return null
  return Array.isArray(stage) ? stage[0] ?? null : stage
}

/**
 * Returns the most recently active OPEN deal for (tenant, contact).
 * "Most recently active" = max(activities.occurred_at) on the deal;
 * deals.updated_at DESC as tiebreaker.
 */
export async function resolveMostRecentlyActiveOpenDeal(
  input: ResolveDealInput
): Promise<ResolvedDeal | null> {
  const openDeals = await fetchOpenDealsForContact(input)
  if (!openDeals.length) return null

  const maxActivityByDeal = await fetchMaxActivityByDeal(
    input.supabase,
    input.tenantId,
    openDeals.map((d) => d.id)
  )

  const sorted = sortDealsByRecentActivity(openDeals, maxActivityByDeal)
  const top = sorted[0]
  return top ? { id: top.id, title: top.title } : null
}

async function fetchOpenDealsForContact(input: ResolveDealInput): Promise<DealRow[]> {
  const { data, error } = await input.supabase
    .from('deals')
    .select('id, title, updated_at, pipeline_stages!inner(is_won, is_lost)')
    .eq('tenant_id', input.tenantId)
    .eq('contact_id', input.contactId)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .is('deleted_at', null)

  if (error) {
    console.warn('[deal-resolver] open deals lookup failed', {
      tenantId: input.tenantId,
      contactId: input.contactId,
      error: error.message,
    })
    return []
  }

  return (data ?? []) as DealRow[]
}

async function fetchMaxActivityByDeal(
  supabase: SupabaseClient,
  tenantId: string,
  dealIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!dealIds.length) return map

  const { data, error } = await supabase
    .from('activities')
    .select('deal_id, occurred_at')
    .eq('tenant_id', tenantId)
    .in('deal_id', dealIds)

  if (error) {
    console.warn('[deal-resolver] activity timestamps lookup failed', error.message)
    return map
  }

  for (const row of data ?? []) {
    const dealId = row.deal_id as string | null
    const occurredAt = row.occurred_at as string | null
    if (!dealId || !occurredAt) continue
    const prev = map.get(dealId)
    if (!prev || occurredAt > prev) {
      map.set(dealId, occurredAt)
    }
  }

  return map
}

export function sortDealsByRecentActivity<T extends { id: string; updated_at?: string | null }>(
  deals: T[],
  maxActivityByDeal: Map<string, string>
): T[] {
  return [...deals].sort((a, b) => {
    const aMax = maxActivityByDeal.get(a.id) ?? null
    const bMax = maxActivityByDeal.get(b.id) ?? null
    if (aMax && bMax) {
      const cmp = bMax.localeCompare(aMax)
      if (cmp !== 0) return cmp
    } else if (aMax && !bMax) return -1
    else if (!aMax && bMax) return 1

    const aUpdated = a.updated_at ?? ''
    const bUpdated = b.updated_at ?? ''
    return bUpdated.localeCompare(aUpdated)
  })
}

/** Dropdown: open deals by recent activity, closed deals by updated_at DESC. */
export function partitionDealsForDropdown(
  deals: DealForAttachment[],
  maxActivityByDeal: Map<string, string>
): { open: DealForAttachment[]; closed: DealForAttachment[] } {
  const open: DealForAttachment[] = []
  const closed: DealForAttachment[] = []

  for (const deal of deals) {
    if (isDealOpen(deal.stage)) {
      open.push(deal)
    } else {
      closed.push(deal)
    }
  }

  const openSorted = sortDealsByRecentActivity(
    open.map((d) => ({ id: d.id, updated_at: d.updated_at ?? d.last_activity_at ?? null })),
    maxActivityByDeal
  )
  const openById = new Map(open.map((d) => [d.id, d]))
  const openOrdered = openSorted.map((s) => openById.get(s.id)!).filter(Boolean)

  closed.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))

  return { open: openOrdered, closed }
}

export async function fetchMaxActivityTimestampsForDeals(
  supabase: SupabaseClient,
  tenantId: string,
  dealIds: string[]
): Promise<Map<string, string>> {
  return fetchMaxActivityByDeal(supabase, tenantId, dealIds)
}
