import Redis from 'ioredis'

let redis: Redis | null = null

export interface RedisOptions {
  host?: string
  port?: number
  password?: string
  tls?: boolean
}

function buildRedisUrl(): string | undefined {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }

  const host = process.env.REDIS_HOST
  const port = process.env.REDIS_PORT
  if (host && port) {
    const password = process.env.REDIS_PASSWORD
    const authPart = password ? `:${password}@` : ''
    return `redis://${authPart}${host}:${port}`
  }

  return undefined
}

export function getRedisClient(): Redis | null {
  if (redis) {
    return redis
  }

  const redisUrl = buildRedisUrl()
  if (!redisUrl) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Redis] REDIS_URL / REDIS_HOST not configured; queue features disabled')
    }
    return null
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (attempts) => Math.min(attempts * 50, 2000),
  })

  redis.on('error', (err) => {
    console.error('[Redis] connection error:', err)
  })

  redis.on('connect', () => {
    console.log('[Redis] connected')
  })

  return redis
}

export function getRedisConnectionOptions(): Redis.RedisOptions | undefined {
  const redisUrl = buildRedisUrl()
  if (!redisUrl) return undefined
  return { connectionName: 'dental-crm' }
}



