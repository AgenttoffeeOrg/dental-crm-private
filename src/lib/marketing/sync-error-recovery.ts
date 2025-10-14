/**
 * SYNC ERROR RECOVERY
 * Handles and recovers from sync errors
 */

import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

export interface SyncError {
  id: string;
  contactId: string;
  errorType: 'timeout' | 'validation' | 'network' | 'permission' | 'unknown';
  errorMessage: string;
  timestamp: string;
  retryCount: number;
}

/**
 * Log sync error
 */
export async function logSyncError(
  tenantId: string,
  contactId: string,
  errorType: SyncError['errorType'],
  errorMessage: string
): Promise<void> {
  const supabase = createClient();

  await supabase.from('audit_trail').insert({
    tenant_id: tenantId,
    user_id: 'system',
    action: 'sync_error',
    entity_type: 'contact',
    entity_id: contactId,
    details: {
      errorType,
      errorMessage,
      timestamp: new Date().toISOString(),
    },
  });

  console.error(`[Sync Error] ${errorType} for contact ${contactId}: ${errorMessage}`);
}

/**
 * Retry failed sync
 */
export async function retrySyncWithBackoff(
  contactId: string,
  audienceIds: string[],
  maxRetries = 3
): Promise<boolean> {
  const { syncContactToMarketing } = await import('./contact-sync');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await syncContactToMarketing(contactId, audienceIds);
      if (success) {
        console.log(`[Sync Recovery] Succeeded on attempt ${attempt} for contact ${contactId}`);
        return true;
      }
    } catch (error) {
      console.error(`[Sync Recovery] Attempt ${attempt} failed:`, error);
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error(`[Sync Recovery] All ${maxRetries} attempts failed for contact ${contactId}`);
  return false;
}

/**
 * Send notification about sync failures
 */
export async function notifySyncFailure(
  tenantId: string,
  failureCount: number,
  affectedContacts: string[]
): Promise<void> {
  const supabase = createClient();

  // Get admin users for this tenant
  const { data: admins } = await supabase
    .from('app_users')
    .select('id, email, full_name')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin');

  if (!admins || admins.length === 0) {
    console.warn('[Sync Notification] No admins found to notify');
    return;
  }

  // Log notification intent
  await supabase.from('audit_trail').insert({
    tenant_id: tenantId,
    user_id: 'system',
    action: 'sync_failure_notification',
    details: {
      failureCount,
      affectedContacts: affectedContacts.slice(0, 10), // First 10
      notifiedAdmins: admins.map(a => a.id),
    },
  });

  // In production, send actual email/notification here
  console.log(`[Sync Notification] Would notify ${admins.length} admins about ${failureCount} sync failures`);
  
  // Toast for dev/testing
  toast.error(`Marketing sync failed for ${failureCount} contact(s). Check sync status dashboard.`);
}

/**
 * Auto-recover from common sync errors
 */
export async function autoRecover(tenantId: string): Promise<{ recovered: number; failed: number }> {
  const supabase = createClient();
  
  // Find contacts with recent sync errors (from audit trail)
  const { data: recentErrors } = await supabase
    .from('audit_trail')
    .select('entity_id, details')
    .eq('tenant_id', tenantId)
    .eq('action', 'sync_error')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .limit(50);

  if (!recentErrors || recentErrors.length === 0) {
    return { recovered: 0, failed: 0 };
  }

  let recovered = 0;
  let failed = 0;

  // Retry each failed contact
  for (const error of recentErrors) {
    const contactId = error.entity_id;
    
    // Get audience memberships
    const { data: memberships } = await supabase
      .from('contact_segment_membership')
      .select('segment_id')
      .eq('contact_id', contactId);

    if (memberships && memberships.length > 0) {
      const success = await retrySyncWithBackoff(
        contactId,
        memberships.map(m => m.segment_id),
        2 // 2 retries
      );

      if (success) recovered++;
      else failed++;
    }
  }

  console.log(`[Auto Recovery] Recovered ${recovered}, Failed ${failed}`);
  return { recovered, failed };
}




