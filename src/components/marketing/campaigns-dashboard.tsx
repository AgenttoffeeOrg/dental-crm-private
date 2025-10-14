'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Grid3x3, 
  List, 
  Search,
  Filter,
  MoreVertical,
  Copy,
  Edit,
  BarChart3,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  channel: 'email' | 'sms' | 'whatsapp'
  status: 'draft' | 'scheduled' | 'active' | 'sent' | 'paused'
  subject_line: string | null
  metrics: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    unsubscribed: number
  }
  sent_at: string | null
  scheduled_send_time: string | null
  created_at: string
}

export function CampaignsDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterChannel, setFilterChannel] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'active' | 'sent'>('all')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const supabase = createClient()
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('[CAMPAIGNS] Error loading:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaign,
          id: undefined,
          name: `${campaign.name} (Copy)`,
          status: 'draft',
          sent_at: null,
          scheduled_send_time: null,
          metrics: {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            unsubscribed: 0
          },
          created_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Campaign duplicated!')
      loadCampaigns()
    } catch (error) {
      console.error('[CAMPAIGNS] Error duplicating:', error)
      toast.error('Failed to duplicate campaign')
    }
  }

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error
      toast.success('Campaign deleted')
      loadCampaigns()
    } catch (error) {
      console.error('[CAMPAIGNS] Error deleting:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesChannel = filterChannel === 'all' || campaign.channel === filterChannel
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus
    return matchesSearch && matchesChannel && matchesStatus
  })

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'whatsapp': return <Phone className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'sms': return 'bg-green-100 text-green-700 border-green-200'
      case 'whatsapp': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: Edit },
      scheduled: { color: 'bg-amber-100 text-amber-700', icon: Clock },
      active: { color: 'bg-green-100 text-green-700', icon: Send },
      sent: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
      paused: { color: 'bg-orange-100 text-orange-700', icon: XCircle }
    }

    const config = variants[status] || variants.draft
    const Icon = config.icon

    return (
      <Badge variant="outline" className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const calculateOpenRate = (metrics: Campaign['metrics']) => {
    if (metrics.sent === 0) return 0
    return ((metrics.opened / metrics.sent) * 100).toFixed(1)
  }

  const calculateClickRate = (metrics: Campaign['metrics']) => {
    if (metrics.sent === 0) return 0
    return ((metrics.clicked / metrics.sent) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters & Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Channel: {filterChannel === 'all' ? 'All' : filterChannel.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterChannel('all')}>
                All Channels
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterChannel('email')}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterChannel('sms')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterChannel('whatsapp')}>
                <Phone className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Status: {filterStatus === 'all' ? 'All' : filterStatus}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus('draft')}>Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('scheduled')}>Scheduled</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('sent')}>Sent</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Campaigns Display */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 text-sm mb-4">
              {searchQuery || filterChannel !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first campaign to get started'}
            </p>
            {!searchQuery && filterChannel === 'all' && filterStatus === 'all' && (
              <Button asChild>
                <Link href="/marketing/campaigns/create">Create Campaign</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Channel Badge */}
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${getChannelColor(campaign.channel)}`}>
                      {getChannelIcon(campaign.channel)}
                    </div>

                    {/* Campaign Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      {campaign.subject_line && (
                        <p className="text-sm text-gray-600 truncate">{campaign.subject_line}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {campaign.sent_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Sent {new Date(campaign.sent_at).toLocaleDateString()}
                          </span>
                        )}
                        {campaign.scheduled_send_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Scheduled for {new Date(campaign.scheduled_send_time).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics */}
                    {campaign.status !== 'draft' && campaign.metrics.sent > 0 && (
                      <div className="flex items-center gap-6 px-6 border-l border-gray-200">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{campaign.metrics.sent.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Sent</p>
                        </div>
                        {campaign.channel === 'email' && (
                          <>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">{calculateOpenRate(campaign.metrics)}%</p>
                              <p className="text-xs text-gray-500">Open Rate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{calculateClickRate(campaign.metrics)}%</p>
                              <p className="text-xs text-gray-500">Click Rate</p>
                            </div>
                          </>
                        )}
                        {campaign.channel === 'sms' && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{campaign.metrics.delivered.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Delivered</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {campaign.status === 'draft' && (
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${getChannelColor(campaign.channel)}`}>
                      {getChannelIcon(campaign.channel)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Campaign Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>

                  {/* Metrics */}
                  {campaign.status !== 'draft' && campaign.metrics.sent > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-lg font-bold text-gray-900">{campaign.metrics.sent.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Sent</p>
                        </div>
                        {campaign.channel === 'email' && (
                          <div>
                            <p className="text-lg font-bold text-blue-600">{calculateOpenRate(campaign.metrics)}%</p>
                            <p className="text-xs text-gray-500">Open Rate</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    {campaign.sent_at
                      ? `Sent ${new Date(campaign.sent_at).toLocaleDateString()}`
                      : campaign.scheduled_send_time
                      ? `Scheduled for ${new Date(campaign.scheduled_send_time).toLocaleDateString()}`
                      : `Created ${new Date(campaign.created_at).toLocaleDateString()}`}
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



