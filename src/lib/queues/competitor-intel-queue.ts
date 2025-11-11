import { Job } from 'bullmq'

import { queueManager } from './queue-manager'
import { ingestCompetitorIntel, CompetitorIntelRecord, CompetitorIngestionOptions } from '../services/competitor-intel'
import { recordMetric } from '../monitoring/metrics'

export const COMPETITOR_INTEL_QUEUE_NAME = 'competitor:intel'
const COMPETITOR_INTEL_DLQ = 'competitor:intel:deadletter'

const QUEUE_ENABLED = process.env.QUEUE_COMPETITOR_INTEL === 'true'

export interface CompetitorIntelJobData {
  tenantId: string
  sourceName: string
  sourceType?: CompetitorIngestionOptions['sourceType']
  records: CompetitorIntelRecord[]
  jobId?: string
}

type CompetitorIntelJob = {
  type: 'ingest'
  payload: CompetitorIntelJobData
}

export function registerCompetitorIntelQueue() {
  if (!queueManager.isEnabled() || !QUEUE_ENABLED) {
    return
  }

  queueManager.registerQueue<CompetitorIntelJob>({
    name: COMPETITOR_INTEL_QUEUE_NAME,
    deadLetterQueue: COMPETITOR_INTEL_DLQ,
    processor: async (job: Job<CompetitorIntelJob>) => {
      if (job.data.type !== 'ingest') {
        throw new Error(`Unsupported competitor intel job type: ${job.data.type}`)
      }

      const { tenantId, sourceName, sourceType, records, jobId } = job.data.payload
      if (!records?.length) {
        return { summary: { competitorsProcessed: 0 } }
      }

      try {
        if (jobId) {
          await markJobProcessing(jobId)
        }
        const summary = await ingestCompetitorIntel(records, {
          jobId,
          sourceName,
          sourceType,
        })

        recordMetric('queue', 'competitor_ingest_success', {
          queue: COMPETITOR_INTEL_QUEUE_NAME,
          jobId: job.id,
          tenantId,
          competitors: summary.competitorsProcessed,
        })

        return { summary }
      } catch (error: any) {
        recordMetric('queue', 'competitor_ingest_failure', {
          queue: COMPETITOR_INTEL_QUEUE_NAME,
          jobId: job.id,
          tenantId,
          error: error?.message ?? 'unknown error',
        })
        throw error
      }
    },
  })

  queueManager.registerQueue({
    name: COMPETITOR_INTEL_DLQ,
    processor: async () => {
      // DLQ inspected manually via reliability dashboard
    },
  })
}

export async function enqueueCompetitorIntelJob(job: CompetitorIntelJobData) {
  if (!queueManager.isEnabled()) {
    throw new Error('Queues are disabled; configure Redis to enable competitor ingestion queue')
  }

  if (!QUEUE_ENABLED) {
    throw new Error('Competitor intel queue is disabled (set QUEUE_COMPETITOR_INTEL=true)')
  }

  registerCompetitorIntelQueue()
  const queue = queueManager.getQueue(COMPETITOR_INTEL_QUEUE_NAME)
  await queue.add('ingest', { type: 'ingest', payload: job })
}

async function markJobProcessing(jobId: string) {
  try {
    const supabase = (await import('../supabase-server')).createServiceClient()
    await supabase
      .from('competitor_ingestion_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (error) {
    console.error('[competitor-intel] failed to mark job processing', error)
  }
}
