'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Send, 
  MessageSquare,
  Sparkles,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface SMSComposerPanelProps {
  isOpen: boolean
  onClose: () => void
  to?: string
  contactId?: string
  dealId?: string
  tenantId?: string
  userId?: string
}

export function SMSComposerPanel({
  isOpen,
  onClose,
  to = '',
  contactId,
  dealId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  userId = '550e8400-e29b-41d4-a716-446655440000'
}: SMSComposerPanelProps) {
  const [toNumber, setToNumber] = useState(to)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const messageSegments = Math.ceil(message.length / 160)
  const estimatedCost = messageSegments * 0.0075
  const charsRemaining = 160 - (message.length % 160)

  const handleSend = async () => {
    if (!toNumber || !message) {
      toast.error('Please enter both phone number and message')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/communications/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toNumber,
          message,
          contact_id: contactId,
          deal_id: dealId,
          tenant_id: tenantId,
          user_id: userId
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'SMS sent successfully!')
        onClose()
        setToNumber('')
        setMessage('')
      } else {
        toast.error(data.error || 'Failed to send SMS')
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      toast.error('Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50" 
        onClick={onClose}
      />
      
      {/* Slide-in Panel from Right */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Send SMS</h2>
            {dealId && <Badge variant="secondary" className="text-xs">Deal Related</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* SMS Form */}
        <div className="p-4 space-y-4">
          {/* To Number */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">To</Label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Enter phone number with country code</p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message</Label>
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full resize-none"
              maxLength={1600} // Max 10 segments
            />
            
            {/* Character Counter */}
            <div className="flex items-center justify-between text-xs">
              <span className={message.length > 160 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                {message.length} / {messageSegments * 160} characters
                {messageSegments > 1 && ` (${messageSegments} messages)`}
              </span>
              <span className="text-gray-500">
                {charsRemaining} until next segment
              </span>
            </div>
          </div>

          {/* Cost Estimate */}
          {message.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Estimated Cost:</span>
              </div>
              <span className="text-sm font-bold text-blue-900">
                ${estimatedCost.toFixed(4)}
              </span>
            </div>
          )}

          {/* Quick Templates */}
          {message.length === 0 && (
            <div className="p-3 bg-gray-50 border rounded">
              <p className="text-sm font-medium text-gray-900 mb-2">Quick Templates:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Hi! This is a reminder about your upcoming appointment. Please confirm your availability.')}
                >
                  Appointment Reminder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Thank you for reaching out! We\'ll get back to you shortly.')}
                >
                  Thank You
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Following up on our previous conversation. Let me know if you have any questions!')}
                >
                  Follow-up
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-xs text-gray-600">
            <p>💡 SMS is limited to text only. For images, use WhatsApp.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || !toNumber || !message}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send SMS'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

