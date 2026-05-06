/**
 * AUTOMATION GOVERNANCE
 * 
 * Enterprise controls for automation safety:
 * - Approval workflows
 * - Versioning and rollback
 * - Rate limiting
 * - Consent enforcement
 * - DLQ and retry logic
 */

import { createClient } from '@/lib/supabase-client'

// =====================================================
// APPROVAL WORKFLOW
// =====================================================

/**
 * Request approval for automation publish
 */
export async function requestAutomationApproval(
  automationId: string,
  tenantId: string,
  requestedByUserId: string,
  changesSummary: string
): Promise<{ success: boolean; approvalId?: string; error?: string }> {
  try {
    const supabase = createClient()

    // Check if pending approval already exists
    const { data: existingApproval } = await supabase
      .from('automation_approvals')
      .select('id')
      .eq('automation_id', automationId)
      .eq('status', 'pending')
      .single()

    if (existingApproval) {
      return { success: false, error: 'Approval already pending' }
    }

    // Create approval request
    const { data, error } = await supabase
      .from('automation_approvals')
      .insert({
        tenant_id: tenantId,
        automation_id: automationId,
        requested_by_user_id: requestedByUserId,
        changes_summary: changesSummary,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Notify managers
    const { data: managers } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('role', ['owner', 'admin', 'manager'])

    if (managers && managers.length > 0) {
      // Phase 2a.5: redirected through emitNotification() — was writing
      // event_type/event_data/channel columns that don't exist on the live
      // notifications table. See notifications_audit.md §3-4.
      const { emitNotification } = await import('@/lib/notifications/notification-router')
      await emitNotification({
        event_key: 'automation.approval_requested',
        event_id: `automation.approval_requested:${data.id}`,
        tenant_id: tenantId,
        entity_type: 'automation_approval',
        entity_id: data.id,
        recipient_user_ids: managers.map(m => m.id),
        metadata: {
          automationId,
          approvalId: data.id,
          changesSummary,
        },
      })
    }

    return { success: true, approvalId: data.id }
  } catch (error) {
    console.error('[Governance] Error requesting approval:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Approve or reject automation
 */
export async function reviewAutomationApproval(
  approvalId: string,
  reviewerUserId: string,
  decision: 'approved' | 'rejected',
  comments?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Update approval
    const { data: approval, error } = await supabase
      .from('automation_approvals')
      .update({
        status: decision,
        reviewer_user_id: reviewerUserId,
        reviewed_at: new Date().toISOString(),
        comments,
      })
      .eq('id', approvalId)
      .select('automation_id, tenant_id, requested_by_user_id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // If approved, activate automation
    if (decision === 'approved') {
      await supabase
        .from('marketing_journeys')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by_user_id: reviewerUserId,
        })
        .eq('id', approval.automation_id)
    }

    // Phase 2a.5: redirected through emitNotification() — was writing
    // event_type/event_data/channel columns that don't exist on the live
    // notifications table. See notifications_audit.md §3-4.
    {
      const { emitNotification } = await import('@/lib/notifications/notification-router')
      await emitNotification({
        event_key: 'automation.approval_reviewed',
        event_id: `automation.approval_reviewed:${approvalId}`,
        tenant_id: approval.tenant_id,
        entity_type: 'automation_approval',
        entity_id: approvalId,
        recipient_user_ids: [approval.requested_by_user_id],
        metadata: {
          approvalId,
          decision,
          comments: comments ?? '',
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error('[Governance] Error reviewing approval:', error)
    return { success: false, error: String(error) }
  }
}

// =====================================================
// VERSIONING & ROLLBACK
// =====================================================

/**
 * Rollback automation to previous version
 */
export async function rollbackAutomationToVersion(
  automationId: string,
  versionNumber: number,
  tenantId: string,
  rolledBackByUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Get version
    const { data: version } = await supabase
      .from('automation_versions')
      .select('*')
      .eq('automation_id', automationId)
      .eq('version_number', versionNumber)
      .single()

    if (!version) {
      return { success: false, error: 'Version not found' }
    }

    // Update automation with version data
    const { error } = await supabase
      .from('marketing_journeys')
      .update({
        graph_json: version.graph_json,
        entry_trigger_config: version.trigger_config,
        status: 'draft', // Force to draft after rollback
        updated_at: new Date().toISOString(),
      })
      .eq('id', automationId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Create new version entry marking this as a rollback
    const { data: currentVersion } = await supabase
      .from('automation_versions')
      .select('version_number')
      .eq('automation_id', automationId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (currentVersion) {
      await supabase.from('automation_versions').insert({
        tenant_id: tenantId,
        automation_id: automationId,
        version_number: currentVersion.version_number + 1,
        graph_json: version.graph_json,
        trigger_config: version.trigger_config,
        status_at_version: 'draft',
        rolled_back_from_version: versionNumber,
        published_by_user_id: rolledBackByUserId,
        change_notes: `Rolled back to version ${versionNumber}`,
      })
    }

    console.log(`[Governance] Rolled back automation ${automationId} to version ${versionNumber}`)

    return { success: true }
  } catch (error) {
    console.error('[Governance] Error rolling back:', error)
    return { success: false, error: String(error) }
  }
}

// =====================================================
// RATE LIMITING
// =====================================================

/**
 * Check if automation can execute (rate limit check)
 */
export async function checkAutomationRateLimit(
  automationId: string,
  tenantId: string,
  actionType?: 'email' | 'sms'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = createClient()

    // Get or create rate limit record
    let { data: rateLimit } = await supabase
      .from('automation_rate_limits')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('automation_id', automationId)
      .single()

    if (!rateLimit) {
      // Create default rate limit
      const { data } = await supabase
        .from('automation_rate_limits')
        .insert({
          tenant_id: tenantId,
          automation_id: automationId,
        })
        .select()
        .single()
      
      rateLimit = data
    }

    if (!rateLimit) {
      return { allowed: false, reason: 'Failed to check rate limits' }
    }

    // Check if paused
    if (rateLimit.is_paused_due_to_limits) {
      return { allowed: false, reason: 'Automation paused due to rate limits' }
    }

    // Check hourly limit
    if (rateLimit.current_hour_executions >= rateLimit.max_executions_per_hour) {
      return { allowed: false, reason: 'Hourly execution limit reached' }
    }

    // Check daily limit
    if (rateLimit.current_day_executions >= rateLimit.max_executions_per_day) {
      return { allowed: false, reason: 'Daily execution limit reached' }
    }

    // Check action-specific limits
    if (actionType === 'email' && rateLimit.current_day_emails >= rateLimit.max_emails_per_day) {
      return { allowed: false, reason: 'Daily email limit reached' }
    }

    if (actionType === 'sms' && rateLimit.current_day_sms >= rateLimit.max_sms_per_day) {
      return { allowed: false, reason: 'Daily SMS limit reached' }
    }

    // Increment counters
    await supabase
      .from('automation_rate_limits')
      .update({
        current_hour_executions: rateLimit.current_hour_executions + 1,
        current_day_executions: rateLimit.current_day_executions + 1,
        ...(actionType === 'email' && { current_day_emails: rateLimit.current_day_emails + 1 }),
        ...(actionType === 'sms' && { current_day_sms: rateLimit.current_day_sms + 1 }),
      })
      .eq('id', rateLimit.id)

    return { allowed: true }
  } catch (error) {
    console.error('[Rate Limit] Error checking:', error)
    return { allowed: false, reason: 'Rate limit check failed' }
  }
}

// =====================================================
// CONSENT ENFORCEMENT
// =====================================================

/**
 * Check consent before sending communication
 */
export async function checkAutomationConsent(
  contactId: string,
  tenantId: string,
  actionType: 'email' | 'sms' | 'whatsapp'
): Promise<{ 
  hasConsent: boolean
  consentSource?: string
  blockedReason?: string
}> {
  try {
    const supabase = createClient()

    // Get contact consent
    const { data: contact } = await supabase
      .from('contacts')
      .select('email_consent, sms_consent, whatsapp_consent, consent_source')
      .eq('id', contactId)
      .single()

    if (!contact) {
      return { hasConsent: false, blockedReason: 'Contact not found' }
    }

    let hasConsent = false
    let consentField = ''

    switch (actionType) {
      case 'email':
        hasConsent = contact.email_consent === true
        consentField = 'email_consent'
        break
      case 'sms':
        hasConsent = contact.sms_consent === true
        consentField = 'sms_consent'
        break
      case 'whatsapp':
        hasConsent = contact.whatsapp_consent === true
        consentField = 'whatsapp_consent'
        break
    }

    if (!hasConsent) {
      return {
        hasConsent: false,
        blockedReason: `Contact has not granted ${actionType} consent`,
      }
    }

    return {
      hasConsent: true,
      consentSource: contact.consent_source || 'unknown',
    }
  } catch (error) {
    console.error('[Consent] Error checking:', error)
    return { hasConsent: false, blockedReason: 'Consent check failed' }
  }
}

/**
 * Log consent check for audit
 */
export async function logConsentCheck(
  automationId: string,
  contactId: string,
  tenantId: string,
  actionType: string,
  consentStatus: 'granted' | 'denied' | 'not_required',
  actionTaken: boolean,
  blockedReason?: string
): Promise<void> {
  try {
    const supabase = createClient()

    await supabase.from('automation_consent_audit').insert({
      tenant_id: tenantId,
      automation_id: automationId,
      contact_id: contactId,
      action_type: actionType,
      consent_status: consentStatus,
      action_taken: actionTaken,
      blocked_reason: blockedReason,
    })
  } catch (error) {
    console.error('[Consent Audit] Error logging:', error)
  }
}

