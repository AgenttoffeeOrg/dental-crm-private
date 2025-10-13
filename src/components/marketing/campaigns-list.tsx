'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Send, 
  Calendar,
  CheckCircle,
  Pause,
  Play,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { CampaignWithRelations } from '@/types/marketing'

interface CampaignsListProps {
  tenantId?: string
}

export function CampaignsList({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<CampaignWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select(`
          *,
          segment:marketing_segments(*),
          template:marketing_templates(*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        // Check if table doesn't exist yet (migrations not run)
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('[CAMPAIGNS] Marketing tables not yet created - run migrations')
          setCampaigns([])
          return
        }
        throw error
      }
      setCampaigns(data || [])
    } catch (error) {
      console.error('[CAMPAIGNS] Error fetching:', error)
      // Don't show error toast if tables don't exist yet
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      scheduled: { color: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
      sending: { color: 'bg-yellow-100 text-yellow-700', label: 'Sending...' },
      sent: { color: 'bg-green-100 text-green-700', label: 'Sent' },
      paused: { color: 'bg-orange-100 text-orange-700', label: 'Paused' },
    }
    
    const variant = variants[status] || variants.draft
    return <Badge className={variant.color}>{variant.label}</Badge>
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeTab === 'all') return true
    if (activeTab === 'draft') return campaign.status === 'draft'
    if (activeTab === 'scheduled') return campaign.status === 'scheduled'
    if (activeTab === 'sent') return campaign.status === 'sent'
    return true
  })

  const counts = {
    all: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            All <Badge variant="secondary" className="ml-2">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts <Badge variant="secondary" className="ml-2">{counts.draft}</Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled <Badge variant="secondary" className="ml-2">{counts.scheduled}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent <Badge variant="secondary" className="ml-2">{counts.sent}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredCampaigns.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaigns Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first campaign to start reaching your audience
            </p>
            <Link href="/marketing/campaigns/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Campaign
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/marketing/campaigns/${campaign.id}`}>
                        <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600">
                          {campaign.name}
                        </h3>
                      </Link>
                      {getStatusBadge(campaign.status)}
                      {campaign.is_ab_test && (
                        <Badge variant="outline" className="text-xs">A/B Test</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>To: {campaign.segment?.name || 'No segment'}</span>
                      <span>•</span>
                      <span>{campaign.target_count || 0} recipients</span>
                      {campaign.schedule_at && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(campaign.schedule_at), { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Stats */}
                    {campaign.status === 'sent' && (
                      <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-gray-500">Sent</p>
                          <p className="text-lg font-semibold">{campaign.total_sends}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Opens</p>
                          <p className="text-lg font-semibold">
                            {campaign.total_unique_opens} 
                            <span className="text-sm text-gray-500 ml-1">
                              ({campaign.total_sends > 0 ? Math.round((campaign.total_unique_opens / campaign.total_sends) * 100) : 0}%)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Clicks</p>
                          <p className="text-lg font-semibold">
                            {campaign.total_unique_clicks}
                            <span className="text-sm text-gray-500 ml-1">
                              ({campaign.total_sends > 0 ? Math.round((campaign.total_unique_clicks / campaign.total_sends) * 100) : 0}%)
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/marketing/campaigns/${campaign.id}`}>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

