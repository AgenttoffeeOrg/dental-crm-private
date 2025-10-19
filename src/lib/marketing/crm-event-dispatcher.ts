/**
 * CRM EVENT DISPATCHER
 * Triggers Marketing Journeys based on CRM events
 */

import { createClient } from '@/lib/supabase-client';

export type CRMEventType =
  | 'contact_created'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'deal_routed' // ===== PHASE 13: NEW ROUTING EVENT =====
  | 'deal_won'
  | 'deal_lost'
  | 'deal_inactive'
  | 'task_completed'
  | 'contact_assigned_owner';

export interface CRMEvent {
  type: CRMEventType;
  tenantId: string;
  contactId?: string;
  dealId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Dispatch CRM event to Marketing Journeys (non-blocking)
 */
export async function dispatchCRMEvent(event: CRMEvent): Promise<void> {
  // Fire async - don't block CRM operations
  setTimeout(async () => {
    try {
      await processEvent(event);
    } catch (error) {
      console.error('[CRM Event Dispatcher] Error processing event:', error);
    }
  }, 0);
}

/**
 * Process event and trigger matching journeys
 */
async function processEvent(event: CRMEvent): Promise<void> {
  const supabase = createClient();
  
  // Find active journeys triggered by this event type
  const { data: journeys } = await supabase
    .from('marketing_journeys')
    .select('id, graph_json')
    .eq('tenant_id', event.tenantId)
    .eq('status', 'active')
    .contains('graph_json', { trigger: { type: event.type } });

  if (!journeys || journeys.length === 0) {
    return;
  }

  // For each matching journey, create a journey run
  for (const journey of journeys) {
    if (!event.contactId) continue;

    await supabase.from('marketing_journey_runs').insert({
      tenant_id: event.tenantId,
      journey_id: journey.id,
      contact_id: event.contactId,
      state: 'running',
      node_index: 0,
      started_at: new Date().toISOString(),
    });

    console.log(`[CRM Event Dispatcher] Started journey ${journey.id} for contact ${event.contactId}`);
  }
}

// ========================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC EVENTS
// ========================================

export async function onContactCreated(contactId: string, tenantId: string) {
  await dispatchCRMEvent({
    type: 'contact_created',
    tenantId,
    contactId,
    timestamp: new Date().toISOString(),
  });
}

export async function onDealCreated(dealId: string, contactId: string, tenantId: string) {
  await dispatchCRMEvent({
    type: 'deal_created',
    tenantId,
    contactId,
    dealId,
    timestamp: new Date().toISOString(),
  });
}

export async function onDealStageChanged(
  dealId: string,
  contactId: string,
  tenantId: string,
  oldStage: string,
  newStage: string
) {
  await dispatchCRMEvent({
    type: 'deal_stage_changed',
    tenantId,
    contactId,
    dealId,
    metadata: { oldStage, newStage },
    timestamp: new Date().toISOString(),
  });
}

export async function onDealWon(dealId: string, contactId: string, tenantId: string) {
  await dispatchCRMEvent({
    type: 'deal_won',
    tenantId,
    contactId,
    dealId,
    timestamp: new Date().toISOString(),
  });
}

export async function onDealLost(dealId: string, contactId: string, tenantId: string) {
  await dispatchCRMEvent({
    type: 'deal_lost',
    tenantId,
    contactId,
    dealId,
    timestamp: new Date().toISOString(),
  });
}




