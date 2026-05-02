import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext } from '@/lib/api/context'
import { queueManager } from '@/lib/queues/queue-manager'
import { enqueueLearningLoop, registerLearningLoopQueue } from '@/lib/queues/analytics-learning-loop'
import { runLearningLoop } from '@/lib/services/learning-loop'

const BodySchema = z.object({
  tenantId: z.string().uuid().optional(),
  targetDate: z.string().datetime({ offset: true }).optional(),
  mode: z.enum(['async', 'sync']).optional(),
})

const QUEUE_ENABLED = process.env.QUEUE_ANALYTICS === 'true'

export async function POST(request: NextRequest) {
  try {
    const apiContext = await getApiRequestContext()
    const payload = await request.json()
    const parseResult = BodySchema.safeParse(payload)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { tenantId: tenantIdFromBody, targetDate, mode } = parseResult.data
    const resolvedTenantId = tenantIdFromBody ?? apiContext.tenantId

    if (!resolvedTenantId) {
      return NextResponse.json(
        { error: 'Unable to determine tenant. Provide tenantId explicitly.' },
        { status: 400 }
      )
    }

    const useQueues = queueManager.isEnabled() && QUEUE_ENABLED && mode !== 'sync'

    if (useQueues) {
      registerLearningLoopQueue()
      await enqueueLearningLoop({
        type: 'learning-loop:run',
        tenantId: resolvedTenantId,
        targetDate: targetDate ?? undefined,
        triggeredBy: apiContext.user.id ?? null,
      })

      return NextResponse.json(
        {
          data: {
            queued: true,
            tenantId: resolvedTenantId,
            targetDate: targetDate ?? null,
          },
        },
        { status: 202 }
      )
    }

    const result = await runLearningLoop({
      tenantId: resolvedTenantId,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('[system.analytics.recompute] failed', error)
    return NextResponse.json(
      {
        error: 'Failed to execute learning loop',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}






