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
  Paperclip,
  Target,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { toast } from 'sonner'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, startOfDay, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { LogActivityPanel } from './log-activity-panel'
import { DealTasks } from '@/components/deals/deal-tasks'
import { CheckSquare } from 'lucide-react'
import { ActivityDetailSlideIn } from '@/components/communications/activity-detail-slide-in'
import { EmailComposerPanel } from '@/components/communications/email-composer-panel'
import { SMSComposerPanel } from '@/components/communications/sms-composer-panel'
import { WhatsAppComposerPanel } from '@/components/communications/whatsapp-composer-panel'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'

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
  // Context data (from view)
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  deal_id?: string
  deal_title?: string
  deal_value?: number
  deal_stage?: string
  deal_pipeline?: string
  agent_name?: string
  integration_provider?: string
  message_status?: string
}

interface ActivityFeedEnterpriseProps {
  contactId: string
  dealId?: string
  onActivityCreated?: () => void
  showAllContactActivities?: boolean
  tenantId?: string
  userId?: string
  contactEmail?: string
  contactPhone?: string
  contactName?: string
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
  tenantId,
  userId,
  contactEmail,
  contactPhone,
  contactName
}: ActivityFeedEnterpriseProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editSnippet, setEditSnippet] = useState('')
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  
  // Communication panels state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [emailComposerOpen, setEmailComposerOpen] = useState(false)
  const [smsComposerOpen, setSmsComposerOpen] = useState(false)
  const [whatsappComposerOpen, setWhatsappComposerOpen] = useState(false)
  const [callDialerOpen, setCallDialerOpen] = useState(false)
  const [composerContext, setComposerContext] = useState<any>({})
  
  const supabase = createClient()

  const fetchActivities = async () => {
    try {
      setLoading(true)

      // Try the enhanced view first, fall back to regular table if not migrated
      let query = supabase
        .from('activities_with_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })

      if (showAllContactActivities || !dealId) {
        query = query.eq('contact_id', contactId)
      } else {
        query = query.eq('deal_id', dealId)
      }

      const { data, error } = await query

      // If view doesn't exist, fall back to regular activities table
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        console.log('[Activities] View not found, using regular activities table')
        
        let fallbackQuery = supabase
          .from('activities')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('occurred_at', { ascending: false })

        if (showAllContactActivities || !dealId) {
          fallbackQuery = fallbackQuery.eq('contact_id', contactId)
        } else {
          fallbackQuery = fallbackQuery.eq('deal_id', dealId)
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery

        if (fallbackError) throw fallbackError
        setActivities(fallbackData || [])
      } else if (error) {
        throw error
      } else {
        setActivities(data || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', JSON.stringify(error))
      toast.error('Failed to load activities', {
        description: 'Run the database migration to enable enhanced features'
      })
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
      <div 
        key={activity.id} 
        className={cn(
          "group relative p-4 rounded-lg border border-gray-200 bg-white transition-all cursor-pointer shadow-sm",
          "hover:shadow-md hover:border-blue-300 hover:bg-blue-50/20"
        )}
        onClick={() => setSelectedActivityId(activity.id)}
      >
        <div className="flex items-start gap-3">
          {/* Activity Type Icon - Smaller, Sleeker */}
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", typeConfig.bg)}>
            <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
          </div>

          {/* Activity Content - Ultra-Compact Smart Layout */}
          <div className="flex-1 min-w-0">
            {/* Single Line: Subject + Time */}
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 truncate">
                  {activity.subject || `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} Activity`}
                </h4>
                {activity.direction && (
                  <span className={cn("text-xs", activity.direction === 'inbound' ? 'text-blue-600' : 'text-gray-500')}>
                    {activity.direction === 'inbound' ? '↓' : '↑'}
                  </span>
                )}
                {activity.duration_seconds && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {formatDuration(activity.duration_seconds)}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
              </span>
            </div>

            {/* AI SMART BADGES - ALWAYS SHOW with "Not Available" placeholders */}
            <div className="space-y-1.5 mb-2">
              {/* PURPOSE & OUTCOME Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* PURPOSE Badge - Show value or "Not Available" */}
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md border", 
                  activity.metadata?.ai_purpose 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-gray-50 border-gray-200 border-dashed"
                )}>
                  <Target className={cn("h-3.5 w-3.5 flex-shrink-0", activity.metadata?.ai_purpose ? "text-blue-600" : "text-gray-400")} />
                  <span className={cn("text-xs font-semibold", activity.metadata?.ai_purpose ? "text-blue-700" : "text-gray-400 italic")}>
                    {activity.metadata?.ai_purpose || "Purpose: Not available"}
                  </span>
                </div>
                
                {/* OUTCOME Badge - Show result, "Add" button, or "Not Available" */}
                {activity.type === 'call' ? (
                  activity.metadata?.ai_outcome ? (
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold", 
                      activity.metadata.ai_outcome.toLowerCase().includes('booked') || activity.metadata.ai_outcome.toLowerCase().includes('approved') || activity.metadata.ai_outcome.toLowerCase().includes('scheduled') ? 'bg-green-50 border-green-200 text-green-700' : 
                      activity.metadata.ai_outcome.toLowerCase().includes('follow') || activity.metadata.ai_outcome.toLowerCase().includes('think') || activity.metadata.ai_outcome.toLowerCase().includes('callback') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                      activity.metadata.ai_outcome.toLowerCase().includes('declined') || activity.metadata.ai_outcome.toLowerCase().includes('not interested') ? 'bg-red-50 border-red-200 text-red-700' :
                      'bg-blue-50 border-blue-200 text-blue-700'
                    )}>
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs">
                        {activity.metadata.ai_outcome}
                      </span>
                    </div>
                  ) : activity.metadata?.needs_outcome_update && activity.outcome === 'connected' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedActivityId(activity.id)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Call Outcome
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 border-dashed">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="text-xs text-gray-400 italic">
                        Outcome: Not available
                      </span>
                    </div>
                  )
                ) : (activity.type === 'email' || activity.type === 'sms' || activity.type === 'whatsapp') && activity.metadata?.ai_outcome ? (
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold",
                    activity.message_status === 'delivered' || activity.message_status === 'read' ? 'bg-green-50 border-green-200 text-green-700' :
                    activity.message_status === 'sent' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                    'bg-gray-50 border-gray-200 text-gray-700'
                  )}>
                    {activity.message_status === 'delivered' || activity.message_status === 'read' ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <Mail className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span className="text-xs">
                      {activity.metadata.ai_outcome}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* AI SUMMARY - Show or "Not Available" */}
              {activity.metadata?.ai_summary ? (
                <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-purple-50/50 border border-purple-100">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700 leading-relaxed">
                    {activity.metadata.ai_summary}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-200 border-dashed">
                  <Sparkles className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 italic">
                    Summary: Not available
                  </p>
                </div>
              )}
            </div>

            {/* Snippet - One Line Only */}
            {activity.snippet && (
              <p className="text-xs text-gray-600 line-clamp-1 mb-2">
                {activity.snippet}
              </p>
            )}

            {/* Smart Metadata Row - One Line */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Deal Badge (most important context) */}
              {activity.deal_title && (
                <a 
                  href={`/pipeline?deal=${activity.deal_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md hover:bg-purple-100 transition-colors font-medium"
                >
                  {activity.deal_title}
                  {activity.deal_value && ` • $${(activity.deal_value / 100).toLocaleString()}`}
                </a>
              )}

              {/* Integration Provider (subtle) */}
              {activity.integration_provider && (
                <span className="text-xs text-gray-400">
                  via {activity.integration_provider.split('_')[0]}
                </span>
              )}
            </div>

            {/* Hover Actions - Bottom of Card, No Overlap */}
            <div className="mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              {activity.type === 'email' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setComposerContext({
                      to: activity.contact_email,
                      contactId: activity.contact_id,
                      dealId: activity.deal_id,
                      contactName: activity.contact_name,
                      replyToActivityId: activity.id
                    })
                    setEmailComposerOpen(true)
                  }}
                  className="h-7 px-3 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Mail className="h-3 w-3 mr-1.5" />
                  Reply
                </Button>
              )}

              {(activity.type === 'call' || activity.type === 'sms') && activity.contact_phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setComposerContext({
                      phoneNumber: activity.contact_phone,
                      contactId: activity.contact_id,
                      dealId: activity.deal_id,
                      contactName: activity.contact_name
                    })
                    setCallDialerOpen(true)
                  }}
                  className="h-7 px-3 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Phone className="h-3 w-3 mr-1.5" />
                  Call
                </Button>
              )}

              {activity.type === 'whatsapp' && activity.contact_phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setComposerContext({
                      to: activity.contact_phone,
                      contactId: activity.contact_id,
                      dealId: activity.deal_id,
                      contactName: activity.contact_name
                    })
                    setWhatsappComposerOpen(true)
                  }}
                  className="h-7 px-3 text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  <MessageSquare className="h-3 w-3 mr-1.5" />
                  Reply
                </Button>
              )}

            </div>
          </div>
        </div>
      </div>
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

  // If showing tasks, render DealTasks component
  if (showTasks) {
    if (!dealId) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
            <Button size="sm" variant="outline" onClick={() => setShowTasks(false)}>
              Back to Activities
            </Button>
          </div>
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Create a deal first to manage tasks</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <Button size="sm" variant="outline" onClick={() => setShowTasks(false)}>
            Back to Activities
          </Button>
        </div>
        <DealTasks
          dealId={dealId}
          contactId={contactId}
          onTaskUpdate={onActivityCreated}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats & Quick Actions */}
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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowTasks(true)}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </Button>
          <Button size="sm" onClick={() => {
            setLogPanelOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        </div>
      </div>

      {/* Quick Communication Actions */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 bg-white hover:bg-blue-50 hover:border-blue-300"
          onClick={(e) => {
            e.stopPropagation()
            setComposerContext({
              to: contactEmail,
              contactId,
              dealId,
              contactName
            })
            setEmailComposerOpen(true)
          }}
          disabled={!contactEmail}
        >
          <Mail className="h-4 w-4 mr-1.5 text-blue-600" />
          Send Email
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 bg-white hover:bg-green-50 hover:border-green-300"
          onClick={(e) => {
            e.stopPropagation()
            setComposerContext({
              phoneNumber: contactPhone,
              contactId,
              dealId,
              contactName
            })
            setCallDialerOpen(true)
          }}
          disabled={!contactPhone}
        >
          <Phone className="h-4 w-4 mr-1.5 text-green-600" />
          Make Call
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 bg-white hover:bg-purple-50 hover:border-purple-300"
          onClick={(e) => {
            e.stopPropagation()
            setComposerContext({
              to: contactPhone,
              contactId,
              dealId,
              contactName
            })
            setSmsComposerOpen(true)
          }}
          disabled={!contactPhone}
        >
          <MessageSquare className="h-4 w-4 mr-1.5 text-purple-600" />
          Send SMS
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 bg-white hover:bg-emerald-50 hover:border-emerald-300"
          onClick={(e) => {
            e.stopPropagation()
            setComposerContext({
              to: contactPhone,
              contactId,
              dealId,
              contactName
            })
            setWhatsappComposerOpen(true)
          }}
          disabled={!contactPhone}
        >
          <MessageSquare className="h-4 w-4 mr-1.5 text-emerald-600" />
          WhatsApp
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
        defaultType={filterType === 'all' ? 'call' : filterType}
        onActivityLogged={() => {
          fetchActivities()
          onActivityCreated?.()
        }}
        tenantId={tenantId}
      />

      {/* Activity Detail Slide-In */}
      <ActivityDetailSlideIn
        isOpen={!!selectedActivityId}
        onClose={() => setSelectedActivityId(null)}
        activityId={selectedActivityId || ''}
        tenantId={tenantId}
        userId={userId}
      />

      {/* Email Composer */}
      <EmailComposerPanel
        isOpen={emailComposerOpen}
        onClose={() => {
          setEmailComposerOpen(false)
          // Only refresh if actually sent (no page reload on cancel)
          if (onActivityCreated) {
            setTimeout(() => {
              fetchActivities()
              onActivityCreated()
            }, 100)
          }
        }}
        to={composerContext.to}
        contactId={composerContext.contactId}
        dealId={composerContext.dealId}
        replyToActivityId={composerContext.replyToActivityId}
        tenantId={tenantId}
        userId={userId}
      />

      {/* SMS Composer */}
      <SMSComposerPanel
        isOpen={smsComposerOpen}
        onClose={() => {
          setSmsComposerOpen(false)
          // No automatic refresh to avoid page reload
        }}
        to={composerContext.to}
        contactId={composerContext.contactId}
        dealId={composerContext.dealId}
        tenantId={tenantId}
        userId={userId}
      />

      {/* WhatsApp Composer */}
      <WhatsAppComposerPanel
        isOpen={whatsappComposerOpen}
        onClose={() => {
          setWhatsappComposerOpen(false)
          // No automatic refresh
        }}
        to={composerContext.to}
        contactId={composerContext.contactId}
        dealId={composerContext.dealId}
        tenantId={tenantId}
        userId={userId}
      />

      {/* Click-to-Call Dialer */}
      <ClickToCallDialer
        isOpen={callDialerOpen}
        onClose={() => {
          setCallDialerOpen(false)
          // No automatic refresh
        }}
        phoneNumber={composerContext.phoneNumber || ''}
        contactName={composerContext.contactName}
        contactId={composerContext.contactId}
        dealId={composerContext.dealId}
        tenantId={tenantId}
        userId={userId}
      />
    </div>
  )
}

