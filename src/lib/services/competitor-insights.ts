import { subDays } from 'date-fns'

import { createServiceClient } from '@/lib/supabase-server'
import type { Competitor, CompetitorIngestionJob, CompetitorPricePoint, CompetitorTouchpoint } from '@/types/database'

export interface CompetitorPriceInsight {
  treatmentName: string | null
  priceCents: number | null
  previousPriceCents?: number | null
  deltaCents?: number | null
  collectedAt: string
}

export interface CompetitorInsightRow {
  id: string
  name: string
  website?: string | null
  notes?: string | null
  latestPrices: CompetitorPriceInsight[]
  touchpointsLast30: number
  lastTouchpoint?: string | null
  lastPriceUpdate?: string | null
}

export interface CompetitorTouchpointSummary {
  type: string
  count: number
}

export interface IngestionJobSummary {
  id: string
  sourceName: string
  status: string
  rows?: number | null
  startedAt: string
  completedAt?: string | null
  failures?: number | null
}

export interface CompetitorInsightsPayload {
  summary: {
    totalCompetitors: number
    avgPriceDelta: number
    totalTouchpoints30: number
    topCompetitor?: string | null
  }
  competitors: CompetitorInsightRow[]
  touchpointsByType: CompetitorTouchpointSummary[]
  recentJobs: IngestionJobSummary[]
}

type SupabaseClientType = ReturnType<typeof createServiceClient>

export async function getCompetitorInsights(
  supabase: SupabaseClientType,
  tenantId: string
): Promise<CompetitorInsightsPayload> {
  const [competitorRes, priceRes, touchpointRes, jobsRes] = await Promise.all([
    supabase
      .from<Competitor>('competitors')
      .select('id, name, website, notes, metadata, updated_at')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
    supabase
      .from<CompetitorPricePoint>('competitor_price_points')
      .select('id, competitor_id, treatment_name, price_cents, collected_at')
      .eq('tenant_id', tenantId)
      .order('collected_at', { ascending: false })
      .limit(2000),
    supabase
      .from<CompetitorTouchpoint>('competitor_touchpoints')
      .select('id, competitor_id, touchpoint_type, occurred_at')
      .eq('tenant_id', tenantId)
      .gte('occurred_at', subDays(new Date(), 30).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(2000),
    supabase
      .from<CompetitorIngestionJob>('competitor_ingestion_jobs')
      .select('id, source_name, status, payload, result_summary, started_at, completed_at')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(5),
  ])

  const competitors = competitorRes.data ?? []
  const pricePoints = priceRes.data ?? []
  const touchpoints = touchpointRes.data ?? []
  const jobs = jobsRes.data ?? []

  const competitorMap = new Map<string, CompetitorInsightRow>()
  competitors.forEach((competitor) => {
    competitorMap.set(competitor.id, {
      id: competitor.id,
      name: competitor.name,
      website: competitor.website ?? null,
      notes: competitor.notes ?? null,
      latestPrices: [],
      touchpointsLast30: 0,
      lastTouchpoint: null,
      lastPriceUpdate: null,
    })
  })

  const priceAccumulator = new Map<string, { latest: CompetitorPricePoint; previous?: CompetitorPricePoint }>()
  for (const price of pricePoints) {
    if (!price.competitor_id) continue
    if (!competitorMap.has(price.competitor_id)) continue

    const treatmentKey = `${price.competitor_id}::${price.treatment_name ?? ''}`
    if (!priceAccumulator.has(treatmentKey)) {
      priceAccumulator.set(treatmentKey, { latest: price })
    } else {
      const entry = priceAccumulator.get(treatmentKey)!
      if (!entry.previous) {
        entry.previous = price
      }
    }
  }

  let deltaSum = 0
  let deltaCount = 0

  priceAccumulator.forEach(({ latest, previous }) => {
    const competitor = competitorMap.get(latest.competitor_id!)
    if (!competitor) return

    const latestPrice = normalizeCents(latest.price_cents)
    const previousPrice = previous ? normalizeCents(previous.price_cents) : null
    const delta = previousPrice !== null && latestPrice !== null ? latestPrice - previousPrice : null

    competitor.latestPrices.push({
      treatmentName: latest.treatment_name ?? null,
      priceCents: latestPrice,
      previousPriceCents: previousPrice ?? undefined,
      deltaCents: delta ?? undefined,
      collectedAt: latest.collected_at ?? new Date().toISOString(),
    })

    if (!competitor.lastPriceUpdate || compareTimestamps(latest.collected_at, competitor.lastPriceUpdate) > 0) {
      competitor.lastPriceUpdate = latest.collected_at ?? competitor.lastPriceUpdate
    }

    if (delta !== null) {
      deltaSum += Math.abs(delta)
      deltaCount += 1
    }
  })

  const touchpointTotals = new Map<string, number>()
  const touchpointTypeTotals = new Map<string, number>()

  for (const touchpoint of touchpoints) {
    if (!touchpoint.competitor_id) continue
    if (!competitorMap.has(touchpoint.competitor_id)) continue

    const competitor = competitorMap.get(touchpoint.competitor_id)!
    competitor.touchpointsLast30 += 1
    if (!competitor.lastTouchpoint || compareTimestamps(touchpoint.occurred_at, competitor.lastTouchpoint) > 0) {
      competitor.lastTouchpoint = touchpoint.occurred_at ?? competitor.lastTouchpoint
    }

    touchpointTotals.set(touchpoint.competitor_id, (touchpointTotals.get(touchpoint.competitor_id) ?? 0) + 1)

    const typeKey = touchpoint.touchpoint_type ?? 'unknown'
    touchpointTypeTotals.set(typeKey, (touchpointTypeTotals.get(typeKey) ?? 0) + 1)
  }

  const competitorsArray = Array.from(competitorMap.values())
    .map((competitor) => ({
      ...competitor,
      latestPrices: competitor.latestPrices.sort((a, b) => compareTimestamps(b.collectedAt, a.collectedAt)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const summary = {
    totalCompetitors: competitorsArray.length,
    avgPriceDelta: deltaCount > 0 ? Math.round(deltaSum / deltaCount) : 0,
    totalTouchpoints30: touchpoints.length,
    topCompetitor: determineTopCompetitor(competitorsArray, touchpointTotals),
  }

  const touchpointsByType: CompetitorTouchpointSummary[] = Array.from(touchpointTypeTotals.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const recentJobs: IngestionJobSummary[] = jobs.map((job) => {
    const rows = typeof job.payload?.rows === 'number' ? job.payload.rows : parseInt(job.payload?.rows as any, 10) || null
    const failures = typeof job.result_summary?.failures === 'number'
      ? job.result_summary.failures
      : Array.isArray(job.result_summary?.failures)
      ? job.result_summary.failures.length
      : null

    return {
      id: job.id,
      sourceName: job.source_name,
      status: job.status,
      rows,
      startedAt: job.started_at ?? '',
      completedAt: job.completed_at ?? null,
      failures,
    }
  })

  return {
    summary,
    competitors: competitorsArray,
    touchpointsByType,
    recentJobs,
  }
}

function normalizeCents(value?: number | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function compareTimestamps(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0
  if (a && !b) return 1
  if (!a && b) return -1
  return new Date(a!).getTime() - new Date(b!).getTime()
}

function determineTopCompetitor(
  competitors: CompetitorInsightRow[],
  touchpointTotals: Map<string, number>
): string | null {
  if (!competitors.length) return null

  let topCompetitor: CompetitorInsightRow | null = null
  let topScore = -Infinity

  competitors.forEach((competitor) => {
    const touchpointScore = touchpointTotals.get(competitor.id) ?? 0
    const priceScore = competitor.latestPrices.reduce((acc, price) => acc + Math.abs(price.deltaCents ?? 0), 0)
    const totalScore = touchpointScore * 2 + priceScore

    if (totalScore > topScore) {
      topScore = totalScore
      topCompetitor = competitor
    }
  })

  return topCompetitor?.name ?? null
}

