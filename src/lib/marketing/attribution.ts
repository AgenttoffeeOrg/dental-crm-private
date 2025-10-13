/**
 * MARKETING ATTRIBUTION SERVICE
 * Tracks how marketing campaigns contribute to deals and revenue
 */

import { createClient } from '@/lib/supabase-client';

export type AttributionModel = 'first_touch' | 'last_touch' | 'multi_touch';

export interface MarketingTouchpoint {
  campaignId: string;
  campaignName: string;
  type: 'email_sent' | 'email_opened' | 'link_clicked' | 'form_filled' | 'landing_page_visit';
  timestamp: string;
}

export interface AttributionResult {
  dealId: string;
  contactId: string;
  model: AttributionModel;
  firstTouchCampaignId?: string;
  firstTouchCampaignName?: string;
  lastTouchCampaignId?: string;
  lastTouchCampaignName?: string;
  touchpoints: MarketingTouchpoint[];
  dealValue: number;
  attribution: Record<string, number>; // campaignId -> attributed value
}

/**
 * Track first-touch attribution (original campaign that created contact)
 */
export async function trackFirstTouch(
  contactId: string,
  campaignId: string,
  campaignName: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    await supabase
      .from('contacts')
      .update({
        lead_source_campaign_id: campaignId,
      })
      .eq('id', contactId)
      .is('lead_source_campaign_id', null); // Only set if not already set

    console.log(`[Attribution] First-touch: ${campaignName} for contact ${contactId}`);
    return true;
  } catch (error) {
    console.error('[Attribution] Error tracking first-touch:', error);
    return false;
  }
}

/**
 * Track last-touch attribution (most recent campaign before deal creation)
 */
export async function trackLastTouch(
  dealId: string,
  campaignId: string,
  campaignName: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    await supabase
      .from('deals')
      .update({
        marketing_source_type: 'campaign',
        marketing_source_id: campaignId,
        marketing_source_name: campaignName,
      })
      .eq('id', dealId);

    console.log(`[Attribution] Last-touch: ${campaignName} for deal ${dealId}`);
    return true;
  } catch (error) {
    console.error('[Attribution] Error tracking last-touch:', error);
    return false;
  }
}

/**
 * Track multi-touch attribution (all campaigns in the journey)
 */
export async function trackMultiTouch(
  dealId: string,
  contactId: string,
  touchpoints: MarketingTouchpoint[]
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Update deal with all touchpoints
    await supabase
      .from('deals')
      .update({
        marketing_touchpoints: touchpoints,
      })
      .eq('id', dealId);

    // Get deal value for attribution calculation
    const { data: deal } = await supabase
      .from('deals')
      .select('value_estimate_cents, pipeline_id, tenant_id')
      .eq('id', dealId)
      .single();

    if (!deal) return false;

    const dealValue = deal.value_estimate_cents || 0;
    
    // Create attribution record
    const firstTouch = touchpoints[0];
    const lastTouch = touchpoints[touchpoints.length - 1];
    
    // Calculate multi-touch attribution (equal weight for now)
    const campaignIds = [...new Set(touchpoints.map(t => t.campaignId))];
    const attributedValue = Math.floor(dealValue / campaignIds.length);
    
    await supabase.from('marketing_attribution').insert({
      tenant_id: deal.tenant_id,
      deal_id: dealId,
      contact_id: contactId,
      attribution_model: 'multi_touch',
      touchpoint_sequence: touchpoints,
      first_touch_campaign_id: firstTouch?.campaignId,
      first_touch_campaign_name: firstTouch?.campaignName,
      first_touch_timestamp: firstTouch?.timestamp,
      last_touch_campaign_id: lastTouch?.campaignId,
      last_touch_campaign_name: lastTouch?.campaignName,
      last_touch_timestamp: lastTouch?.timestamp,
      deal_value_cents: dealValue,
    });

    console.log(`[Attribution] Multi-touch: ${touchpoints.length} touchpoints for deal ${dealId}`);
    return true;
  } catch (error) {
    console.error('[Attribution] Error tracking multi-touch:', error);
    return false;
  }
}

/**
 * Get attribution for a deal
 */
export async function getAttribution(dealId: string): Promise<AttributionResult | null> {
  try {
    const supabase = createClient();
    
    const { data: attribution } = await supabase
      .from('marketing_attribution')
      .select('*')
      .eq('deal_id', dealId)
      .single();

    if (!attribution) return null;

    // Calculate attribution percentages
    const touchpoints = attribution.touchpoint_sequence as MarketingTouchpoint[];
    const campaignIds = [...new Set(touchpoints.map((t: MarketingTouchpoint) => t.campaignId))];
    const valuePerCampaign = attribution.deal_value_cents / campaignIds.length;
    
    const attributionMap: Record<string, number> = {};
    campaignIds.forEach(id => {
      attributionMap[id] = valuePerCampaign;
    });

    return {
      dealId: attribution.deal_id,
      contactId: attribution.contact_id,
      model: attribution.attribution_model,
      firstTouchCampaignId: attribution.first_touch_campaign_id,
      firstTouchCampaignName: attribution.first_touch_campaign_name,
      lastTouchCampaignId: attribution.last_touch_campaign_id,
      lastTouchCampaignName: attribution.last_touch_campaign_name,
      touchpoints,
      dealValue: attribution.deal_value_cents,
      attribution: attributionMap,
    };
  } catch (error) {
    console.error('[Attribution] Error getting attribution:', error);
    return null;
  }
}

/**
 * Add a marketing touchpoint to a contact's journey
 */
export async function addTouchpoint(
  contactId: string,
  touchpoint: MarketingTouchpoint
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Update last marketing interaction time
    await supabase
      .from('contacts')
      .update({
        last_marketing_interaction_at: touchpoint.timestamp,
      })
      .eq('id', contactId);

    // When a deal is created for this contact, touchpoints will be collected
    console.log(`[Attribution] Touchpoint added: ${touchpoint.type} for contact ${contactId}`);
    return true;
  } catch (error) {
    console.error('[Attribution] Error adding touchpoint:', error);
    return false;
  }
}

