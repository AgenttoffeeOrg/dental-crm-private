import 'dotenv/config'

import { queueManager } from '@/lib/queues/queue-manager'
import { registerCompetitorIntelQueue } from '@/lib/queues/competitor-intel-queue'
import { getRedisClient } from '@/lib/redis'

async function bootstrap() {
  const redis = getRedisClient()
  if (!redis) {
    console.error('[competitor-intel-worker] Redis not configured. Exiting.')
    process.exit(1)
  }

  registerCompetitorIntelQueue()

  console.log('[competitor-intel-worker] Competitor intelligence worker started')
}

// Use top-level await instead of promise chain
try {
  await bootstrap()
} catch (error) {
  console.error('[competitor-intel-worker] Fatal error', error)
  process.exit(1)
}



