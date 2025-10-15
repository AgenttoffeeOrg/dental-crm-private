/**
 * Attribution Engine
 * 
 * Phase 3: Advanced marketing attribution - track which marketing efforts lead to deals.
 * Architecture: Multi-touch attribution model with first/last touch weighting.
 */

export interface AttributionTouchpoint {
  id: string;
  contact_id: string;
  source: string; // 'organic', 'paid', 'social', 'email', 'referral', 'direct'
  medium: string; // 'search', 'cpc', 'facebook', 'newsletter', etc.
  campaign?: string;
  content?: string;
  timestamp: Date;
  page_url: string;
  utm_params: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface AttributionReport {
  total_deals: number;
  total_revenue: number;
  by_source: Record<string, {
    deals: number;
    revenue: number;
    attribution_percent: number;
    avg_deal_value: number;
  }>;
  by_campaign: Record<string, {
    deals: number;
    revenue: number;
    cost?: number;
    roi?: number;
  }>;
  conversion_paths: Array<{
    path: string[];
    count: number;
    avg_revenue: number;
    avg_time_to_conversion_days: number;
  }>;
}

export class AttributionEngine {
  private model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';
  
  constructor(model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' = 'linear') {
    this.model = model;
  }
  
  /**
   * Calculate attribution for a deal based on touchpoints
   */
  calculateAttribution(
    touchpoints: AttributionTouchpoint[],
    dealValue: number
  ): Record<string, number> {
    if (touchpoints.length === 0) {
      return {};
    }
    
    // Sort touchpoints by timestamp
    const sorted = [...touchpoints].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    const attribution: Record<string, number> = {};
    
    switch (this.model) {
      case 'first_touch':
        attribution[sorted[0].source] = dealValue;
        break;
        
      case 'last_touch':
        attribution[sorted[sorted.length - 1].source] = dealValue;
        break;
        
      case 'linear':
        const linearValue = dealValue / sorted.length;
        sorted.forEach(tp => {
          attribution[tp.source] = (attribution[tp.source] || 0) + linearValue;
        });
        break;
        
      case 'time_decay':
        // Give more credit to recent touchpoints (exponential decay)
        const halfLife = 7; // days
        const now = sorted[sorted.length - 1].timestamp.getTime();
        let totalWeight = 0;
        
        const weights = sorted.map(tp => {
          const daysAgo = (now - tp.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          const weight = Math.pow(2, -daysAgo / halfLife);
          totalWeight += weight;
          return { source: tp.source, weight };
        });
        
        weights.forEach(({ source, weight }) => {
          const value = (weight / totalWeight) * dealValue;
          attribution[source] = (attribution[source] || 0) + value;
        });
        break;
        
      case 'position_based':
        // 40% first, 40% last, 20% divided among middle
        if (sorted.length === 1) {
          attribution[sorted[0].source] = dealValue;
        } else if (sorted.length === 2) {
          attribution[sorted[0].source] = dealValue * 0.5;
          attribution[sorted[1].source] = dealValue * 0.5;
        } else {
          const firstValue = dealValue * 0.4;
          const lastValue = dealValue * 0.4;
          const middleValue = (dealValue * 0.2) / (sorted.length - 2);
          
          attribution[sorted[0].source] = (attribution[sorted[0].source] || 0) + firstValue;
          attribution[sorted[sorted.length - 1].source] = (attribution[sorted[sorted.length - 1].source] || 0) + lastValue;
          
          for (let i = 1; i < sorted.length - 1; i++) {
            attribution[sorted[i].source] = (attribution[sorted[i].source] || 0) + middleValue;
          }
        }
        break;
    }
    
    return attribution;
  }
  
  /**
   * Generate attribution report for all deals in a period
   */
  generateReport(
    deals: Array<{
      id: string;
      value: number;
      won_date: Date;
      touchpoints: AttributionTouchpoint[];
    }>
  ): AttributionReport {
    const bySource: Record<string, { deals: Set<string>; revenue: number }> = {};
    const byCampaign: Record<string, { deals: Set<string>; revenue: number }> = {};
    const paths: Map<string, { count: number; totalRevenue: number; totalDays: number }> = new Map();
    
    deals.forEach(deal => {
      const attribution = this.calculateAttribution(deal.touchpoints, deal.value);
      
      // Aggregate by source
      Object.entries(attribution).forEach(([source, value]) => {
        if (!bySource[source]) {
          bySource[source] = { deals: new Set(), revenue: 0 };
        }
        bySource[source].deals.add(deal.id);
        bySource[source].revenue += value;
      });
      
      // Aggregate by campaign
      deal.touchpoints.forEach(tp => {
        if (tp.utm_params.campaign) {
          const campaign = tp.utm_params.campaign;
          if (!byCampaign[campaign]) {
            byCampaign[campaign] = { deals: new Set(), revenue: 0 };
          }
          byCampaign[campaign].deals.add(deal.id);
          byCampaign[campaign].revenue += attribution[tp.source] || 0;
        }
      });
      
      // Track conversion paths
      if (deal.touchpoints.length > 0) {
        const sorted = [...deal.touchpoints].sort((a, b) => 
          a.timestamp.getTime() - b.timestamp.getTime()
        );
        const pathKey = sorted.map(tp => tp.source).join(' → ');
        const daysToConvert = (deal.won_date.getTime() - sorted[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
        
        if (!paths.has(pathKey)) {
          paths.set(pathKey, { count: 0, totalRevenue: 0, totalDays: 0 });
        }
        
        const pathData = paths.get(pathKey)!;
        pathData.count++;
        pathData.totalRevenue += deal.value;
        pathData.totalDays += daysToConvert;
      }
    });
    
    // Calculate totals
    const totalRevenue = deals.reduce((sum, d) => sum + d.value, 0);
    
    // Format by source
    const bySourceFormatted: AttributionReport['by_source'] = {};
    Object.entries(bySource).forEach(([source, data]) => {
      bySourceFormatted[source] = {
        deals: data.deals.size,
        revenue: data.revenue,
        attribution_percent: (data.revenue / totalRevenue) * 100,
        avg_deal_value: data.revenue / data.deals.size,
      };
    });
    
    // Format by campaign
    const byCampaignFormatted: AttributionReport['by_campaign'] = {};
    Object.entries(byCampaign).forEach(([campaign, data]) => {
      byCampaignFormatted[campaign] = {
        deals: data.deals.size,
        revenue: data.revenue,
      };
    });
    
    // Format conversion paths
    const conversionPaths = Array.from(paths.entries())
      .map(([pathStr, data]) => ({
        path: pathStr.split(' → '),
        count: data.count,
        avg_revenue: data.totalRevenue / data.count,
        avg_time_to_conversion_days: data.totalDays / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 paths
    
    return {
      total_deals: deals.length,
      total_revenue: totalRevenue,
      by_source: bySourceFormatted,
      by_campaign: byCampaignFormatted,
      conversion_paths: conversionPaths,
    };
  }
  
  /**
   * Calculate ROI for a campaign
   */
  calculateCampaignROI(
    campaign: string,
    cost: number,
    attributedRevenue: number
  ): {
    roi_percent: number;
    profit: number;
    roas: number; // Return on Ad Spend
  } {
    const profit = attributedRevenue - cost;
    const roiPercent = cost > 0 ? (profit / cost) * 100 : 0;
    const roas = cost > 0 ? attributedRevenue / cost : 0;
    
    return {
      roi_percent: roiPercent,
      profit,
      roas,
    };
  }
}

