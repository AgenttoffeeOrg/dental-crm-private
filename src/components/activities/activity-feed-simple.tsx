'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Phone, Mail, MessageSquare, Calendar, FileText, Edit2, Check, X, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { CreateActivityDialog } from '@/components/activities/create-activity-dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface Activity {
  id: string
  type: 'call' | 'email' | 'whatsapp' | 'note' | 'sms' | 'meeting'
  direction?: 'inbound' | 'outbound'
  subject?: string
  snippet?: string
  occurred_at: string
  agent_name?: string
  outcome?: string
  duration_seconds?: number
}

interface ActivityFeedSimpleProps {
  activities: Activity[]
  contactId: string
  dealId?: string
  onActivityCreated?: () => void
}

const ICONS = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  meeting: Calendar,
  note: FileText
}

const COLORS = {
  call: 'text-green-600 bg-green-50',
  email: 'text-blue-600 bg-blue-50',
  whatsapp: 'text-emerald-600 bg-emerald-50',
  sms: 'text-purple-600 bg-purple-50',
  meeting: 'text-orange-600 bg-orange-50',
  note: 'text-gray-600 bg-gray-50'
}

export function ActivityFeedSimple({ 
  activities, 
  contactId, 
  dealId,
  onActivityCreated 
}: ActivityFeedSimpleProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editSnippet, setEditSnippet] = useState('')
  const supabase = createClient()

  const startEdit = (activity: Activity) => {
    setEditingId(activity.id)
    setEditSubject(activity.subject || '')
    setEditSnippet(activity.snippet || '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    
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
      toast.success('Updated')
      setEditingId(null)
      onActivityCreated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Activity</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Log Activity
        </Button>
      </div>

      {/* Clean Activity List */}
      <div className="space-y-2">
        {activities.map((activity) => {
          const Icon = ICONS[activity.type]
          const isEditing = editingId === activity.id

          return (
            <div
              key={activity.id}
              className="group flex gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 p-2 rounded-lg ${COLORS[activity.type]}`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Subject (optional)"
                      className="h-8 text-sm"
                    />
                    <Textarea
                      value={editSnippet}
                      onChange={(e) => setEditSnippet(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="h-7">
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {activity.type}
                            {activity.direction && (
                              <span className="text-gray-500 ml-1">
                                {activity.direction === 'inbound' ? '↓' : '↑'}
                              </span>
                            )}
                          </span>
                          {activity.outcome && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.outcome.replace('_', ' ')}
                            </Badge>
                          )}
                          {activity.duration_seconds && (
                            <span className="text-xs text-gray-500">
                              {Math.floor(activity.duration_seconds / 60)}min
                            </span>
                          )}
                        </div>
                        {activity.subject && (
                          <p className="text-sm font-medium text-gray-800 mb-0.5">
                            {activity.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {activity.snippet}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(activity)}
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}</span>
                      {activity.agent_name && <span>by {activity.agent_name}</span>}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No activities yet</p>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="mt-2">
              Log First Activity
            </Button>
          </div>
        )}
      </div>

      <CreateActivityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        contactId={contactId}
        dealId={dealId}
        onActivityCreated={() => {
          onActivityCreated?.()
        }}
      />
    </div>
  )
}

