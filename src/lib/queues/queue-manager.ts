import { Queue, Worker, JobsOptions, QueueEvents, MetricsTime, Processor, Job } from 'bullmq'
import { getRedisClient } from '@/lib/redis'
import { trackQueueMetric } from '@/lib/monitoring/metrics'

type QueueSchedulerCtor = new (
  queueName: string,
  options: { connection: ReturnType<typeof getRedisClient> }
) => { close?: () => Promise<void> }

let QueueSchedulerClass: QueueSchedulerCtor | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const maybeModule = require('bullmq') as { QueueScheduler?: QueueSchedulerCtor }
  if (maybeModule.QueueScheduler) {
    QueueSchedulerClass = maybeModule.QueueScheduler
  } else {
    console.warn('[Queue] QueueScheduler not available in current bullmq version; continuing without scheduler')
  }
} catch (error) {
  console.warn('[Queue] Failed to load QueueScheduler from bullmq; continuing without scheduler', error)
}

export interface QueueDefinition<T = any> {
  name: string
  processor: Processor<T, any, string>
  defaultJobOptions?: JobsOptions
  deadLetterQueue?: string
}

export class QueueManager {
  private static instance: QueueManager | null = null
  private queues: Map<string, Queue> = new Map()
  private queueEvents: Map<string, QueueEvents> = new Map()
  private scheduler: Map<string, InstanceType<QueueSchedulerCtor>> = new Map()
  private workers: Map<string, Worker> = new Map()

  private constructor() {}

  static getInstance() {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager()
    }
    return QueueManager.instance
  }

  isEnabled(): boolean {
    return Boolean(getRedisClient())
  }

  registerQueue<T>(definition: QueueDefinition<T>) {
    if (!this.isEnabled()) {
      return
    }

    if (this.queues.has(definition.name)) {
      return
    }

    const queue = new Queue(definition.name, {
      connection: getRedisClient()!,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        ...definition.defaultJobOptions,
      },
    })
    this.queues.set(definition.name, queue)

    if (QueueSchedulerClass) {
      const scheduler = new QueueSchedulerClass(definition.name, {
        connection: getRedisClient()!,
      })
      this.scheduler.set(definition.name, scheduler)
    }

    const queueEvents = new QueueEvents(definition.name, {
      connection: getRedisClient()!,
    })
    queueEvents.on('completed', ({ jobId }) => {
      trackQueueMetric(definition.name, 'completed', { jobId })
    })
    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      trackQueueMetric(definition.name, 'failed', { jobId, reason: failedReason })

      if (definition.deadLetterQueue) {
        const job = await queue.getJob(jobId!)
        if (job) {
          const payload = job.toJSON()
          const deadLetter = this.getQueue(definition.deadLetterQueue)
          await deadLetter.add('dead-letter', {
            failedQueue: definition.name,
            payload: payload.data,
            attemptsMade: payload.attemptsMade,
            failedReason,
            timestamp: Date.now(),
          })
        }
      }
    })
    this.queueEvents.set(definition.name, queueEvents)

    const worker = new Worker(definition.name, definition.processor, {
      connection: getRedisClient()!,
      concurrency: Number(process.env.QUEUE_CONCURRENCY || 5),
      limiter: process.env.QUEUE_RATE_LIMIT
        ? {
            max: Number(process.env.QUEUE_RATE_LIMIT),
            duration: 1000,
          }
        : undefined,
    })
    worker.on('error', (err) => {
      console.error('[Queue] Worker error', { queue: definition.name, error: err })
    })
    worker.on('active', ({ id }) => {
      trackQueueMetric(definition.name, 'active', { jobId: id })
    })
    this.workers.set(definition.name, worker)
  }

  getQueue(name: string): Queue {
    const queue = this.queues.get(name)
    if (!queue) {
      throw new Error(`Queue ${name} not registered`)
    }
    return queue
  }

  async getQueueMetrics(name: string) {
    const queue = this.getQueue(name)
    const counts = await queue.getJobCounts()
    const metrics = await queue.getMetrics('completed', MetricsTime.ONE_WEEK)

    return {
      name,
      counts,
      metrics,
    }
  }

  async getQueueSnapshot(name: string) {
    const queue = this.getQueue(name)
    const counts = await queue.getJobCounts('waiting', 'delayed', 'failed', 'completed', 'active', 'paused')

    const [oldestWaiting, oldestDelayed] = await Promise.all([
      this.getOldestJob(queue, 'waiting'),
      this.getOldestJob(queue, 'delayed'),
    ])

    const workers = await queue.getWorkers()

    return {
      name,
      counts,
      oldestWaitingAgeSeconds: oldestWaiting,
      oldestDelayedAgeSeconds: oldestDelayed,
      workers: workers.map((worker) => ({
        id: worker.id,
        name: worker.name,
        addr: worker.addr,
        age: worker.age,
        idle: worker.idle,
      })),
    }
  }

  private async getOldestJob(queue: Queue, type: 'waiting' | 'delayed') {
    try {
      const jobs: Job[] = await queue.getJobs([type], 0, 0, true)
      if (!jobs.length) {
        return null
      }
      const job = jobs[0]
      const timestamp = job.timestamp || job.processedOn || Date.now()
      return Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
    } catch (error) {
      console.error('[Queue] Failed to resolve oldest job age', { queue: queue.name, type, error })
      return null
    }
  }

  async listJobs(name: string, type: ('active' | 'waiting' | 'completed' | 'failed' | 'delayed')[], start = 0, end = 20) {
    const queue = this.getQueue(name)
    const jobs = await queue.getJobs(type, start, end, false)
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      stacktrace: job.stacktrace,
    }))
  }

  async removeJob(name: string, jobId: string) {
    const queue = this.getQueue(name)
    const job = await queue.getJob(jobId)
    if (job) {
      await job.remove()
    }
  }
}

export const queueManager = QueueManager.getInstance()

