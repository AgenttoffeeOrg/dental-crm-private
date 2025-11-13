import 'dotenv/config'
import { queueManager } from '@/lib/queues/queue-manager'
import { registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { getRedisClient } from '@/lib/redis'

async function bootstrap() {
  const redis = getRedisClient()
  if (!redis) {
    console.error('[Worker] Redis not configured. Exiting.')
    process.exit(1)
  }

  registerCommunicationQueue()

  console.log('[Worker] Communication worker started')
}

bootstrap().catch((error) => {
  console.error('[Worker] Fatal error', error)
  process.exit(1)
})





