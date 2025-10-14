'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, MousePointer, Eye, XCircle, UserX } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { MarketingEvent, MarketingSend } from '@/types/marketing'

interface ContactMarketingTimelineProps {
  contactId: string
  tenantId?: string
}

export function ContactMarketingTimeline({ 
  contactId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: ContactMarketingTimelineProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchMarketingEvents()
  }, [contactId])

  const fetchMarketingEvents = async () => {
    try {
      setLoading(true)
      
      // Fetch sends
      const { data: sends } = await supabase
        .from('marketing_sends')
        .select('*, campaign:marketing_campaigns(name)')
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: false })

      // Fetch events  
      const { data: eventData } = await supabase
        .from('marketing_events')
        .select('*, campaign:marketing_campaigns(name)')
        .eq('contact_id', contactId)
        .order('occurred_at', { ascending: false })

      // Combine and sort
      const combined = [
        ...(sends || []).map(s => ({ ...s, eventType: 'sent', timestamp: s.sent_at })),
        ...(eventData || []).map(e => ({ ...e, timestamp: e.occurred_at }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setEvents(combined)
    } catch (error) {
      console.error('[MARKETING TIMELINE] Error fetching:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'sent':
      case 'delivered':
        return <Mail className="h-4 w-4" />
      case 'open':
        return <Eye className="h-4 w-4" />
      case 'click':
        return <MousePointer className="h-4 w-4" />
      case 'bounce':
        return <XCircle className="h-4 w-4" />
      case 'unsubscribe':
        return <UserX className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'sent':
      case 'delivered':
        return 'bg-blue-100 text-blue-700'
      case 'open':
        return 'bg-green-100 text-green-700'
      case 'click':
        return 'bg-purple-100 text-purple-700'
      case 'bounce':
        return 'bg-red-100 text-red-700'
      case 'unsubscribe':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading marketing activity...</div>
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Mail className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No marketing activity yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Marketing Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getEventColor(event.event_type || event.eventType)}`}>
                {getEventIcon(event.event_type || event.eventType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {event.event_type || event.eventType}
                  </Badge>
                  {event.campaign?.name && (
                    <Link 
                      href={`/marketing/campaigns/${event.campaign_id}`}
                      className="text-xs text-blue-600 hover:underline truncate"
                    >
                      {event.campaign.name}
                    </Link>
                  )}
                </div>
                {event.subject_line && (
                  <p className="text-sm text-gray-900 mb-1">{event.subject_line}</p>
                )}
                {event.link_url && (
                  <p className="text-xs text-gray-600 truncate">Clicked: {event.link_url}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}




