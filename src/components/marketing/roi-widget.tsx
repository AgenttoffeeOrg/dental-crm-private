/**
 * MARKETING ROI WIDGET
 * Shows campaign performance metrics in Analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Target, Award } from 'lucide-react';
import { calculateAllCampaignsROI, getTotalMarketingRevenue, type CampaignROI } from '@/lib/marketing/roi-calculator';

interface MarketingROIWidgetProps {
  tenantId: string;
}

export function MarketingROIWidget({ tenantId }: MarketingROIWidgetProps) {
  const [topCampaigns, setTopCampaigns] = useState<CampaignROI[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchROIData();
  }, [tenantId]);

  async function fetchROIData() {
    const campaigns = await calculateAllCampaignsROI(tenantId);
    setTopCampaigns(campaigns.slice(0, 5)); // Top 5
    
    const revenue = await getTotalMarketingRevenue(tenantId);
    setTotalRevenue(revenue);
    
    setLoading(false);
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Loading Marketing ROI...
        </CardContent>
      </Card>
    );
  }

  if (topCampaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Marketing ROI
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-gray-500 bg-gray-50">
          No marketing campaigns with attributed revenue yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Marketing ROI Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Revenue */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <DollarSign className="h-5 w-5 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-gray-600 mt-1">Total Revenue</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Target className="h-5 w-5 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{topCampaigns.reduce((sum, c) => sum + c.dealsCreated, 0)}</div>
            <div className="text-xs text-gray-600 mt-1">Deals Created</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Award className="h-5 w-5 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{topCampaigns.reduce((sum, c) => sum + c.dealsWon, 0)}</div>
            <div className="text-xs text-gray-600 mt-1">Deals Won</div>
          </div>
        </div>

        {/* Top Campaigns */}
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Top Performing Campaigns</h4>
          <div className="space-y-2">
            {topCampaigns.map((campaign) => (
              <div key={campaign.campaignId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{campaign.campaignName}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {campaign.dealsCreated} deals • {campaign.dealsWon} won
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-purple-600">
                    {campaign.roiPercentage > 0 ? '+' : ''}{campaign.roiPercentage.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">{formatCurrency(campaign.totalRevenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




