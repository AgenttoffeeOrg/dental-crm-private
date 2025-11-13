/**
 * Form Submission Webhook Dispatcher
 * Sends webhooks to configured endpoints when forms are submitted
 * 
 * Features:
 * - Retry logic with exponential backoff
 * - HMAC signature verification
 * - Delivery logging
 * - Non-blocking (doesn't fail form submission)
 */

import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export interface FormWebhookPayload {
  event: 'form.submitted'
  form: {
    id: string
    name: string
  }
  submission: {
    id?: string
    data: Record<string, any>
    metadata: {
      ip?: string
      userAgent?: string
      referrer?: string
      submittedAt: string
    }
  }
  contact: {
    id: string
    email?: string
    name?: string
  }
  deal?: {
    id: string
    title: string
    value?: number
  }
  timestamp: string
}

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
}

/**
 * Get active webhooks for form submissions
 */
async function getFormWebhooks(tenantId: string): Promise<WebhookEndpoint[]> {
  const supabase = createServiceClient()

  const { data: webhooks, error } = await supabase
    .from('marketing_audit_webhooks')
    .select('id, url, events, secret, active')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .contains('events', ['form.submitted'])

  if (error) {
    console.error('[FormWebhooks] Error fetching webhooks:', error)
    return []
  }

  return (webhooks || []).map(w => ({
    id: w.id,
    url: w.url,
    events: w.events,
    secret: w.secret,
    active: w.active,
  }))
}

/**
 * Generate HMAC-SHA256 signature for webhook verification
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

/**
 * Send webhook with retry logic
 */
async function sendWebhook(
  endpoint: WebhookEndpoint,
  payload: FormWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  const maxRetries = 3
  const baseDelay = 1000 // 1 second

  const payloadString = JSON.stringify(payload)
  const signature = generateSignature(payloadString, endpoint.secret)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Id': endpoint.id,
          'User-Agent': 'DentalCRM-Webhook/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (response.ok) {
        // Log success
        await logWebhookDelivery(endpoint.id, true, null)
        return { success: true }
      }

      // If not 2xx, retry
      const errorText = await response.text().catch(() => 'Unknown error')
      console.warn(
        `[FormWebhooks] Attempt ${attempt + 1} failed for ${endpoint.url}: ${response.status} - ${errorText}`
      )

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        await sleep(delay)
      } else {
        await logWebhookDelivery(endpoint.id, false, `HTTP ${response.status}: ${errorText}`)
      }
    } catch (error: any) {
      console.error(`[FormWebhooks] Attempt ${attempt + 1} error for ${endpoint.url}:`, error.message)

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await sleep(delay)
      } else {
        await logWebhookDelivery(endpoint.id, false, error.message)
      }
    }
  }

  return { success: false, error: 'Failed after max retries' }
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(
  webhookId: string,
  success: boolean,
  error: string | null
): Promise<void> {
  const supabase = createServiceClient()

  try {
    // Get current counts first
    const { data: current } = await supabase
      .from('marketing_audit_webhooks')
      .select('total_deliveries, failed_deliveries')
      .eq('id', webhookId)
      .single()

    if (!current) return

    await supabase
      .from('marketing_audit_webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_success_at: success ? new Date().toISOString() : undefined,
        last_error: error,
        total_deliveries: (current.total_deliveries || 0) + 1,
        failed_deliveries: success
          ? current.failed_deliveries || 0
          : (current.failed_deliveries || 0) + 1,
      })
      .eq('id', webhookId)
  } catch (err) {
    console.error('[FormWebhooks] Error logging delivery:', err)
    // Don't throw - logging failures shouldn't break webhook delivery
  }
}

/**
 * Sleep helper for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Dispatch form submission webhook to all configured endpoints
 */
export async function dispatchFormSubmissionWebhook(params: {
  formId: string
  formName: string
  tenantId: string
  submissionId?: string
  submissionData: Record<string, any>
  contactId: string
  contactEmail?: string
  contactName?: string
  dealId?: string
  dealTitle?: string
  dealValue?: number
  metadata: {
    ip?: string
    userAgent?: string
    referrer?: string
  }
}): Promise<void> {
  const {
    formId,
    formName,
    tenantId,
    submissionId,
    submissionData,
    contactId,
    contactEmail,
    contactName,
    dealId,
    dealTitle,
    dealValue,
    metadata,
  } = params

  // Get active webhooks for this tenant
  const webhooks = await getFormWebhooks(tenantId)

  if (webhooks.length === 0) {
    return // No webhooks configured
  }

  // Build webhook payload
  const payload: FormWebhookPayload = {
    event: 'form.submitted',
    form: {
      id: formId,
      name: formName,
    },
    submission: {
      id: submissionId,
      data: submissionData,
      metadata: {
        ...metadata,
        submittedAt: new Date().toISOString(),
      },
    },
    contact: {
      id: contactId,
      email: contactEmail,
      name: contactName,
    },
    deal: dealId
      ? {
          id: dealId,
          title: dealTitle || `${contactName || 'Contact'} - ${formName}`,
          value: dealValue,
        }
      : undefined,
    timestamp: new Date().toISOString(),
  }

  // Send to all webhooks (non-blocking)
  const results = await Promise.allSettled(
    webhooks.map(webhook => sendWebhook(webhook, payload))
  )

  const delivered = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - delivered

  if (delivered > 0 || failed > 0) {
    console.log(
      `[FormWebhooks] Dispatched to ${webhooks.length} webhooks: ${delivered} delivered, ${failed} failed`
    )
  }
}

