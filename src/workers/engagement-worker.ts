import 'dotenv/config'
import { getRedisClient } from '@/lib/redis'
import { registerEngagementQueue } from '@/lib/queues/engagement-queue'

async function bootstrap() {
  const redis = getRedisClient()
  if (!redis) {
    console.error('[Engagement Worker] Redis not configured. Exiting.')
    process.exit(1)
  }

  registerEngagementQueue()

  console.log('[Engagement Worker] Autonomous engagement worker started')
}

// Use top-level await instead of promise chain
try {
  await bootstrap()
} catch (error) {
  console.error('[Engagement Worker] Fatal error', error)
  process.exit(1)
}





