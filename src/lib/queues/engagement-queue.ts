import { Job } from 'bullmq'
import { queueManager } from './queue-manager'
import { CampaignEngine } from '@/lib/engagement/campaign-engine'

export const ENGAGEMENT_QUEUE_NAME = 'engagement:campaigns'
export const ENGAGEMENT_DEAD_LETTER_QUEUE = 'engagement:deadletter'

type ProcessEnrollmentJob = {
  type: 'process-enrollment'
  enrollmentId: string
}

type EngagementJob = ProcessEnrollmentJob

let campaignEngine: CampaignEngine | null = null

function getCampaignEngine(): CampaignEngine {
  if (!campaignEngine) {
    campaignEngine = new CampaignEngine(async (enrollmentId: string, delayMs = 0) => {
      const queue = queueManager.getQueue(ENGAGEMENT_QUEUE_NAME)
      await queue.add(
        'process-enrollment',
        {
          type: 'process-enrollment',
          enrollmentId,
        },
        {
          delay: Math.max(0, delayMs),
        }
      )
    })
  }
  return campaignEngine
}

export function registerEngagementQueue() {
  queueManager.registerQueue<EngagementJob>({
    name: ENGAGEMENT_QUEUE_NAME,
    deadLetterQueue: ENGAGEMENT_DEAD_LETTER_QUEUE,
    processor: async (job: Job<EngagementJob>) => {
      const engine = getCampaignEngine()
      const jobType = job.data?.type || job.name

      switch (jobType) {
        case 'process-enrollment':
          if (!job.data?.enrollmentId) {
            throw new Error('Enrollment ID missing in job payload')
          }
          await engine.processEnrollment(job.data.enrollmentId)
          break
        default:
          throw new Error(`Unsupported engagement job type: ${jobType}`)
      }
    },
  })

  queueManager.registerQueue({
    name: ENGAGEMENT_DEAD_LETTER_QUEUE,
    processor: async () => {
      // Dead letter queue inspected manually
    },
  })
}

export async function enqueueEngagementEnrollment(enrollmentId: string, delayMs = 0) {
  registerEngagementQueue()

  const queue = queueManager.getQueue(ENGAGEMENT_QUEUE_NAME)
  await queue.add(
    'process-enrollment',
    {
      type: 'process-enrollment',
      enrollmentId,
    },
    {
      delay: Math.max(0, delayMs),
    }
  )
}

export async function getEngagementQueueMetrics() {
  if (!queueManager.isEnabled()) {
    return null
  }
  try {
    return await queueManager.getQueueMetrics(ENGAGEMENT_QUEUE_NAME)
  } catch (error) {
    console.error('[ENGAGEMENT QUEUE] Failed to fetch metrics', error)
    return null
  }
}


