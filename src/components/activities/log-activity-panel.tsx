'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  X,
  Check,
  ArrowUp,
  ArrowDown,
  Clock,
  Upload,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LogActivityPanelProps {
  open: boolean
  onClose: () => void
  contactId: string
  dealId?: string
  onActivityLogged?: () => void
  tenantId?: string
}

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: Phone, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'note', label: 'Note', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50' }
]

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' }
]

const MEETING_OUTCOMES = [
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export function LogActivityPanel({
  open,
  onClose,
  contactId,
  dealId,
  onActivityLogged,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: LogActivityPanelProps) {
  const [selectedType, setSelectedType] = useState<string>('call')
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState<string>('')
  const [duration, setDuration] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const resetForm = () => {
    setSubject('')
    setNotes('')
    setOutcome('')
    setDuration('')
  }

  const handleSave = async () => {
    if (!notes.trim() && !subject.trim()) {
      toast.error('Please add activity details')
      return
    }

    setSaving(true)

    try {
      const activityData: any = {
        tenant_id: tenantId,
        contact_id: contactId,
        deal_id: dealId || null,
        type: selectedType,
        direction,
        subject: subject.trim() || null,
        snippet: notes.trim(),
        outcome: outcome || null,
        duration_seconds: duration ? parseInt(duration) * 60 : null,
        occurred_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('activities')
        .insert([activityData])

      if (error) throw error

      toast.success('Activity logged successfully!')
      resetForm()
      onClose()
      onActivityLogged?.()
    } catch (error) {
      console.error('Error logging activity:', error)
      toast.error('Failed to log activity')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const selectedTypeConfig = ACTIVITY_TYPES.find(t => t.value === selectedType)
  const SelectedIcon = selectedTypeConfig?.icon || Phone

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-[600px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", selectedTypeConfig?.bg)}>
            <SelectedIcon className={cn("h-5 w-5", selectedTypeConfig?.color)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Log Activity</h2>
            <p className="text-sm text-gray-600">Record customer interaction</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-6 space-y-5">
          {/* Activity Type Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Activity Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map(type => {
                const Icon = type.icon
                const isSelected = selectedType === type.value
                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      isSelected 
                        ? `${type.bg} ${type.color} border-current font-medium`
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Direction (for calls/emails) */}
          {(selectedType === 'call' || selectedType === 'email') && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Direction</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={direction === 'outbound' ? 'default' : 'outline'}
                  onClick={() => setDirection('outbound')}
                  className="flex-1"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Outbound
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={direction === 'inbound' ? 'default' : 'outline'}
                  onClick={() => setDirection('inbound')}
                  className="flex-1"
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Inbound
                </Button>
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <Label htmlFor="subject" className="text-sm font-medium text-gray-700 mb-2 block">
              Subject {selectedType === 'call' && '(Optional)'}
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                selectedType === 'call' ? 'e.g., Follow-up on treatment plan' :
                selectedType === 'email' ? 'e.g., Pricing information for dental implants' :
                selectedType === 'meeting' ? 'e.g., Initial consultation' :
                'Brief description...'
              }
              className="h-9"
            />
          </div>

          {/* Outcome (for calls) */}
          {selectedType === 'call' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Call Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {CALL_OUTCOMES.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Outcome (for meetings) */}
          {selectedType === 'meeting' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Meeting Status</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_OUTCOMES.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration (for calls/meetings) */}
          {(selectedType === 'call' || selectedType === 'meeting') && (
            <div>
              <Label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-2 block">
                Duration (minutes)
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 15"
                  className="pl-10 h-9"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">
              {selectedType === 'call' ? 'Call Notes' :
               selectedType === 'email' ? 'Email Body' :
               selectedType === 'meeting' ? 'Meeting Notes' :
               'Notes'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                selectedType === 'call' ? 'What was discussed? Any follow-up needed?' :
                selectedType === 'email' ? 'Email content or summary...' :
                selectedType === 'meeting' ? 'Meeting agenda, discussion points, action items...' :
                'Activity details...'
              }
              rows={6}
              className="text-sm resize-none"
            />
          </div>

          {/* Quick Templates */}
          {selectedType === 'call' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-900">Quick Templates</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setNotes('Patient confirmed appointment. Will proceed with treatment plan.')}
                >
                  Confirmed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setNotes('Patient needs time to think. Will follow up in 3 days.')}
                >
                  Needs Time
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setNotes('Discussed pricing and payment options. Patient interested.')}
                >
                  Pricing Discussion
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Check className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Log Activity'}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

