/**
 * DEAL MARKETING SOURCE SECTION
 * Shows marketing attribution and touchpoint history in deal detail
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MousePointerClick, ExternalLink, FileText, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { getAttribution, type AttributionResult } from '@/lib/marketing/attribution';
import Link from 'next/link';

interface DealMarketingSourceSectionProps {
  dealId: string;
  marketingSourceType?: string;
  marketingSourceId?: string;
  marketingSourceName?: string;
  marketingTouchpoints?: any[];
}

export function DealMarketingSourceSection({
  dealId,
  marketingSourceType,
  marketingSourceId,
  marketingSourceName,
  marketingTouchpoints = [],
}: DealMarketingSourceSectionProps) {
  const [attribution, setAttribution] = useState<AttributionResult | null>(null);
  const [showTouchpoints, setShowTouchpoints] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (marketingSourceType) {
      fetchAttribution();
    } else {
      setLoading(false);
    }
  }, [dealId]);

  async function fetchAttribution() {
    const data = await getAttribution(dealId);
    setAttribution(data);
    setLoading(false);
  }

  // If no marketing source, don't show anything
  if (!marketingSourceType) {
    return null;
  }

  const getSourceIcon = () => {
    switch (marketingSourceType) {
      case 'campaign': return <Mail className="h-4 w-4" />;
      case 'form': return <FileText className="h-4 w-4" />;
      case 'landing_page': return <MousePointerClick className="h-4 w-4" />;
      case 'journey': return <Zap className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getSourceLabel = () => {
    switch (marketingSourceType) {
      case 'campaign': return 'Email Campaign';
      case 'form': return 'Marketing Form';
      case 'landing_page': return 'Landing Page';
      case 'journey': return 'Marketing Journey';
      default: return 'Marketing Source';
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {getSourceIcon()}
            Marketing Source
          </span>
          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
            {getSourceLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Name */}
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {marketingSourceName || getSourceLabel()}
          </div>
          {marketingSourceId && (
            <Link
              href={`/marketing/campaigns/${marketingSourceId}`}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              View in Marketing
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Attribution Model */}
        {attribution && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Attribution</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Model:</span>
              <Badge variant="outline" className="text-xs">
                {attribution.model.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
            {attribution.firstTouchCampaignName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">First Touch:</span>
                <span className="text-gray-900 text-xs">{attribution.firstTouchCampaignName}</span>
              </div>
            )}
            {attribution.lastTouchCampaignName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Touch:</span>
                <span className="text-gray-900 text-xs">{attribution.lastTouchCampaignName}</span>
              </div>
            )}
          </div>
        )}

        {/* Touchpoints */}
        {marketingTouchpoints && marketingTouchpoints.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTouchpoints(!showTouchpoints)}
              className="w-full justify-between text-xs"
            >
              <span>Touchpoint History ({marketingTouchpoints.length})</span>
              {showTouchpoints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {showTouchpoints && (
              <ScrollArea className="h-48 mt-2">
                <div className="space-y-2">
                  {marketingTouchpoints.map((touchpoint: any, idx: number) => (
                    <Card key={idx} className="p-3 bg-white">
                      <div className="flex items-start gap-2">
                        <Mail className="h-3 w-3 text-purple-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {touchpoint.campaignName || 'Marketing Campaign'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {touchpoint.type?.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(touchpoint.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Insight */}
        <div className="text-xs text-purple-700 bg-purple-50 p-2 rounded">
          💡 This deal was generated through Marketing. Attribution tracking is active.
        </div>
      </CardContent>
    </Card>
  );
}


