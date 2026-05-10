'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Phone, 
  Mail, 
  MessageSquare,
  Calendar,
  FileText,
  Edit2,
  Check,
  X,
  Plus,
  Clock,
  Users,
  Reply
} from 'lucide-react'
import { CreateActivityDialog } from '@/components/activities/create-activity-dialog'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns'

interface Activity {
  id: string
  type: 'call' | 'email' | 'whatsapp' | 'note' | 'sms' | 'meeting'
  direction?: 'inbound' | 'outbound'
  subject?: string
  snippet?: string
  /**
   * Long-form body. ingestLead-driven inbound rows (web form, Google lead
   * form, SMS, WhatsApp) write the channel message text here, not into
   * `snippet`. Surfaced as a fallback so operators can read the raw inbound
   * content in the timeline.
   */
  description?: string
  occurred_at: string
  agent_name?: string
  outcome?: string
  duration_seconds?: number
  attendees?: any[]
  file_count?: number
  artifact_count?: number
}

interface ActivityTimelineEnterpriseProps {
  activities: Activity[]
  contactId: string
  dealId?: string
  onEdit?: (activityId: string, updates: { subject?: string; snippet?: string }) => void
  onReply?: (activityId: string) => void
  onActivityCreated?: () => void
}

const ACTIVITY_CONFIG = {
  call: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Call' },
  email: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Email' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'WhatsApp' },
  sms: { icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'SMS' },
  meeting: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Meeting' },
  note: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50', label: 'Note' }
}

const OUTCOME_LABELS = {
  connected: { label: 'Connected', color: 'text-green-700 bg-green-100' },
  voicemail: { label: 'Voicemail', color: 'text-yellow-700 bg-yellow-100' },
  no_answer: { label: 'No Answer', color: 'text-gray-700 bg-gray-100' },
  busy: { label: 'Busy', color: 'text-orange-700 bg-orange-100' },
  wrong_number: { label: 'Wrong Number', color: 'text-red-700 bg-red-100' },
  completed: { label: 'Completed', color: 'text-green-700 bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700 bg-red-100' }
}

export function ActivityTimelineEnterprise({ 
  activities, 
  contactId,
  dealId,
  onEdit, 
  onReply,
  onActivityCreated 
}: ActivityTimelineEnterpriseProps) {
  // Phase 2b.1.b.2: Forward tenantId so the dialog's anon-key insert
  // satisfies the activities RLS WITH CHECK. Sibling fix to the deal-page
  // CreateActivityDialog wired up in 2b.1.b.1 (commit 248ca74).
  const { orgId } = useTenantContext()
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedSnippet, setEditedSnippet] = useState('')
  const [createActivityOpen, setCreateActivityOpen] = useState(false)

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const filtered = selectedFilter === 'all' 
      ? activities 
      : activities.filter(a => a.type === selectedFilter)

    const groups: Record<string, Activity[]> = {}
    
    filtered.forEach(activity => {
      const date = new Date(activity.occurred_at)
      let groupKey = ''
      
      if (isToday(date)) {
        groupKey = 'Today'
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday'
      } else if (isThisWeek(date)) {
        groupKey = 'This Week'
      } else {
        groupKey = format(date, 'MMMM yyyy')
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(activity)
    })
    
    return groups
  }, [activities, selectedFilter])

  // Count activities by type
  const activityCounts = useMemo(() => {
    const counts = {
      all: activities.length,
      call: 0,
      email: 0,
      meeting: 0,
      note: 0,
      whatsapp: 0,
      sms: 0
    }
    
    activities.forEach(a => {
      if (a.type in counts) {
        counts[a.type as keyof typeof counts]++
      }
    })
    
    return counts
  }, [activities])

  const startEditActivity = (activity: Activity) => {
    setEditingActivity(activity.id)
    setEditedSubject(activity.subject || '')
    setEditedSnippet(activity.snippet || '')
  }

  const saveActivityEdit = async () => {
    if (editingActivity) {
      await onEdit?.(editingActivity, {
        subject: editedSubject,
        snippet: editedSnippet
      })
      setEditingActivity(null)
    }
  }

  const cancelEditActivity = () => {
    setEditingActivity(null)
    setEditedSubject('')
    setEditedSnippet('')
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedFilter('all')}
          className="whitespace-nowrap"
        >
          All <Badge variant="secondary" className="ml-1.5">{activityCounts.all}</Badge>
        </Button>
        {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => {
          const count = activityCounts[type as keyof typeof activityCounts]
          if (count === 0) return null
          
          const Icon = config.icon
          return (
            <Button
              key={type}
              variant={selectedFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(type)}
              className="whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {config.label} <Badge variant="secondary" className="ml-1.5">{count}</Badge>
            </Button>
          )
        })}
      </div>

      {/* Log Activity Button */}
      <div>
        <Button onClick={() => setCreateActivityOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6 pr-4">
          {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
            <div key={dateGroup}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-white py-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  {dateGroup}
                </h3>
              </div>

              {/* Activities in this group */}
              <div className="space-y-3">
                {groupActivities.map((activity) => {
                  const config = ACTIVITY_CONFIG[activity.type]
                  const Icon = config.icon
                  const isEditing = editingActivity === activity.id

                  return (
                    <div
                      key={activity.id}
                      className="group relative bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-4"
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={cn("flex-shrink-0 p-2 rounded-lg", config.bgColor)}>
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900">
                              {config.label}
                              {activity.direction && (
                                <span className="text-gray-500 ml-1">
                                  ({activity.direction === 'inbound' ? '↓' : '↑'})
                                </span>
                              )}
                            </h4>
                            {activity.outcome && OUTCOME_LABELS[activity.outcome as keyof typeof OUTCOME_LABELS] && (
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", OUTCOME_LABELS[activity.outcome as keyof typeof OUTCOME_LABELS].color)}
                              >
                                {OUTCOME_LABELS[activity.outcome as keyof typeof OUTCOME_LABELS].label}
                              </Badge>
                            )}
                            {activity.duration_seconds && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDuration(activity.duration_seconds)}
                              </div>
                            )}
                          </div>

                          {/* Subject */}
                          {isEditing ? (
                            <Input
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                              placeholder="Subject"
                              className="mb-2 h-8 text-sm"
                            />
                          ) : (
                            activity.subject && (
                              <p className="text-sm text-gray-900 font-medium mb-1">
                                {activity.subject}
                              </p>
                            )
                          )}

                          {/* Snippet/Content */}
                          {isEditing ? (
                            <Textarea
                              value={editedSnippet}
                              onChange={(e) => setEditedSnippet(e.target.value)}
                              placeholder="Notes"
                              className="mb-2 text-sm"
                              rows={3}
                            />
                          ) : (
                            (activity.snippet || activity.description) && (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                                {activity.snippet || activity.description}
                              </p>
                            )
                          )}

                          {/* Attendees (for meetings) */}
                          {activity.attendees && activity.attendees.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              Attendees: {activity.attendees.length}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}</span>
                              {activity.agent_name && <span>by {activity.agent_name}</span>}
                              {activity.file_count! > 0 && <span>📎 {activity.file_count}</span>}
                              {activity.artifact_count! > 0 && <span>🤖 {activity.artifact_count} insights</span>}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={saveActivityEdit}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEditActivity}
                                    className="h-7 w-7 p-0"
                                  >
                                    <X className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditActivity(activity)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  {activity.type === 'email' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => onReply?.(activity.id)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Reply className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(groupedActivities).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No activities found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        open={createActivityOpen}
        onOpenChange={setCreateActivityOpen}
        contactId={contactId}
        dealId={dealId}
        onActivityCreated={() => {
          onActivityCreated?.()
        }}
        tenantId={orgId ?? undefined}
      />
    </div>
  )
}

