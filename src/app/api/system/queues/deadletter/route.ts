import { NextRequest, NextResponse } from 'next/server'

import { queueManager } from '@/lib/queues/queue-manager'
import {
  COMMUNICATION_DEAD_LETTER_QUEUE,
  registerCommunicationQueue,
} from '@/lib/queues/communication-queue'
import {
  ENGAGEMENT_DEAD_LETTER_QUEUE,
  registerEngagementQueue,
} from '@/lib/queues/engagement-queue'
import { listDeadLetterJobs, replayDeadLetterJob, discardDeadLetterJob } from '@/lib/queues/deadletter-service'
import { getApiRequestContext, ApiContextError } from '@/lib/api/context'

const DEAD_LETTER_ALIAS: Record<string, string> = {
  communications: COMMUNICATION_DEAD_LETTER_QUEUE,
  engagement: ENGAGEMENT_DEAD_LETTER_QUEUE,
}

if (queueManager.isEnabled()) {
  registerCommunicationQueue()
  registerEngagementQueue()
}

function resolveDeadLetterQueue(param?: string | null) {
  if (!param) return null
  if (DEAD_LETTER_ALIAS[param]) {
    return DEAD_LETTER_ALIAS[param]
  }
  return param
}

async function requireQueueAdmin() {
  try {
    const context = await getApiRequestContext()
    const allowedRoles = ['owner', 'admin']
    if (!allowedRoles.includes(context.membership.role)) {
      throw new ApiContextError(403, 'Admin role required')
    }
    return context
  } catch (error) {
    if (error instanceof ApiContextError) {
      throw error
    }
    throw new ApiContextError(500, 'Failed to verify permissions')
  }
}

export async function GET(request: NextRequest) {
  if (!queueManager.isEnabled()) {
    return NextResponse.json(
      { enabled: false, message: 'Queues disabled' },
      { status: 200 }
    )
  }

  try {
    await requireQueueAdmin()
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
  }

  const url = new URL(request.url)
  const queueParam = url.searchParams.get('queue')
  const limitParam = url.searchParams.get('limit')

  const deadLetterQueue = resolveDeadLetterQueue(queueParam)

  if (!deadLetterQueue) {
    return NextResponse.json(
      { error: 'Missing queue parameter' },
      { status: 400 }
    )
  }

  try {
    const limit = limitParam ? Math.min(Number(limitParam), 200) : 50
    const jobs = await listDeadLetterJobs(deadLetterQueue, limit)
    return NextResponse.json(
      {
        queue: deadLetterQueue,
        jobs,
        count: jobs.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[deadletter] Failed to list jobs', error)
    return NextResponse.json(
      { error: 'Failed to list dead-letter jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!queueManager.isEnabled()) {
    return NextResponse.json(
      { enabled: false, message: 'Queues disabled' },
      { status: 200 }
    )
  }

  try {
    await requireQueueAdmin()
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
  }

  let body: any

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body?.action
  const queueParam = body?.queue
  const jobId = body?.jobId

  if (!action || !jobId || !queueParam) {
    return NextResponse.json(
      { error: 'action, queue and jobId are required' },
      { status: 400 }
    )
  }

  const deadLetterQueue = resolveDeadLetterQueue(queueParam)

  if (!deadLetterQueue) {
    return NextResponse.json(
      { error: 'Unknown dead-letter queue' },
      { status: 400 }
    )
  }

  try {
    if (action === 'replay') {
      await replayDeadLetterJob(deadLetterQueue, jobId)
    } else if (action === 'discard') {
      await discardDeadLetterJob(deadLetterQueue, jobId)
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    return NextResponse.json(
      {
        success: true,
        action,
        jobId,
        queue: deadLetterQueue,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[deadletter] Action failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Dead-letter action failed' },
      { status: 500 }
    )
  }
}



