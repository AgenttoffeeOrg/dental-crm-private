/**
 * CALL/VOICESTACK AUTOMATION MONITORS
 * 
 * Monitors call events and emits automation triggers:
 * - Missed calls → auto-create task
 * - Voicemails → transcribe & notify
 * - Long calls → flag as hot lead
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// CALL EVENT PROCESSORS
// =====================================================

/**
 * Handle missed call event
 */
export async function handleMissedCall(
  callId: string,
  tenantId: string,
  phoneNumber: string,
  contactId?: string
): Promise<{ taskCreated: boolean; taskId?: string }> {
  try {
    const supabase = createClient()

    // Emit CALL.MISSED event
    await events.callMissed({
      callId,
      contactId,
      tenantId,
      phoneNumber,
      missedAt: new Date().toISOString(),
    })

    // Auto-create callback task (unless automation handles it)
    // This is a fallback in case no automation is configured
    if (contactId) {
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          tenant_id: tenantId,
          title: '📞 Missed Call - Call Back',
          description: `Missed call from ${phoneNumber}`,
          contact_id: contactId,
          priority: 'high',
          task_type: 'call',
          status: 'open',
          auto_created: true,
          due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        })
        .select('id')
        .single()

      if (task) {
        console.log(`[Call Monitor] Created callback task ${task.id} for missed call`)
        return { taskCreated: true, taskId: task.id }
      }
    }

    return { taskCreated: false }
  } catch (error) {
    console.error('[Call Monitor] Error handling missed call:', error)
    return { taskCreated: false }
  }
}

/**
 * Handle voicemail received
 */
export async function handleVoicemailReceived(
  callId: string,
  tenantId: string,
  phoneNumber: string,
  duration: number,
  transcription?: string,
  contactId?: string
): Promise<{ notified: boolean }> {
  try {
    // Emit CALL.VOICEMAIL_RECEIVED event
    await events.callVoicemailReceived({
      callId,
      contactId,
      tenantId,
      phoneNumber,
      duration,
      transcription,
    })

    console.log(`[Call Monitor] Voicemail received: ${phoneNumber}, duration: ${duration}s`)

    return { notified: true }
  } catch (error) {
    console.error('[Call Monitor] Error handling voicemail:', error)
    return { notified: false }
  }
}

/**
 * Handle completed call (detect hot leads)
 */
export async function handleCallCompleted(
  callId: string,
  tenantId: string,
  duration: number,
  contactId?: string
): Promise<{ isHotLead: boolean }> {
  try {
    // Emit CALL.COMPLETED event
    await events.callCompleted({
      callId,
      contactId,
      tenantId,
      duration,
      completedAt: new Date().toISOString(),
    })

    // Detect hot lead (long call = high interest)
    const isHotLead = duration >= 1800 // 30+ minutes

    if (isHotLead && contactId) {
      const supabase = createClient()

      // Add "hot_lead" tag
      const { data: contact } = await supabase
        .from('contacts')
        .select('tags')
        .eq('id', contactId)
        .single()

      if (contact) {
        const tags = contact.tags || []
        if (!tags.includes('hot_lead')) {
          tags.push('hot_lead')
          
          await supabase
            .from('contacts')
            .update({ tags })
            .eq('id', contactId)
        }
      }

      console.log(`[Call Monitor] Hot lead detected: ${contactId} (call duration ${duration}s)`)
    }

    return { isHotLead }
  } catch (error) {
    console.error('[Call Monitor] Error handling call completion:', error)
    return { isHotLead: false }
  }
}

