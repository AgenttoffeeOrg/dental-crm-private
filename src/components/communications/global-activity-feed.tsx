'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Phone, Mail, MessageSquare, Calendar, FileText, Search,
  Filter, ChevronDown, TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const ACTIVITY_ICONS = {
  call: { icon: Phone, color: 'text-green-600', bg: 'bg-green-50' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  sms: { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  meeting: { icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
  note: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50' }
}

export function GlobalActivityFeed({ tenantId }: { tenantId?: string }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    loadActivities()
  }, [filterType, limit])

  const loadActivities = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('activities_with_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })
        .limit(limit)

      // Apply filter
      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }

      const { data, error } = await query

      // Fallback to regular activities if view doesn't exist
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        const { data: fallbackData } = await supabase
          .from('activities')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('occurred_at', { ascending: false })
          .limit(limit)

        setActivities(fallbackData || [])
      } else if (!error) {
        setActivities(data || [])
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(a => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      a.subject?.toLowerCase().includes(query) ||
      a.snippet?.toLowerCase().includes(query) ||
      a.contact_name?.toLowerCase().includes(query) ||
      a.deal_title?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search all activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setFilterType('all')}>
          All ({activities.length})
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'call', 'email', 'sms', 'whatsapp', 'meeting', 'note'].map(type => (
          <Button
            key={type}
            variant={filterType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </div>

      {/* Activity Stream */}
      <div className="space-y-2">
        {filteredActivities.map((activity) => {
          const config = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || ACTIVITY_ICONS.note
          const Icon = config.icon

          return (
            <Card key={activity.id} className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bg)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{activity.subject || activity.type}</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{activity.snippet}</p>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {activity.contact_name && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {activity.contact_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-600">{activity.contact_name}</span>
                        </div>
                      )}
                      {activity.deal_title && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Badge variant="secondary" className="text-xs">{activity.deal_title}</Badge>
                        </>
                      )}
                      {activity.integration_provider && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Badge variant="outline" className="text-xs">via {activity.integration_provider}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredActivities.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">No activities found</p>
            </CardContent>
          </Card>
        )}

        {/* Load More */}
        {filteredActivities.length >= limit && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLimit(limit + 50)}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Load More
          </Button>
        )}
      </div>
    </div>
  )
}


