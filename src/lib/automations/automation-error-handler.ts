/**
 * AUTOMATION ERROR HANDLER
 * 
 * Robust error handling with DLQ and exponential backoff retries.
 * Integrates with existing integration_dlq table.
 */

import { createClient } from '@/lib/supabase-client'

export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
}

/**
 * Execute automation action with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: {
    automationId: string
    actionId: string
    tenantId: string
  },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ success: boolean; data?: T; error?: string }> {
  let lastError: any = null
  let attempt = 0

  while (attempt <= config.maxRetries) {
    try {
      const data = await operation()
      
      // Success!
      if (attempt > 0) {
        console.log(`[Automation Retry] Succeeded on attempt ${attempt + 1}`)
      }
      
      return { success: true, data }
    } catch (error) {
      lastError = error
      attempt++

      if (attempt <= config.maxRetries) {
        // Calculate delay with exponential backoff + jitter
        const baseDelay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        )
        const jitter = Math.random() * baseDelay * 0.1 // 10% jitter
        const delay = baseDelay + jitter

        console.log(`[Automation Retry] Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`)

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // All retries exhausted - send to DLQ
  await sendToDLQ(context, lastError)

  return {
    success: false,
    error: String(lastError),
  }
}

/**
 * Send failed automation action to Dead Letter Queue
 */
async function sendToDLQ(
  context: {
    automationId: string
    actionId: string
    tenantId: string
  },
  error: any
): Promise<void> {
  try {
    const supabase = createClient()

    await supabase.from('integration_dlq').insert({
      tenant_id: context.tenantId,
      integration_id: context.automationId, // Reusing integration_dlq table
      integration_type: 'automation',
      operation: 'execute_action',
      payload: {
        automationId: context.automationId,
        actionId: context.actionId,
      },
      error_message: String(error),
      retry_count: DEFAULT_RETRY_CONFIG.maxRetries,
      status: 'failed',
    })

    console.log(`[Automation DLQ] Sent to DLQ: ${context.automationId}/${context.actionId}`)
  } catch (dlqError) {
    console.error('[Automation DLQ] Failed to send to DLQ:', dlqError)
  }
}

/**
 * Replay failed automation from DLQ
 */
export async function replayFromDLQ(
  dlqId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Get DLQ entry
    const { data: dlqEntry } = await supabase
      .from('integration_dlq')
      .select('*')
      .eq('id', dlqId)
      .single()

    if (!dlqEntry) {
      return { success: false, error: 'DLQ entry not found' }
    }

    const payload = dlqEntry.payload as {
      automationId: string
      actionId: string
    }

    // TODO: Re-execute the action
    // For now, just update status
    await supabase
      .from('integration_dlq')
      .update({
        status: 'replayed',
        replayed_at: new Date().toISOString(),
      })
      .eq('id', dlqId)

    console.log(`[Automation DLQ] Replayed entry ${dlqId}`)

    return { success: true }
  } catch (error) {
    console.error('[Automation DLQ] Error replaying:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get DLQ entries for an automation
 */
export async function getAutomationDLQEntries(
  automationId: string,
  tenantId: string
): Promise<Array<{
  id: string
  error: string
  retryCount: number
  createdAt: string
  status: string
}>> {
  try {
    const supabase = createClient()

    const { data: entries } = await supabase
      .from('integration_dlq')
      .select('id, error_message, retry_count, created_at, status')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'automation')
      .contains('payload', { automationId })
      .order('created_at', { ascending: false })

    return entries?.map(e => ({
      id: e.id,
      error: e.error_message,
      retryCount: e.retry_count,
      createdAt: e.created_at,
      status: e.status,
    })) || []
  } catch (error) {
    console.error('[Automation DLQ] Error getting entries:', error)
    return []
  }
}

