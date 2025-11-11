import { NextResponse } from 'next/server'
import { queueManager } from '@/lib/queues/queue-manager'
import { getCommunicationQueueMetrics, registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { getEngagementQueueMetrics, registerEngagementQueue } from '@/lib/queues/engagement-queue'

const QUEUE_ENABLED = process.env.QUEUE_COMMUNICATIONS === 'true'

if (queueManager.isEnabled()) {
  if (QUEUE_ENABLED) {
    registerCommunicationQueue()
  }
  registerEngagementQueue()
}

export async function GET() {
  if (!queueManager.isEnabled()) {
    return NextResponse.json(
      {
        enabled: false,
        message: 'Redis not configured; queues disabled',
      },
      { status: 200 }
    )
  }

  if (!QUEUE_ENABLED) {
    return NextResponse.json(
      {
        enabled: false,
        message: 'Queue feature flag disabled',
      },
      { status: 200 }
    )
  }

  const communicationsMetrics = QUEUE_ENABLED ? await getCommunicationQueueMetrics() : null
  const engagementMetrics = await getEngagementQueueMetrics()

  return NextResponse.json({
    enabled: true,
    queues: {
      communications: {
        enabled: QUEUE_ENABLED,
        metrics: communicationsMetrics,
      },
      engagement: {
        enabled: Boolean(engagementMetrics),
        metrics: engagementMetrics,
      },
    },
  })
}


