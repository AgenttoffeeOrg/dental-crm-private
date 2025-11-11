import { Job } from 'bullmq'
import { queueManager } from './queue-manager'
import { dispatchEmail, dispatchSms, dispatchVoiceCall, dispatchWhatsApp } from '@/lib/communications/dispatcher'

export const COMMUNICATION_QUEUE_NAME = 'communications:dispatch'
export const COMMUNICATION_DEAD_LETTER_QUEUE = 'communications:deadletter'

type EmailJobData = {
  type: 'email'
  context: {
    tenantId: string
    userId?: string
    contactId?: string | null
    dealId?: string | null
  }
  payload: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    html: string
  }
}

type SmsJobData = {
  type: 'sms'
  context: {
    tenantId: string
    userId?: string
    contactId?: string | null
    dealId?: string | null
  }
  to: string
  message: string
}

type WhatsAppJobData = {
  type: 'whatsapp'
  context: {
    tenantId: string
    userId?: string
    contactId?: string | null
    dealId?: string | null
  }
  to: string
  message: string
  mediaUrl?: string
}

type VoiceJobData = {
  type: 'voice'
  context: {
    tenantId: string
    userId?: string
    contactId?: string | null
    dealId?: string | null
  }
  to: string
  record?: boolean
}

type CommunicationJob = EmailJobData | SmsJobData | WhatsAppJobData | VoiceJobData

export function registerCommunicationQueue() {
  queueManager.registerQueue<CommunicationJob>({
    name: COMMUNICATION_QUEUE_NAME,
    deadLetterQueue: COMMUNICATION_DEAD_LETTER_QUEUE,
    processor: async (job: Job<CommunicationJob>) => {
      switch (job.data.type) {
        case 'email':
          return handleEmailJob(job)
        case 'sms':
          return handleSmsJob(job)
        case 'whatsapp':
          return handleWhatsappJob(job)
        case 'voice':
          return handleVoiceJob(job)
        default:
          throw new Error(`Unsupported communication job type: ${(job.data as any).type}`)
      }
    },
  })

  queueManager.registerQueue({
    name: COMMUNICATION_DEAD_LETTER_QUEUE,
    processor: async () => {
      // Dead letter queue is inspected manually; no automatic retry.
    },
  })
}

async function handleEmailJob(job: Job<EmailJobData>) {
  return dispatchEmail({
    context: job.data.context,
    to: job.data.payload.to,
    cc: job.data.payload.cc,
    bcc: job.data.payload.bcc,
    subject: job.data.payload.subject,
    html: job.data.payload.html,
  })
}

async function handleSmsJob(job: Job<SmsJobData>) {
  return dispatchSms({
    context: job.data.context,
    to: job.data.to,
    message: job.data.message,
  })
}

async function handleWhatsappJob(job: Job<WhatsAppJobData>) {
  return dispatchWhatsApp({
    context: job.data.context,
    to: job.data.to,
    message: job.data.message,
    mediaUrl: job.data.mediaUrl,
  })
}

async function handleVoiceJob(job: Job<VoiceJobData>) {
  return dispatchVoiceCall({
    context: job.data.context,
    to: job.data.to,
    record: job.data.record,
  })
}

export async function enqueueCommunication(job: CommunicationJob) {
  if (!queueManager.isEnabled()) {
    throw new Error('Queues are disabled; Redis not configured')
  }
  const queue = queueManager.getQueue(COMMUNICATION_QUEUE_NAME)
  await queue.add(job.type, job)
}

export async function getCommunicationQueueMetrics() {
  if (!queueManager.isEnabled()) {
    return null
  }
  return queueManager.getQueueMetrics(COMMUNICATION_QUEUE_NAME)
}

