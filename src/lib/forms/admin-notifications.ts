/**
 * Admin Notification System for Form Submissions
 * Sends email notifications to admins/staff when forms are submitted
 *
 * Features:
 * - Per-form notification configuration
 * - Tenant-level admin discovery
 * - Conditional notifications based on lead score
 * - Multiple recipient support
 */

import { createServiceClient } from '@/lib/supabase-server';
import { sendAdminNotification } from './email-notifications';

export interface NotificationConfig {
  enabled: boolean;
  recipients?: string[]; // Specific email addresses
  notifyAdmins?: boolean; // Auto-discover tenant admins
  notifyManagers?: boolean; // Auto-discover managers
  notifyAssignedUser?: boolean; // Notify assigned user if deal created
  conditions?: {
    minLeadScore?: number;
    excludeSpam?: boolean;
  };
}

/**
 * Get notification configuration for a form
 * Checks form settings, then tenant settings, then defaults
 */
export async function getFormNotificationConfig(
  formId: string,
  tenantId: string
): Promise<NotificationConfig> {
  const supabase = createServiceClient();

  // Try to get form-specific settings (stored in form metadata or tenant_settings)
  const { data: formSettings } = await supabase
    .from('tenant_settings')
    .select('value')
    .eq('key', `form:${formId}:notifications`)
    .eq('tenant_id', tenantId)
    .single();

  if (formSettings?.value) {
    return formSettings.value as NotificationConfig;
  }

  // Fall back to tenant-level form notification settings
  const { data: tenantSettings } = await supabase
    .from('tenant_settings')
    .select('value')
    .eq('key', 'forms:notifications:default')
    .eq('tenant_id', tenantId)
    .single();

  if (tenantSettings?.value) {
    return tenantSettings.value as NotificationConfig;
  }

  // Default configuration: notify admins, exclude spam
  return {
    enabled: true,
    notifyAdmins: true,
    conditions: {
      excludeSpam: true,
    },
  };
}

/**
 * Get admin/manager email addresses for a tenant
 */
export async function getTenantAdminEmails(
  tenantId: string,
  includeManagers: boolean = false
): Promise<string[]> {
  const supabase = createServiceClient();

  const roles = includeManagers ? ['owner', 'admin', 'manager'] : ['owner', 'admin'];

  const { data: users, error } = await supabase
    .from('app_users')
    .select('email')
    .eq('tenant_id', tenantId)
    .in('role', roles)
    .eq('is_active', true)
    .not('email', 'is', null);

  if (error) {
    console.error('[AdminNotifications] Error fetching admin emails:', error);
    return [];
  }

  return users?.map((u) => u.email).filter(Boolean) || [];
}

/**
 * Send admin notifications for a form submission
 */
export async function sendFormSubmissionNotifications(params: {
  formId: string;
  formName: string;
  tenantId: string;
  submissionData: Record<string, any>;
  submittedAt: string;
  isSpam: boolean;
  spamScore?: number;
  leadScore?: number;
  leadCategory?: string;
  assignedUserId?: string;
}): Promise<void> {
  const {
    formId,
    formName,
    tenantId,
    submissionData,
    submittedAt,
    isSpam,
    spamScore,
    leadScore,
    leadCategory,
    assignedUserId,
  } = params;

  // Get notification configuration
  const config = await getFormNotificationConfig(formId, tenantId);

  if (!config.enabled) {
    return;
  }

  // Check conditions
  if (config.conditions?.excludeSpam && isSpam) {
    return;
  }

  if (config.conditions?.minLeadScore && (leadScore || 0) < config.conditions.minLeadScore) {
    return;
  }

  // Collect all recipients
  const recipients: string[] = [];

  // Add specific recipients
  if (config.recipients) {
    recipients.push(...config.recipients);
  }

  // Add admins
  if (config.notifyAdmins) {
    const adminEmails = await getTenantAdminEmails(tenantId, false);
    recipients.push(...adminEmails);
  }

  // Add managers
  if (config.notifyManagers) {
    const managerEmails = await getTenantAdminEmails(tenantId, true);
    recipients.push(...managerEmails);
  }

  // Add assigned user if deal was created
  if (config.notifyAssignedUser && assignedUserId) {
    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from('app_users')
      .select('email')
      .eq('id', assignedUserId)
      .single();

    if (user?.email) {
      recipients.push(user.email);
    }
  }

  // Remove duplicates
  const uniqueRecipients = [...new Set(recipients)];

  if (uniqueRecipients.length === 0) {
    console.log('[AdminNotifications] No recipients configured for form submission');
    return;
  }

  // Send notifications to all recipients
  const notificationPromises = uniqueRecipients.map((email) =>
    sendAdminNotification({
      adminEmail: email,
      formName,
      submissionData,
      submittedAt,
      leadScore,
      leadCategory,
    }).catch((error) => {
      console.error(`[AdminNotifications] Failed to send to ${email}:`, error);
    })
  );

  await Promise.allSettled(notificationPromises);

  console.log(`[AdminNotifications] Sent notifications to ${uniqueRecipients.length} recipients`);
}
