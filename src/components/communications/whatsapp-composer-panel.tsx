'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { Input } from '@/components/ui/input'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { Label } from '@/components/ui/label'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { Textarea } from '@/components/ui/textarea'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { Badge } from '@/components/ui/badge'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { 
  X, 
  Send, 
  MessageSquare,
  Image,
  FileText,
  Paperclip
} from 'lucide-react'
import { toast } from 'sonner'

interface WhatsAppComposerPanelProps {
  isOpen: boolean
  onClose: () => void
  to?: string
  contactId?: string
  dealId?: string
  tenantId?: string
  userId?: string
}

export function WhatsAppComposerPanel({
  isOpen,
  onClose,
  to = '',
  contactId,
  dealId,
  tenantId,
  userId
}: WhatsAppComposerPanelProps) {
  const [toNumber, setToNumber] = useState(to)
  const [message, setMessage] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!toNumber || !message) {
      toast.error('Please enter both phone number and message')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/communications/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toNumber,
          message,
          media_url: mediaUrl || undefined,
          contact_id: contactId,
          deal_id: dealId,
          tenant_id: tenantId,
          user_id: userId
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'WhatsApp message sent!')
        onClose()
        setToNumber('')
        setMessage('')
        setMediaUrl('')
      } else {
        toast.error(data.error || 'Failed to send WhatsApp message')
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error)
      toast.error('Failed to send WhatsApp message')
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
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-emerald-900">Send WhatsApp Message</h2>
            {dealId && <Badge variant="secondary" className="text-xs">Deal Related</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* WhatsApp Form */}
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
            <p className="text-xs text-gray-500">Enter WhatsApp number with country code</p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message</Label>
            <Textarea
              placeholder="Type your WhatsApp message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full resize-none"
            />
            <p className="text-xs text-gray-500">
              {message.length} characters • WhatsApp supports emojis and formatting
            </p>
          </div>

          {/* Media Attachment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attach Media (Optional)</Label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <Image className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
              <Button variant="outline" size="sm" disabled>
                <FileText className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              💡 File upload coming soon! For now, provide a public URL.
            </p>
          </div>

          {/* Formatting Tips */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
            <p className="text-sm font-medium text-emerald-900 mb-2">💡 WhatsApp Formatting:</p>
            <ul className="text-xs text-emerald-700 space-y-1">
              <li>• *Bold* - Surround text with asterisks</li>
              <li>• _Italic_ - Surround text with underscores</li>
              <li>• ~Strikethrough~ - Surround text with tildes</li>
              <li>• ```Code``` - Surround text with backticks</li>
            </ul>
          </div>

          {/* Quick Templates */}
          {message.length === 0 && (
            <div className="p-3 bg-gray-50 border rounded">
              <p className="text-sm font-medium text-gray-900 mb-2">Quick Templates:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Hi! 👋 This is a reminder about your *upcoming appointment*. Please confirm if you\'re still available.')}
                >
                  Appointment Reminder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Thank you for contacting us! 🙏 We\'ll get back to you shortly.')}
                >
                  Thank You
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Following up on our conversation. Let me know if you have any questions! 😊')}
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
            <p>🔐 End-to-end encrypted via WhatsApp Business API</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || !toNumber || !message}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send on WhatsApp'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

