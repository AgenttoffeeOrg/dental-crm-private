import { Job } from 'bullmq'
import { subDays } from 'date-fns'

import { queueManager } from './queue-manager'
import { createServiceClient } from '@/lib/supabase-server'
import { runLearningLoop } from '@/lib/services/learning-loop'

const LEARNING_LOOP_QUEUE = 'analytics:learning-loop'
const LEARNING_LOOP_DLQ = 'analytics:deadletter'

export type LearningLoopJob = {
  type: 'learning-loop:run'
  tenantId?: string
  targetDate?: string
  triggeredBy?: string | null
}

export function registerLearningLoopQueue() {
  queueManager.registerQueue<LearningLoopJob>({
    name: LEARNING_LOOP_QUEUE,
    deadLetterQueue: LEARNING_LOOP_DLQ,
    processor: async (job: Job<LearningLoopJob>) => {
      if (job.data.type !== 'learning-loop:run') {
        throw new Error(`Unsupported analytics job type: ${job.data.type}`)
      }

      const targetDate = job.data.targetDate ? new Date(job.data.targetDate) : subDays(new Date(), 1)

      if (job.data.tenantId) {
        await runLearningLoop({
          tenantId: job.data.tenantId,
          targetDate,
        })
        return
      }

      const supabase = createServiceClient()
      const { data: tenants, error } = await supabase.from('tenants').select('id')

      if (error) {
        throw error
      }

      for (const tenant of tenants ?? []) {
        if (!tenant.id) {
          continue
        }
        await runLearningLoop({
          tenantId: tenant.id,
          targetDate,
        })
      }
    },
  })

  queueManager.registerQueue({
    name: LEARNING_LOOP_DLQ,
    processor: async () => {
      // Dead letter queue is inspected manually
    },
  })
}

export async function enqueueLearningLoop(job: LearningLoopJob) {
  if (!queueManager.isEnabled()) {
    throw new Error('Queues are disabled; Redis not configured')
  }

  const queue = queueManager.getQueue(LEARNING_LOOP_QUEUE)
  await queue.add(job.type, job, {
    jobId: job.tenantId ? `${job.type}:${job.tenantId}:${job.targetDate ?? 'auto'}` : undefined,
  })
}






