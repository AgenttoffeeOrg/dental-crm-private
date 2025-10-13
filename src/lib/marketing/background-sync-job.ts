/**
 * BACKGROUND SYNC JOB
 * Periodically syncs contact counts and engagement scores
 */

import { createClient } from '@/lib/supabase-client';

export interface SyncJobResult {
  contactsSynced: number;
  engagementScoresUpdated: number;
  errors: number;
  duration: number; // milliseconds
}

/**
 * Run background sync job for all contacts
 */
export async function runBackgroundSync(tenantId: string): Promise<SyncJobResult> {
  const startTime = Date.now();
  const supabase = createClient();
  
  let contactsSynced = 0;
  let engagementScoresUpdated = 0;
  let errors = 0;

  try {
    // Get all contacts for tenant
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenantId);

    if (!contacts) {
      return { contactsSynced: 0, engagementScoresUpdated: 0, errors: 0, duration: 0 };
    }

    // Update engagement scores in batches
    for (const contact of contacts) {
      try {
        const { data: score } = await supabase.rpc('calculate_marketing_engagement', {
          p_contact_id: contact.id,
        });

        await supabase
          .from('contacts')
          .update({ marketing_engagement_score: score || 0 })
          .eq('id', contact.id);

        engagementScoresUpdated++;
        contactsSynced++;
      } catch (error) {
        errors++;
        console.error(`[Background Sync] Error syncing contact ${contact.id}:`, error);
      }
    }

    // Log to audit trail
    await supabase.from('audit_trail').insert({
      tenant_id: tenantId,
      user_id: 'system',
      action: 'background_sync_completed',
      details: {
        contactsSynced,
        engagementScoresUpdated,
        errors,
        duration: Date.now() - startTime,
      },
    });

    console.log(`[Background Sync] Completed: ${contactsSynced} contacts synced in ${Date.now() - startTime}ms`);

  } catch (error) {
    console.error('[Background Sync] Fatal error:', error);
    errors++;
  }

  return {
    contactsSynced,
    engagementScoresUpdated,
    errors,
    duration: Date.now() - startTime,
  };
}

/**
 * Schedule background sync (call this on a cron/interval)
 */
export function scheduleBackgroundSync(tenantId: string, intervalMinutes = 60) {
  console.log(`[Background Sync] Scheduling every ${intervalMinutes} minutes for tenant ${tenantId}`);
  
  // Run immediately
  runBackgroundSync(tenantId);
  
  // Then run on interval
  const intervalId = setInterval(() => {
    runBackgroundSync(tenantId);
  }, intervalMinutes * 60 * 1000);

  return intervalId; // Return so caller can clear if needed
}

