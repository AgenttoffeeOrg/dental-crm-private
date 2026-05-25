'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Phone,
  Mail,
  ExternalLink,
  Calendar,
  User,
  MapPin,
  Building2,
  Copy,
  MessageSquare,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { TaskActionsMenu } from '@/components/tasks/task-actions-menu'
import { CallTakeoverPanel } from '@/components/call-coaching/call-takeover-panel'
import { TaskContextBriefing } from '@/components/tasks/task-context-briefing'
import { EmailComposerPanel } from '@/components/communications/email-composer-panel'
import { SMSComposerPanel } from '@/components/communications/sms-composer-panel'
import { WhatsAppComposerPanel } from '@/components/communications/whatsapp-composer-panel'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { formatDistanceToNow } from 'date-fns'

interface TaskQueuePanelProps {
  open: boolean
  onClose: () => void
  tasks: any[]
  onTaskComplete?: (taskId: string) => Promise<void>
  onTasksChange?: () => void
  initialTaskId?: string
}

export function TaskQueuePanel({ 
  open, 
  onClose, 
  tasks,
  onTaskComplete,
  onTasksChange,
  initialTaskId
}: TaskQueuePanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [completing, setCompleting] = useState(false)
  const [contactDetails, setContactDetails] = useState<any>(null)
  const [dealDetails, setDealDetails] = useState<any>(null)
  // 2b.90 — composer state. For message tasks (sms/whatsapp/email)
  // and any task with a contact, the operator can fire off a message
  // directly from the queue without leaving the panel.
  const [composerOpen, setComposerOpen] = useState<'sms' | 'whatsapp' | 'email' | 'call' | null>(null)
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()
  const supabase = createClient()

  // 2b.65 — Celebration state. Set when the operator completes /
  // skips past the last task. The panel renders the celebration
  // screen instead of the "no tasks in queue" empty state so the
  // operator gets credit for the work she did this session.
  const [showCelebration, setShowCelebration] = useState(false)
  const [sessionStartedAt] = useState(() => Date.now())
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0)

  // Find initial task index if initialTaskId is provided
  useEffect(() => {
    if (initialTaskId && tasks.length > 0) {
      const index = tasks.findIndex(t => t.id === initialTaskId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [initialTaskId, tasks])

  const currentTask = tasks[currentIndex]
  const hasNext = currentIndex < tasks.length - 1
  const hasPrev = currentIndex > 0

  useEffect(() => {
    if (open) {
      setCurrentIndex(0)
      setNotes('')
    }
  }, [open])

  useEffect(() => {
    if (currentTask) {
      setNotes(currentTask.notes || '')
      loadTaskContext()
    }
  }, [currentIndex, currentTask])

  const loadTaskContext = async () => {
    if (!currentTask) return

    try {
      // Load contact details with ALL info
      if (currentTask.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', currentTask.contact_id)
          .single()
        
        setContactDetails(contact)
      } else {
        setContactDetails(null)
      }

      // Load deal details with ALL info
      if (currentTask.deal_id) {
        const { data: deal } = await supabase
          .from('deals')
          .select(`
            *,
            contact:contacts(*),
            stage:pipeline_stages(*),
            pipeline:pipelines(*)
          `)
          .eq('id', currentTask.deal_id)
          .single()
        
        setDealDetails(deal)
        
        // If deal has contact but task doesn't, use deal's contact
        if (deal?.contact && !currentTask.contact_id) {
          setContactDetails(deal.contact)
        }
      } else {
        setDealDetails(null)
      }
    } catch (error) {
      console.error('Error loading context:', error)
    }
  }

  const handleComplete = async () => {
    if (!currentTask) return
    
    setCompleting(true)
    try {
      // Complete the task in database
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentTask.id)

      if (error) throw error

      toast.success('Task completed!')

      // Call parent callback if provided
      if (onTaskComplete) {
        await onTaskComplete(currentTask.id)
      }
      if (onTasksChange) {
        onTasksChange()
      }

      setSessionCompletedCount((c) => c + 1)

      // 2b.65 — Move to next task OR show celebration when this was
      // the last one. Celebration replaces the silent toast +
      // panel-close so the operator sees a "nice work" moment.
      if (hasNext) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setShowCelebration(true)
      }
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    } finally {
      setCompleting(false)
    }
  }

  const handleSkip = () => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }

  const openDeal = () => {
    if (currentTask?.deal_id) {
      window.open(`/pipeline?deal=${currentTask.deal_id}`, '_blank')
    }
  }

  const openContact = () => {
    if (currentTask?.contact_id) {
      window.open(`/contacts/${currentTask.contact_id}`, '_blank')
    }
  }

  if (!open) return null

  // 2b.65 — Celebration screen. Renders when the operator has
  // completed (or skipped past) the last task in the queue. Shows
  // session stats + onward CTAs so she has somewhere to go next
  // rather than the panel just closing.
  if (showCelebration) {
    const elapsedMs = Date.now() - sessionStartedAt
    const elapsedMin = Math.max(1, Math.round(elapsedMs / 60_000))
    return (
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[500px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Task queue empty — nice work!
            </h2>
            <p className="text-gray-600 mb-6">
              You completed <strong>{sessionCompletedCount}</strong> task
              {sessionCompletedCount === 1 ? '' : 's'} in {elapsedMin} minute
              {elapsedMin === 1 ? '' : 's'}.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setShowCelebration(false)
                  onClose()
                }}
                className="w-full"
              >
                Back to dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCelebration(false)
                  onClose()
                  // Same window — operator can click "Today's Calls"
                  // lane on the dashboard if they want the call queue
                  // next. Direct deep-link is wired in 2b.66.
                }}
                className="w-full"
              >
                I'm done for now
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentTask) {
    return (
      <div className={cn(
        "fixed right-0 top-0 h-full w-[500px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-gray-700 font-medium">No tasks in queue</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </div>
      </div>
    )
  }

  // 2b.89.2 — Call tasks take over the full screen via the Coaching
  // workspace. After the outcome is logged (or skipped), advance the
  // queue and show the next task. This is what makes "filter to Calls
  // only + Start Queue" actually run back-to-back calls per the
  // 2026-05-24 product decision.
  if (currentTask.task_type === 'call') {
    const advance = async (skipped: boolean) => {
      if (!skipped) {
        setSessionCompletedCount((c) => c + 1)
      }
      if (onTasksChange) onTasksChange()
      if (hasNext) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setShowCelebration(true)
      }
    }
    return (
      <CallTakeoverPanel
        taskId={currentTask.id}
        contactId={currentTask.contact_id ?? null}
        dealId={currentTask.deal_id ?? null}
        taskTitle={currentTask.title}
        position={{ current: currentIndex + 1, total: tasks.length }}
        onComplete={advance}
        onExit={onClose}
      />
    )
  }

  // 2b.95 — back to two-column at 1200px. The 2b.94 strip removed
  // the templated right column for a reason (it was misleading
  // template strings). 2b.95 brings the right column back with
  // REAL data: Claude pre-message brief + recent conversation
  // history + talking points + objection scripts. Per Toffee:
  // "how would an operator know what SMS/WhatsApp/email to send
  // without context".
  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-[1200px] max-w-[95vw] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300",
      open ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Task Queue</h2>
          <p className="text-sm text-gray-600">
            {currentIndex + 1} of {tasks.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }}
        />
      </div>

      {/* Task Content — two-column at 1200px.
          LEFT (~45%): task details + contact card + send buttons + notes.
          RIGHT (~55%): real AI brief + recent conversation history +
          talking points (TaskContextBriefing). */}
      <div className="h-[calc(100vh-200px)] grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <ScrollArea className="border-r border-gray-200">
          <div className="p-6 space-y-6">
          {/* Task Title & Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{currentTask.task_type || 'todo'}</Badge>
              <Badge 
                variant="outline"
                className={cn(
                  currentTask.priority === 'urgent' && "bg-red-100 text-red-700 border-red-200",
                  currentTask.priority === 'high' && "bg-orange-100 text-orange-700 border-orange-200"
                )}
              >
                {currentTask.priority}
              </Badge>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              {currentTask.title}
            </h3>
            {currentTask.description && (
              <p className="text-sm text-gray-600 mt-2">
                {currentTask.description}
              </p>
            )}
          </div>

          {/* Due Date */}
          {currentTask.due_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">
                Due {formatDistanceToNow(new Date(currentTask.due_at), { addSuffix: true })}
              </span>
            </div>
          )}

          <Separator />

          {/* CONTACT INFORMATION - ACTIONABLE */}
          {contactDetails && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-blue-900">Contact Information</h4>
                <Button size="sm" variant="ghost" onClick={openContact} className="h-7 px-2">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <span className="text-xs">View</span>
                </Button>
              </div>

              <div className="space-y-2">
                {/* Name */}
                <div>
                  <p className="text-sm font-medium text-gray-900">{contactDetails.full_name}</p>
                </div>

                {/* Phone - CLICKABLE */}
                {contactDetails.primary_phone && (
                  <div className="flex items-center gap-2 group">
                    <Phone className="h-4 w-4 text-green-600" />
                    <a 
                      href={`tel:${contactDetails.primary_phone}`}
                      className="text-sm text-green-700 hover:text-green-800 font-medium hover:underline"
                    >
                      {contactDetails.primary_phone}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        navigator.clipboard.writeText(contactDetails.primary_phone)
                        toast.success('Phone copied!')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Email - CLICKABLE */}
                {contactDetails.primary_email && (
                  <div className="flex items-center gap-2 group">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <a 
                      href={`mailto:${contactDetails.primary_email}`}
                      className="text-sm text-blue-700 hover:text-blue-800 hover:underline truncate"
                    >
                      {contactDetails.primary_email}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        navigator.clipboard.writeText(contactDetails.primary_email)
                        toast.success('Email copied!')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Address */}
                {contactDetails.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <p className="text-xs text-gray-600 line-clamp-2">{contactDetails.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2b.90 — Send action buttons. Always visible when a
              contact is attached; the button matching the task's
              channel is highlighted. Opens the in-app composer for
              that channel; on send the auto-done-on-outbound rule
              closes the task automatically. */}
          {contactDetails && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                variant={currentTask.task_type === 'call' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComposerOpen('call')}
                disabled={!contactDetails.primary_phone}
                className={cn(
                  'h-9',
                  currentTask.task_type === 'call' && 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Call
              </Button>
              <Button
                variant={currentTask.task_type === 'sms' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComposerOpen('sms')}
                disabled={!contactDetails.primary_phone}
                className={cn(
                  'h-9',
                  currentTask.task_type === 'sms' && 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                SMS
              </Button>
              <Button
                variant={currentTask.task_type === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComposerOpen('whatsapp')}
                disabled={!contactDetails.primary_phone}
                className={cn(
                  'h-9',
                  currentTask.task_type === 'whatsapp' && 'bg-green-600 hover:bg-green-700'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                WhatsApp
              </Button>
              <Button
                variant={currentTask.task_type === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComposerOpen('email')}
                disabled={!contactDetails.primary_email}
                className={cn(
                  'h-9',
                  currentTask.task_type === 'email' && 'bg-purple-600 hover:bg-purple-700'
                )}
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Email
              </Button>
            </div>
          )}

          {/* DEAL INFORMATION - CONTEXT */}
          {dealDetails && (
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-green-900">Deal Context</h4>
                <Button size="sm" variant="ghost" onClick={openDeal} className="h-7 px-2">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <span className="text-xs">View</span>
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dealDetails.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {dealDetails.pipeline?.name} • {dealDetails.stage?.name}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Value</p>
                    <p className="text-sm font-semibold text-green-700">
                      £{((dealDetails.value_estimate_cents || 0) / 100).toLocaleString()}
                    </p>
                  </div>
                  {dealDetails.treatment_tags && dealDetails.treatment_tags.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500">Treatment</p>
                      <p className="text-sm font-medium text-gray-700">{dealDetails.treatment_tags[0]}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignee */}
          {currentTask.assignee_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">Assigned to {currentTask.assignee_name}</span>
            </div>
          )}

          <Separator />

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this task..."
              rows={4}
            />
          </div>

          {/* Subtasks */}
          {currentTask.subtask_count > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Subtasks ({currentTask.subtask_count})
              </h4>
              <p className="text-xs text-gray-500">
                Open task details to manage subtasks
              </p>
            </div>
          )}
          </div>
        </ScrollArea>

        {/* 2b.95 — RIGHT COLUMN: real AI brief + recent conversation
            + talking points + objection scripts. Channel-agnostic. */}
        <TaskContextBriefing
          contactId={currentTask.contact_id ?? null}
          dealId={currentTask.deal_id ?? null}
          taskTitle={currentTask.title}
          taskType={currentTask.task_type ?? null}
        />
      </div>

      {/* Actions Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={handleComplete}
            disabled={completing}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {hasNext ? 'Complete & Next' : 'Complete & Finish'}
          </Button>
        </div>

        <div className="flex gap-2">
          {hasPrev && (
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {hasNext ? 'Skip to Next' : 'Close Queue'}
          </Button>
        </div>

        {/* 2b.63 — Snooze / Reschedule / Reassign / Edit. Reusable
            component (TaskActionsMenu) so the same surface lives
            per-row on the /tasks table in 2b.66.

            Operators + groups dropdown sources need wiring per
            tenant context — for v1 we pass empty arrays so the
            reassign menu only offers "Everyone (shared inbox)".
            Resolving full operator + group lists in this surface
            is wired in 2b.66 alongside the table rebuild. */}
        <TaskActionsMenu
          task={{
            id: currentTask.id,
            title: currentTask.title,
            description: (currentTask as any).description ?? null,
            due_at: (currentTask as any).due_at ?? null,
            priority: (currentTask as any).priority ?? 'normal',
            task_type: (currentTask as any).task_type ?? 'todo',
            assignee_user_id: (currentTask as any).assignee_user_id ?? null,
            assigned_to_group_id: (currentTask as any).assigned_to_group_id ?? null,
            assigned_to_everyone: (currentTask as any).assigned_to_everyone ?? false,
          }}
          onChange={() => {
            if (onTasksChange) onTasksChange()
          }}
          variant="queue"
        />

        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full text-gray-600"
        >
          Exit Queue
        </Button>
      </div>

      {/* 2b.90 — Composers mounted at the panel root so they overlay
          the queue cleanly. After send, the dispatcher's auto-done-
          on-outbound hook closes the matching open task; the queue
          refreshes via onTasksChange. */}
      {contactDetails && (
        <>
          <SMSComposerPanel
            isOpen={composerOpen === 'sms'}
            onClose={() => {
              setComposerOpen(null)
              if (onTasksChange) onTasksChange()
            }}
            to={contactDetails.primary_phone ?? undefined}
            contactId={contactDetails.id}
            dealId={currentTask.deal_id ?? undefined}
            tenantId={tenantId ?? undefined}
            userId={currentUserId ?? undefined}
          />
          <WhatsAppComposerPanel
            isOpen={composerOpen === 'whatsapp'}
            onClose={() => {
              setComposerOpen(null)
              if (onTasksChange) onTasksChange()
            }}
            to={contactDetails.primary_phone ?? undefined}
            contactId={contactDetails.id}
            dealId={currentTask.deal_id ?? undefined}
            tenantId={tenantId ?? undefined}
            userId={currentUserId ?? undefined}
          />
          <EmailComposerPanel
            isOpen={composerOpen === 'email'}
            onClose={() => {
              setComposerOpen(null)
              if (onTasksChange) onTasksChange()
            }}
            to={contactDetails.primary_email ?? undefined}
            contactId={contactDetails.id}
            dealId={currentTask.deal_id ?? undefined}
            tenantId={tenantId ?? undefined}
            userId={currentUserId ?? undefined}
          />
          {contactDetails.primary_phone && (
            <ClickToCallDialer
              isOpen={composerOpen === 'call'}
              onClose={() => setComposerOpen(null)}
              phoneNumber={contactDetails.primary_phone}
              contactName={contactDetails.full_name ?? undefined}
              contactId={contactDetails.id}
              dealId={currentTask.deal_id ?? undefined}
              tenantId={tenantId ?? undefined}
              userId={currentUserId ?? undefined}
            />
          )}
        </>
      )}
    </div>
  )
}

