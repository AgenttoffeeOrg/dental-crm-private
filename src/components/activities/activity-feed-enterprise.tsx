'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Video,
  Search,
  Filter,
  Plus,
  Edit,
  Check,
  X,
  ArrowDown,
  ArrowUp,
  Clock,
  CheckCircle2,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Upload,
  Paperclip
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, startOfDay, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { LogActivityPanel } from './log-activity-panel'

interface Activity {
  id: string
  type: 'call' | 'email' | 'whatsapp' | 'note' | 'sms' | 'meeting'
  direction?: 'inbound' | 'outbound'
  subject?: string
  snippet?: string
  occurred_at: string
  agent_user_id?: string
  outcome?: 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number' | 'completed' | 'cancelled'
  duration_seconds?: number
  attendees?: any[]
  is_edited?: boolean
  edited_at?: string
  rich_content?: string
  metadata?: any
}

interface ActivityFeedEnterpriseProps {
  contactId: string
  dealId?: string
  onActivityCreated?: () => void
  showAllContactActivities?: boolean
  tenantId?: string
}

const ACTIVITY_TYPES = {
  call: { icon: Phone, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  sms: { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  meeting: { icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  note: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
}

const OUTCOMES = {
  connected: { icon: CheckCircle2, label: 'Connected', color: 'text-green-600 bg-green-100' },
  voicemail: { icon: Voicemail, label: 'Voicemail', color: 'text-yellow-600 bg-yellow-100' },
  no_answer: { icon: PhoneMissed, label: 'No Answer', color: 'text-red-600 bg-red-100' },
  busy: { icon: PhoneOff, label: 'Busy', color: 'text-orange-600 bg-orange-100' },
  wrong_number: { icon: X, label: 'Wrong Number', color: 'text-gray-600 bg-gray-100' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-600 bg-green-100' },
  cancelled: { icon: X, label: 'Cancelled', color: 'text-red-600 bg-red-100' }
}

export function ActivityFeedEnterprise({
  contactId,
  dealId,
  onActivityCreated,
  showAllContactActivities = false,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: ActivityFeedEnterpriseProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editSnippet, setEditSnippet] = useState('')
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const supabase = createClient()

  const fetchActivities = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('activities')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })

      if (showAllContactActivities || !dealId) {
        query = query.eq('contact_id', contactId)
      } else {
        query = query.eq('deal_id', dealId)
      }

      const { data, error } = await query

      if (error) throw error

      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to load activities')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [contactId, dealId, showAllContactActivities])

  const startEdit = (activity: Activity) => {
    setEditingId(activity.id)
    setEditSubject(activity.subject || '')
    setEditSnippet(activity.snippet || '')
  }

  const saveEdit = async () => {
    if (!editingId) return

    // Optimistic update
    setActivities(prev => prev.map(a => 
      a.id === editingId 
        ? { ...a, subject: editSubject, snippet: editSnippet, is_edited: true }
        : a
    ))
    setEditingId(null)

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          subject: editSubject,
          snippet: editSnippet,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', editingId)

      if (error) throw error
      toast.success('Activity updated!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update')
      fetchActivities()
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSubject('')
    setEditSnippet('')
  }

  // Filter and search
  const filteredActivities = useMemo(() => {
    let filtered = activities

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType)
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.subject?.toLowerCase().includes(query) ||
        a.snippet?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [activities, filterType, searchQuery])

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: Activity[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': []
    }

    filteredActivities.forEach(activity => {
      const date = new Date(activity.occurred_at)
      if (isToday(date)) {
        groups['Today'].push(activity)
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(activity)
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        groups['This Week'].push(activity)
      } else {
        groups['Earlier'].push(activity)
      }
    })

    return groups
  }, [filteredActivities])

  const getTypeCounts = () => {
    return {
      all: activities.length,
      call: activities.filter(a => a.type === 'call').length,
      email: activities.filter(a => a.type === 'email').length,
      meeting: activities.filter(a => a.type === 'meeting').length,
      note: activities.filter(a => a.type === 'note').length,
      whatsapp: activities.filter(a => a.type === 'whatsapp').length,
      sms: activities.filter(a => a.type === 'sms').length
    }
  }

  const counts = getTypeCounts()

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const renderActivityCard = (activity: Activity) => {
    const typeConfig = ACTIVITY_TYPES[activity.type]
    const TypeIcon = typeConfig.icon
    const isEditing = editingId === activity.id
    const outcomeConfig = activity.outcome ? OUTCOMES[activity.outcome] : null
    const OutcomeIcon = outcomeConfig?.icon

    return (
      <Card key={activity.id} className={cn("hover:shadow-sm transition-all", typeConfig.border, "border")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Activity Type Icon */}
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0", typeConfig.bg)}>
              <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs font-medium", typeConfig.color)}>
                    {activity.type.toUpperCase()}
                  </Badge>
                  
                  {activity.direction && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      {activity.direction === 'inbound' ? (
                        <><ArrowDown className="h-3 w-3" /> Inbound</>
                      ) : (
                        <><ArrowUp className="h-3 w-3" /> Outbound</>
                      )}
                    </Badge>
                  )}

                  {activity.duration_seconds && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(activity.duration_seconds)}
                    </Badge>
                  )}

                  {outcomeConfig && (
                    <Badge variant="outline" className={cn("text-xs flex items-center gap-1", outcomeConfig.color)}>
                      <OutcomeIcon className="h-3 w-3" />
                      {outcomeConfig.label}
                    </Badge>
                  )}

                  {activity.is_edited && (
                    <span className="text-xs text-gray-400 italic">(edited)</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 flex-shrink-0">
                  {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                </div>
              </div>

              {/* Subject */}
              {isEditing ? (
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="mb-2 h-8 text-sm"
                  placeholder="Subject"
                />
              ) : activity.subject && (
                <h4 className="font-medium text-sm text-gray-900 mb-1">
                  {activity.subject}
                </h4>
              )}

              {/* Notes/Snippet */}
              {isEditing ? (
                <Textarea
                  value={editSnippet}
                  onChange={(e) => setEditSnippet(e.target.value)}
                  className="text-sm"
                  rows={3}
                  placeholder="Activity notes..."
                />
              ) : activity.snippet && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {activity.snippet}
                </p>
              )}

              {/* AI Insights */}
              {activity.metadata?.ai_sentiment && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-900">AI Insights</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Sentiment:</span>
                      {activity.metadata.ai_sentiment === 'positive' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Positive
                        </Badge>
                      )}
                      {activity.metadata.ai_sentiment === 'neutral' && (
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                          <Minus className="h-3 w-3 mr-1" />
                          Neutral
                        </Badge>
                      )}
                      {activity.metadata.ai_sentiment === 'negative' && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          Negative
                        </Badge>
                      )}
                    </div>
                    {activity.metadata.ai_key_points && (
                      <div className="mt-2">
                        <span className="text-gray-500">Key Points:</span>
                        <ul className="ml-4 mt-1 list-disc text-gray-700">
                          {activity.metadata.ai_key_points.slice(0, 2).map((point: string, idx: number) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="default" onClick={saveEdit} className="h-7 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(activity)}
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}

                {/* File attachment indicator */}
                {activity.metadata?.has_attachments && (
                  <Badge variant="secondary" className="text-xs">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {activity.metadata.attachment_count} file(s)
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading activities...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-gray-600">{activities.length} total activities</span>
            <div className="flex items-center gap-2">
              {counts.call > 0 && <Badge variant="secondary" className="text-xs"><Phone className="h-3 w-3 mr-1" />{counts.call}</Badge>}
              {counts.email > 0 && <Badge variant="secondary" className="text-xs"><Mail className="h-3 w-3 mr-1" />{counts.email}</Badge>}
              {counts.meeting > 0 && <Badge variant="secondary" className="text-xs"><Calendar className="h-3 w-3 mr-1" />{counts.meeting}</Badge>}
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => setLogPanelOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterType('all')}
            className="h-7 text-xs"
          >
            All <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'call' ? 'default' : 'ghost'}
            onClick={() => setFilterType('call')}
            className="h-7 text-xs"
          >
            Calls <Badge variant="secondary" className="ml-1">{counts.call}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'email' ? 'default' : 'ghost'}
            onClick={() => setFilterType('email')}
            className="h-7 text-xs"
          >
            Emails <Badge variant="secondary" className="ml-1">{counts.email}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'meeting' ? 'default' : 'ghost'}
            onClick={() => setFilterType('meeting')}
            className="h-7 text-xs"
          >
            Meetings <Badge variant="secondary" className="ml-1">{counts.meeting}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'note' ? 'default' : 'ghost'}
            onClick={() => setFilterType('note')}
            className="h-7 text-xs"
          >
            Notes <Badge variant="secondary" className="ml-1">{counts.note}</Badge>
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Timeline - Grouped by Date */}
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([groupName, groupActivities]) => {
          if (groupActivities.length === 0) return null

          return (
            <div key={groupName}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-sm font-semibold text-gray-700">{groupName}</h4>
                <div className="flex-1 h-px bg-gray-200"></div>
                <Badge variant="secondary" className="text-xs">{groupActivities.length}</Badge>
              </div>

              {/* Activities in this group */}
              <div className="space-y-3">
                {groupActivities.map(activity => (
                  <div key={activity.id} className="group">
                    {renderActivityCard(activity)}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredActivities.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterType !== 'all' ? 'No activities found' : 'No activities yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your filters or search'
                  : 'Log your first activity to get started'
                }
              </p>
              {!searchQuery && filterType === 'all' && (
                <Button size="sm" onClick={() => setLogPanelOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log First Activity
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Log Activity Panel */}
      <LogActivityPanel
        open={logPanelOpen}
        onClose={() => setLogPanelOpen(false)}
        contactId={contactId}
        dealId={dealId}
        onActivityLogged={() => {
          fetchActivities()
          onActivityCreated?.()
        }}
        tenantId={tenantId}
      />
    </div>
  )
}

