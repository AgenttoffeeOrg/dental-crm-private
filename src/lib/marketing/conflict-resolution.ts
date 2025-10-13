/**
 * CONFLICT RESOLUTION SERVICE
 * Handles data conflicts between CRM and Marketing
 */

import { createClient } from '@/lib/supabase-client';

export type ConflictType = 'email' | 'phone' | 'tags' | 'consent' | 'name';

export interface DataConflict {
  contactId: string;
  type: ConflictType;
  crmValue: any;
  marketingValue: any;
  lastModifiedCRM: string | null;
  lastModifiedMarketing: string | null;
}

/**
 * Detect conflicts between CRM and Marketing data
 */
export async function detectConflicts(tenantId: string): Promise<DataConflict[]> {
  const conflicts: DataConflict[] = [];
  const supabase = createClient();

  // This is a placeholder - in reality, you'd compare CRM contacts with Marketing audience data
  // For now, we'll return empty array as conflicts should be rare with proper sync

  console.log(`[Conflict Resolution] Checking for conflicts in tenant ${tenantId}`);
  
  // Example: Check for email mismatches
  // const { data: contacts } = await supabase.from('contacts').select('*');
  // Compare with marketing_sends, marketing_events, etc.
  
  return conflicts;
}

/**
 * Resolve a conflict (choose CRM or Marketing value)
 */
export async function resolveConflict(
  contactId: string,
  conflictType: ConflictType,
  chooseSource: 'crm' | 'marketing'
): Promise<boolean> {
  const supabase = createClient();

  try {
    if (chooseSource === 'crm') {
      // CRM wins - propagate to Marketing
      const { syncContactToMarketing } = await import('./contact-sync');
      const { data: memberships } = await supabase
        .from('contact_segment_membership')
        .select('segment_id')
        .eq('contact_id', contactId);

      if (memberships) {
        await syncContactToMarketing(
          contactId,
          memberships.map(m => m.segment_id),
          { mergeTags: true, updateConsent: true }
        );
      }
    } else {
      // Marketing wins - propagate to CRM
      const { syncContactFromMarketing } = await import('./contact-sync');
      await syncContactFromMarketing(contactId, { mergeTags: true, updateConsent: true });
    }

    console.log(`[Conflict Resolution] Resolved ${conflictType} for contact ${contactId} (chose ${chooseSource})`);
    return true;
  } catch (error) {
    console.error('[Conflict Resolution] Error resolving conflict:', error);
    return false;
  }
}

/**
 * Auto-resolve conflicts using configured strategy
 */
export async function autoResolveConflicts(
  tenantId: string,
  strategy: 'crm_wins' | 'marketing_wins' | 'newest_wins' = 'crm_wins'
): Promise<{ resolved: number; failed: number }> {
  const conflicts = await detectConflicts(tenantId);
  let resolved = 0;
  let failed = 0;

  for (const conflict of conflicts) {
    let chooseSource: 'crm' | 'marketing';

    if (strategy === 'crm_wins') {
      chooseSource = 'crm';
    } else if (strategy === 'marketing_wins') {
      chooseSource = 'marketing';
    } else {
      // Newest wins
      const crmTime = conflict.lastModifiedCRM ? new Date(conflict.lastModifiedCRM).getTime() : 0;
      const mktTime = conflict.lastModifiedMarketing ? new Date(conflict.lastModifiedMarketing).getTime() : 0;
      chooseSource = crmTime > mktTime ? 'crm' : 'marketing';
    }

    const success = await resolveConflict(conflict.contactId, conflict.type, chooseSource);
    if (success) resolved++;
    else failed++;
  }

  return { resolved, failed };
}


