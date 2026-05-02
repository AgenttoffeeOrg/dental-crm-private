/**
 * CONTACT MARKETING TAB
 * Shows marketing engagement, campaigns, and journeys for a contact
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, TrendingUp, Zap, ExternalLink, MousePointerClick } from 'lucide-react';

interface ContactMarketingTabProps {
  contactId: string;
  tenantId: string;
}

export function ContactMarketingTab({ contactId, tenantId }: ContactMarketingTabProps) {
  const [engagementScore, setEngagementScore] = useState<number>(0);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketingData();
  }, [contactId]);

  async function fetchMarketingData() {
    const supabase = createClient();
    
    // Get engagement score
    const { data: contact } = await supabase
      .from('contacts')
      .select('marketing_engagement_score, lead_source_campaign_id, last_marketing_interaction_at')
      .eq('id', contactId)
      .single();

    if (contact) {
      setEngagementScore(contact.marketing_engagement_score || 0);
    }

    // Get campaigns this contact received
    const { data: campaignActivities } = await supabase
      .from('activities')
      .select('marketing_campaign_id, marketing_event_type, occurred_at, description')
      .eq('contact_id', contactId)
      .not('marketing_campaign_id', 'is', null)
      .order('occurred_at', { ascending: false })
      .limit(10);

    if (campaignActivities) {
      setCampaigns(campaignActivities);
    }

    // Get active journeys
    const { data: activeJourneys } = await supabase
      .from('marketing_journey_runs')
      .select('journey_id, state, node_index, started_at, marketing_journeys(name)')
      .eq('contact_id', contactId)
      .eq('state', 'running');

    if (activeJourneys) {
      setJourneys(activeJourneys);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading marketing data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Engagement Score */}
      <Card className="p-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Engagement Score</h3>
            <p className="text-sm text-gray-600">Based on email opens, clicks, and interactions</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-purple-600">{engagementScore}</div>
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
          </div>
        </div>
        
        {/* Engagement Level */}
        <div className="mt-4">
          <Badge 
            variant="outline" 
            className={engagementScore >= 70 ? "bg-green-50 text-green-700 border-green-200" : 
                       engagementScore >= 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                       "bg-gray-50 text-gray-700 border-gray-200"}
          >
            {engagementScore >= 70 ? '🔥 Highly Engaged' : 
             engagementScore >= 40 ? '👍 Moderately Engaged' :
             '😴 Low Engagement'}
          </Badge>
        </div>
      </Card>

      {/* Campaigns Received */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-purple-600" />
          Campaigns Received ({campaigns.length})
        </h3>
        
        {campaigns.length === 0 ? (
          <Card className="p-6 text-center text-gray-500 bg-gray-50">
            No campaigns received yet
          </Card>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign, idx) => (
              <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {campaign.marketing_event_type === 'email_opened' && (
                        <MousePointerClick className="h-3.5 w-3.5 text-green-600" />
                      )}
                      {campaign.marketing_event_type === 'link_clicked' && (
                        <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {campaign.marketing_event_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{campaign.description || 'Marketing campaign interaction'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(campaign.occurred_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Journeys */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          Active Journeys ({journeys.length})
        </h3>
        
        {journeys.length === 0 ? (
          <Card className="p-6 text-center text-gray-500 bg-gray-50">
            No active automation journeys
          </Card>
        ) : (
          <div className="space-y-2">
            {journeys.map((journey, idx) => (
              <Card key={idx} className="p-4 hover:shadow-md transition-shadow border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {(journey as any).marketing_journeys?.name || 'Marketing Journey'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Step {journey.node_index + 1} • {journey.state}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Active
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Mail className="h-4 w-4 mr-2" />
          Launch Campaign
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Zap className="h-4 w-4 mr-2" />
          Add to Journey
        </Button>
      </div>
    </div>
  );
}




