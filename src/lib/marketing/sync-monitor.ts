/**
 * SYNC MONITOR - Contact/Campaign Data Integrity
 * Monitors sync health between CRM and Marketing
 */

import { createClient } from '@/lib/supabase-client';

export interface SyncStatus {
  healthy: boolean;
  lastSyncAt: string | null;
  contactsInSync: number;
  contactsOutOfSync: number;
  errors: string[];
}

/**
 * Check sync health
 */
export async function checkSyncHealth(tenantId: string): Promise<SyncStatus> {
  try {
    const supabase = createClient();
    
    // Count total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Count contacts with marketing data
    const { count: syncedContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('marketing_engagement_score', 'is', null);

    const contactsInSync = syncedContacts || 0;
    const contactsOutOfSync = (totalContacts || 0) - contactsInSync;

    return {
      healthy: contactsOutOfSync === 0,
      lastSyncAt: new Date().toISOString(),
      contactsInSync,
      contactsOutOfSync,
      errors: [],
    };
  } catch (error) {
    return {
      healthy: false,
      lastSyncAt: null,
      contactsInSync: 0,
      contactsOutOfSync: 0,
      errors: [String(error)],
    };
  }
}

/**
 * Manual re-sync all contacts
 */
export async function resyncAllContacts(tenantId: string): Promise<{ synced: number; errors: number }> {
  const supabase = createClient();
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('tenant_id', tenantId);

  if (!contacts) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      // Recalculate engagement score
      const { data: score } = await supabase.rpc('calculate_marketing_engagement', {
        p_contact_id: contact.id,
      });

      await supabase
        .from('contacts')
        .update({ marketing_engagement_score: score || 0 })
        .eq('id', contact.id);

      synced++;
    } catch (error) {
      errors++;
    }
  }

  // Log to audit trail
  await supabase.from('audit_trail').insert({
    tenant_id: tenantId,
    user_id: 'system',
    action: 'contacts_resynced',
    details: { synced, errors },
  });

  return { synced, errors };
}

/**
 * Real-time contact update webhook
 */
export async function onContactUpdated(contactId: string): Promise<void> {
  // When a contact is updated in CRM, propagate to Marketing
  const { syncContactToMarketing } = await import('./contact-sync');
  
  const supabase = createClient();
  const { data: memberships } = await supabase
    .from('contact_segment_membership')
    .select('segment_id')
    .eq('contact_id', contactId);

  if (memberships && memberships.length > 0) {
    const audienceIds = memberships.map(m => m.segment_id);
    await syncContactToMarketing(contactId, audienceIds, {
      mergeTags: true,
      updateConsent: true,
    });
  }
}

/**
 * Consent change propagation
 */
export async function propagateConsentChange(
  contactId: string,
  field: 'marketing_consent' | 'email_consent' | 'sms_consent',
  value: boolean
): Promise<void> {
  const supabase = createClient();
  
  // Update in CRM
  await supabase
    .from('contacts')
    .update({ [field]: value })
    .eq('id', contactId);

  // If marketing consent removed, pause all active journeys
  if (field === 'marketing_consent' && !value) {
    await supabase
      .from('marketing_journey_runs')
      .update({ state: 'stopped' })
      .eq('contact_id', contactId)
      .eq('state', 'running');

    console.log(`[Sync Monitor] Paused all journeys for contact ${contactId} (consent withdrawn)`);
  }
}

