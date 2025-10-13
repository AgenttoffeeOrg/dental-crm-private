/**
 * ROI CALCULATOR - Marketing Campaign Performance
 * Calculates deals, revenue, cost, and ROI per campaign
 */

import { createClient } from '@/lib/supabase-client';

export interface CampaignROI {
  campaignId: string;
  campaignName: string;
  dealsCreated: number;
  dealsWon: number;
  totalRevenue: number; // in cents
  campaignCost: number; // in cents
  costPerAcquisition: number; // in cents
  roiMultiplier: number; // revenue / cost
  roiPercentage: number; // (revenue - cost) / cost * 100
}

/**
 * Calculate ROI for a specific campaign
 */
export async function calculateCampaignROI(campaignId: string): Promise<CampaignROI | null> {
  try {
    const supabase = createClient();
    
    // Get all deals attributed to this campaign
    const { data: attributions } = await supabase
      .from('marketing_attribution')
      .select('*, deals(*), marketing_campaigns(name, campaign_cost_cents)')
      .or(`first_touch_campaign_id.eq.${campaignId},last_touch_campaign_id.eq.${campaignId}`);

    if (!attributions || attributions.length === 0) {
      return null;
    }

    const campaignName = (attributions[0] as any).marketing_campaigns?.name || 'Unknown Campaign';
    const campaignCost = (attributions[0] as any).marketing_campaigns?.campaign_cost_cents || 0;

    let dealsCreated = 0;
    let dealsWon = 0;
    let totalRevenue = 0;

    attributions.forEach((attr: any) => {
      dealsCreated++;
      
      if (attr.deal_won) {
        dealsWon++;
        totalRevenue += attr.deal_value_cents || 0;
      }
    });

    const costPerAcquisition = dealsCreated > 0 ? campaignCost / dealsCreated : 0;
    const roiMultiplier = campaignCost > 0 ? totalRevenue / campaignCost : 0;
    const roiPercentage = campaignCost > 0 ? ((totalRevenue - campaignCost) / campaignCost) * 100 : 0;

    return {
      campaignId,
      campaignName,
      dealsCreated,
      dealsWon,
      totalRevenue,
      campaignCost,
      costPerAcquisition,
      roiMultiplier,
      roiPercentage,
    };
  } catch (error) {
    console.error('[ROI Calculator] Error calculating ROI:', error);
    return null;
  }
}

/**
 * Calculate ROI for all campaigns
 */
export async function calculateAllCampaignsROI(tenantId: string): Promise<CampaignROI[]> {
  try {
    const supabase = createClient();
    
    // Get all campaigns with deals
    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('tenant_id', tenantId);

    if (!campaigns) return [];

    const results: CampaignROI[] = [];
    
    for (const campaign of campaigns) {
      const roi = await calculateCampaignROI(campaign.id);
      if (roi) {
        results.push(roi);
      }
    }

    // Sort by ROI percentage descending
    results.sort((a, b) => b.roiPercentage - a.roiPercentage);

    return results;
  } catch (error) {
    console.error('[ROI Calculator] Error calculating all ROI:', error);
    return [];
  }
}

/**
 * Get top performing campaigns
 */
export async function getTopCampaigns(tenantId: string, limit = 10): Promise<CampaignROI[]> {
  const allROI = await calculateAllCampaignsROI(tenantId);
  return allROI.slice(0, limit);
}

/**
 * Calculate revenue attributed to marketing
 */
export async function getTotalMarketingRevenue(tenantId: string): Promise<number> {
  try {
    const supabase = createClient();
    
    const { data } = await supabase
      .from('marketing_attribution')
      .select('deal_value_cents')
      .eq('tenant_id', tenantId)
      .eq('deal_won', true);

    if (!data) return 0;

    return data.reduce((sum, attr) => sum + (attr.deal_value_cents || 0), 0);
  } catch (error) {
    console.error('[ROI Calculator] Error calculating total revenue:', error);
    return 0;
  }
}


