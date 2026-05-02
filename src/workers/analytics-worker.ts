import 'dotenv/config'

import { queueManager } from '@/lib/queues/queue-manager'
import { registerLearningLoopQueue } from '@/lib/queues/analytics-learning-loop'

async function bootstrap() {
  if (!queueManager.isEnabled()) {
    console.warn('[Analytics Worker] Redis connection not available. Exiting.')
    process.exit(0)
  }

  registerLearningLoopQueue()
  console.log('[Analytics Worker] Learning loop queue registered and ready.')
}

// Use top-level await instead of promise chain
try {
  await bootstrap()
} catch (error) {
  console.error('[Analytics Worker] Failed to bootstrap', error)
  process.exit(1)
}




