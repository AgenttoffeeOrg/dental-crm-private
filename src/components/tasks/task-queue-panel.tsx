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
  MessageSquare
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface TaskQueuePanelProps {
  open: boolean
  onClose: () => void
  tasks: any[]
  onTaskComplete: (taskId: string) => Promise<void>
  onTasksChange: () => void
}

export function TaskQueuePanel({ 
  open, 
  onClose, 
  tasks,
  onTaskComplete,
  onTasksChange
}: TaskQueuePanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [completing, setCompleting] = useState(false)
  const [contactDetails, setContactDetails] = useState<any>(null)
  const [dealDetails, setDealDetails] = useState<any>(null)

  const currentTask = tasks[currentIndex]
  const hasNext = currentIndex < tasks.length - 1
  const hasPrev = currentIndex > 0
  const supabase = createClient()

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
      await onTaskComplete(currentTask.id)
      
      // Move to next task
      if (hasNext) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // Queue complete!
        toast.success('🎉 All tasks completed!')
        onClose()
      }
    } catch (error) {
      console.error('Error:', error)
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

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-[500px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300",
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

      {/* Task Content */}
      <ScrollArea className="h-[calc(100vh-200px)]">
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

        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full text-gray-600"
        >
          Exit Queue
        </Button>
      </div>
    </div>
  )
}

