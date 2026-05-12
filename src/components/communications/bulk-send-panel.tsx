'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { X, Send, Users, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BulkSendPanelProps {
  isOpen: boolean
  onClose: () => void
  type: 'email' | 'sms'
  contacts: Array<{id: string; name: string; email?: string; phone?: string}>
  tenantId?: string
  userId?: string
}

export function BulkSendPanel({
  isOpen,
  onClose,
  type,
  contacts,
  tenantId,
  userId
}: BulkSendPanelProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleToggleContact = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  const handleSend = async () => {
    if (selectedContacts.length === 0 || !message) {
      toast.error('Please select contacts and enter a message')
      return
    }

    setSending(true)
    setProgress(0)

    const endpoint = type === 'email' ? '/api/communications/send-email' : '/api/communications/send-sms'
    const total = selectedContacts.length
    let sent = 0
    let failed = 0

    for (const contactId of selectedContacts) {
      const contact = contacts.find(c => c.id === contactId)
      if (!contact) continue

      try {
        const payload = type === 'email' ? {
          to: [contact.email],
          subject,
          body: message,
          contact_id: contactId,
          tenant_id: tenantId,
          user_id: userId
        } : {
          to: contact.phone,
          message,
          contact_id: contactId,
          tenant_id: tenantId,
          user_id: userId
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          sent++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }

      setProgress(Math.round(((sent + failed) / total) * 100))
    }

    setSending(false)
    toast.success(`Bulk send complete! ${sent} sent, ${failed} failed`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Bulk Send {type === 'email' ? 'Email' : 'SMS'}
            </h2>
            <Badge>{selectedContacts.length} selected</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* Warning */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-700">
              <p className="font-medium mb-1">Bulk sending guidelines:</p>
              <ul className="list-disc ml-4 space-y-1 text-xs">
                <li>Only send to contacts who opted in</li>
                <li>Include unsubscribe option (auto-added)</li>
                <li>Respect quiet hours (9 AM - 6 PM recommended)</li>
                <li>Cost: ~${type === 'email' ? '0.001' : '0.0075'} per message</li>
              </ul>
            </div>
          </div>

          {/* Contact Selection */}
          <div className="border rounded-lg">
            <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
              <Label className="font-medium">Select Recipients</Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-48">
              <div className="p-3 space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleToggleContact(contact.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {contact.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-gray-600">{type === 'email' ? contact.email : contact.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Message */}
          <div className="space-y-2">
            {type === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Your message... (use {{contact_name}} for personalization)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Variables: {"{{contact_name}}, {{practice_name}}"}
              </p>
            </div>
          </div>

          {/* Progress */}
          {sending && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Sending...</span>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Estimated cost: ${(selectedContacts.length * (type === 'email' ? 0.001 : 0.0075)).toFixed(3)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || selectedContacts.length === 0 || !message}>
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedContacts.length} Contacts
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


