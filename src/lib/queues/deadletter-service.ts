import { queueManager } from './queue-manager'

export interface DeadLetterJob {
  id: string
  name: string
  data: {
    failedQueue?: string
    payload?: any
    attemptsMade?: number
    failedReason?: string
    timestamp?: number
    [key: string]: any
  }
  failedReason?: string
  attemptsMade?: number
  timestamp?: number
  stacktrace?: string[]
}

export async function listDeadLetterJobs(queueName: string, limit = 50): Promise<DeadLetterJob[]> {
  const jobs = await queueManager.listJobs(queueName, ['waiting', 'delayed'], 0, limit - 1)
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    stacktrace: job.stacktrace,
  }))
}

export async function replayDeadLetterJob(deadLetterQueue: string, jobId: string) {
  const queue = queueManager.getQueue(deadLetterQueue)
  const job = await queue.getJob(jobId)

  if (!job) {
    throw new Error(`Dead letter job ${jobId} not found`)
  }

  const jobData = job.data || {}
  const targetQueueName = jobData.failedQueue

  if (!targetQueueName) {
    throw new Error('Dead letter job missing failedQueue reference')
  }

  const payload = jobData.payload
  if (!payload) {
    throw new Error('Dead letter job missing payload')
  }

  const targetQueue = queueManager.getQueue(targetQueueName)
  const jobName = typeof payload.type === 'string' ? payload.type : 'retry'

  await targetQueue.add(jobName, payload)
  await job.remove()
}

export async function discardDeadLetterJob(deadLetterQueue: string, jobId: string) {
  const queue = queueManager.getQueue(deadLetterQueue)
  const job = await queue.getJob(jobId)
  if (job) {
    await job.remove()
  }
}







