import { createServiceClient } from '../supabase-server'
import { recordMetric } from '../monitoring/metrics'
import type {
  Competitor,
  CompetitorDocument,
  CompetitorIngestionJob,
  CompetitorPricePoint,
  CompetitorTouchpoint,
} from '@/types/database'

export type CompetitorIntelSourceType = 'manual' | 'webhook' | 'scheduled' | 'api'

export interface CompetitorIntelPricePoint {
  treatmentCode?: string | null
  treatmentName?: string | null
  priceCents?: number | null
  collectedAt?: string
  source?: string | null
  metadata?: Record<string, any>
}

export interface CompetitorIntelTouchpoint {
  touchpointType: string
  occurredAt?: string
  summary?: string | null
  link?: string | null
  metadata?: Record<string, any>
}

export interface CompetitorIntelDocument {
  documentPath: string
  source?: string | null
  capturedAt?: string
  checksum?: string | null
  metadata?: Record<string, any>
}

export interface CompetitorIntelRecord {
  tenantId: string
  competitor: {
    name: string
    website?: string | null
    primaryLocation?: string | null
    notes?: string | null
    metadata?: Record<string, any>
  }
  pricePoints?: CompetitorIntelPricePoint[]
  touchpoints?: CompetitorIntelTouchpoint[]
  documents?: CompetitorIntelDocument[]
}

export interface CompetitorIngestionOptions {
  jobId?: string
  sourceName: string
  sourceType?: CompetitorIntelSourceType
}

export interface CompetitorIngestionSummary {
  competitorsProcessed: number
  pricePointsInserted: number
  touchpointsInserted: number
  documentsLinked: number
  failures: Array<{ competitor: string; error: string }>
}

const DEFAULT_SUMMARY: CompetitorIngestionSummary = {
  competitorsProcessed: 0,
  pricePointsInserted: 0,
  touchpointsInserted: 0,
  documentsLinked: 0,
  failures: [],
}

export async function ingestCompetitorIntel(
  records: CompetitorIntelRecord[],
  options: CompetitorIngestionOptions
): Promise<CompetitorIngestionSummary> {
  const supabase = createServiceClient()
  const summary: CompetitorIngestionSummary = JSON.parse(JSON.stringify(DEFAULT_SUMMARY))
  const jobId = options.jobId
  const startedAt = new Date().toISOString()

  if (!records.length) {
    await finalizeJob(supabase, jobId, {
      status: 'succeeded',
      result_summary: { ...summary, startedAt },
    })
    return summary
  }

  for (const record of records) {
    try {
      const competitorId = await upsertCompetitor(supabase, record)

      summary.competitorsProcessed += 1

      if (record.pricePoints?.length) {
        const payload = record.pricePoints.map((point) => ({
          tenant_id: record.tenantId,
          competitor_id: competitorId,
          treatment_code: point.treatmentCode ?? null,
          treatment_name: point.treatmentName ?? null,
          price_cents: point.priceCents ?? null,
          collected_at: point.collectedAt ?? new Date().toISOString(),
          source: point.source ?? options.sourceName,
          metadata: point.metadata ?? {},
        }))

        if (payload.length) {
          const { error } = await supabase.from<CompetitorPricePoint>('competitor_price_points').insert(payload)
          if (error) {
            throw new Error(`Failed to insert price points: ${error.message}`)
          }
          summary.pricePointsInserted += payload.length
        }
      }

      if (record.touchpoints?.length) {
        const payload = record.touchpoints.map((point) => ({
          tenant_id: record.tenantId,
          competitor_id: competitorId,
          touchpoint_type: point.touchpointType,
          occurred_at: point.occurredAt ?? new Date().toISOString(),
          summary: point.summary ?? null,
          link: point.link ?? null,
          metadata: point.metadata ?? {},
        }))

        if (payload.length) {
          const { error } = await supabase.from<CompetitorTouchpoint>('competitor_touchpoints').insert(payload)
          if (error) {
            throw new Error(`Failed to insert touchpoints: ${error.message}`)
          }
          summary.touchpointsInserted += payload.length
        }
      }

      if (record.documents?.length) {
        const payload = record.documents.map((doc) => ({
          tenant_id: record.tenantId,
          competitor_id: competitorId,
          document_path: doc.documentPath,
          source: doc.source ?? options.sourceName,
          captured_at: doc.capturedAt ?? new Date().toISOString(),
          checksum: doc.checksum ?? null,
          metadata: doc.metadata ?? {},
        }))

        if (payload.length) {
          const { error } = await supabase.from<CompetitorDocument>('competitor_documents').insert(payload)
          if (error) {
            throw new Error(`Failed to insert documents: ${error.message}`)
          }
          summary.documentsLinked += payload.length
        }
      }
    } catch (error: any) {
      summary.failures.push({ competitor: record.competitor.name, error: error.message || String(error) })
    }
  }

  const status = summary.failures.length ? 'failed' : 'succeeded'

  await finalizeJob(supabase, jobId, {
    status,
    result_summary: { ...summary, sourceName: options.sourceName, startedAt },
    error_message: summary.failures.length ? summary.failures.map((f) => `${f.competitor}: ${f.error}`).join('; ') : null,
  })

  recordMetric('provider', 'competitor_intel_ingested', {
    source: options.sourceName,
    status,
    competitors: summary.competitorsProcessed,
    pricePoints: summary.pricePointsInserted,
    touchpoints: summary.touchpointsInserted,
    documents: summary.documentsLinked,
    failures: summary.failures.length,
  })

  if (summary.failures.length) {
    throw new Error(`Ingestion completed with ${summary.failures.length} failure(s)`) // allow caller to decide retry
  }

  return summary
}

async function upsertCompetitor(supabase: ReturnType<typeof createServiceClient>, record: CompetitorIntelRecord) {
  const { tenantId, competitor } = record
  const { name } = competitor
  if (!name) {
    throw new Error('Competitor name is required')
  }

  const { data: existing, error: selectError } = await supabase
    .from<Competitor>('competitors')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', name)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Failed to load competitor ${name}: ${selectError.message}`)
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from<Competitor>('competitors')
      .update({
        website: competitor.website ?? undefined,
        primary_location: competitor.primaryLocation ?? undefined,
        notes: competitor.notes ?? undefined,
        metadata: competitor.metadata ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      throw new Error(`Failed to update competitor ${name}: ${updateError.message}`)
    }
    return existing.id
  }

  const { data: inserted, error: insertError } = await supabase
    .from<Competitor>('competitors')
    .insert({
      tenant_id: tenantId,
      name,
      website: competitor.website ?? null,
      primary_location: competitor.primaryLocation ?? null,
      notes: competitor.notes ?? null,
      metadata: competitor.metadata ?? {},
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    throw new Error(`Failed to insert competitor ${name}: ${insertError?.message ?? 'unknown error'}`)
  }

  return inserted.id
}

async function finalizeJob(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string | undefined,
  updates: Partial<CompetitorIngestionJob> & { status?: any; error_message?: string | null }
) {
  if (!jobId) return

  const { error } = await supabase
    .from<CompetitorIngestionJob>('competitor_ingestion_jobs')
    .update({
      status: updates.status ?? 'succeeded',
      result_summary: updates.result_summary ?? null,
      error_message: updates.error_message ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    console.error('[competitor-intel] failed to finalize ingestion job', error)
  }
}





