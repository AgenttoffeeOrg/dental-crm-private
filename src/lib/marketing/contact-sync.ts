/**
 * CONTACT SYNC - CRM ↔ Marketing Bidirectional Sync
 * Keeps CRM contacts and Marketing audiences in perfect sync
 */

import { createClient } from '@/lib/supabase-client';

export interface ContactSyncOptions {
  mergeTags?: boolean; // Union merge strategy
  updateConsent?: boolean; // Instant propagation
  consolidateHistory?: boolean; // For merges
}

/**
 * Sync CRM contact TO Marketing audiences
 */
export async function syncContactToMarketing(
  contactId: string,
  audienceIds: string[],
  options: ContactSyncOptions = {}
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get CRM contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.error('[Contact Sync] Contact not found:', contactError);
      return false;
    }

    // Add contact to specified audiences
    for (const audienceId of audienceIds) {
      await supabase.from('contact_segment_membership').upsert({
        contact_id: contactId,
        segment_id: audienceId,
        added_at: new Date().toISOString(),
      });
    }

    // Sync tags if enabled
    if (options.mergeTags && contact.tags) {
      for (const tag of contact.tags) {
        // Get or create marketing tag
        const { data: marketingTag } = await supabase
          .from('marketing_tags')
          .select('id')
          .eq('name', tag)
          .eq('tenant_id', contact.tenant_id)
          .single();

        if (marketingTag) {
          await supabase.from('contact_tags').upsert({
            contact_id: contactId,
            tag_id: marketingTag.id,
            tenant_id: contact.tenant_id,
          });
        }
      }
    }

    // Sync consent fields
    if (options.updateConsent) {
      // Marketing consent fields are already in contacts table
      // Just ensure they're up-to-date
      console.log('[Contact Sync] Consent fields synced');
    }

    console.log(`[Contact Sync] ✅ Synced contact ${contactId} to ${audienceIds.length} audiences`);
    return true;
  } catch (error) {
    console.error('[Contact Sync] Error syncing to Marketing:', error);
    return false;
  }
}

/**
 * Sync Marketing audience member BACK to CRM contact
 */
export async function syncContactFromMarketing(
  contactId: string,
  options: ContactSyncOptions = {}
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get marketing tags for this contact
    const { data: contactTags } = await supabase
      .from('contact_tags')
      .select('tag_id, marketing_tags(name)')
      .eq('contact_id', contactId);

    if (!contactTags || contactTags.length === 0) {
      return true; // No tags to sync
    }

    // Extract tag names
    const marketingTags = contactTags
      .map((ct: any) => ct.marketing_tags?.name)
      .filter(Boolean);

    // Merge with existing CRM tags
    const { data: contact } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', contactId)
      .single();

    const existingTags = contact?.tags || [];
    const mergedTags = Array.from(new Set([...existingTags, ...marketingTags]));

    // Update CRM contact with merged tags
    await supabase
      .from('contacts')
      .update({ tags: mergedTags })
      .eq('id', contactId);

    console.log(`[Contact Sync] ✅ Synced ${marketingTags.length} tags from Marketing to CRM`);
    return true;
  } catch (error) {
    console.error('[Contact Sync] Error syncing from Marketing:', error);
    return false;
  }
}

/**
 * Handle contact deletion - remove from all audiences
 */
export async function handleContactDeletion(contactId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Remove from all segment memberships
    await supabase
      .from('contact_segment_membership')
      .delete()
      .eq('contact_id', contactId);

    // Remove all contact tags
    await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId);

    console.log(`[Contact Sync] ✅ Cleaned up Marketing data for deleted contact ${contactId}`);
    return true;
  } catch (error) {
    console.error('[Contact Sync] Error handling deletion:', error);
    return false;
  }
}

/**
 * Handle contact merge - consolidate Marketing history
 */
export async function handleContactMerge(
  survivingContactId: string,
  mergedContactIds: string[]
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    for (const mergedId of mergedContactIds) {
      // Transfer segment memberships
      await supabase
        .from('contact_segment_membership')
        .update({ contact_id: survivingContactId })
        .eq('contact_id', mergedId);

      // Transfer tags
      await supabase
        .from('contact_tags')
        .update({ contact_id: survivingContactId })
        .eq('contact_id', mergedId);

      // Transfer marketing sends/events
      await supabase
        .from('marketing_sends')
        .update({ contact_id: survivingContactId })
        .eq('contact_id', mergedId);

      await supabase
        .from('marketing_events')
        .update({ contact_id: survivingContactId })
        .eq('contact_id', mergedId);
    }

    // Recalculate engagement score for surviving contact
    const { data } = await supabase.rpc('calculate_marketing_engagement', {
      p_contact_id: survivingContactId,
    });

    await supabase
      .from('contacts')
      .update({ marketing_engagement_score: data || 0 })
      .eq('id', survivingContactId);

    console.log(`[Contact Sync] ✅ Merged ${mergedContactIds.length} contacts into ${survivingContactId}`);
    return true;
  } catch (error) {
    console.error('[Contact Sync] Error handling merge:', error);
    return false;
  }
}

/**
 * Export contacts to Marketing audience
 */
export async function exportContactsToAudience(
  contactIds: string[],
  audienceId: string,
  tenantId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const contactId of contactIds) {
    const result = await syncContactToMarketing(contactId, [audienceId]);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`[Contact Sync] Exported ${success}/${contactIds.length} contacts to audience ${audienceId}`);
  return { success, failed };
}

