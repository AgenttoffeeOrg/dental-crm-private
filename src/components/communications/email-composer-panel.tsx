'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Send, 
  Paperclip, 
  AtSign,
  Sparkles,
  Bold,
  Italic,
  List,
  Link as LinkIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface EmailComposerPanelProps {
  isOpen: boolean
  onClose: () => void
  to?: string
  contactId?: string
  dealId?: string
  replyToActivityId?: string
  tenantId?: string
  userId?: string
}

export function EmailComposerPanel({
  isOpen,
  onClose,
  to = '',
  contactId,
  dealId,
  replyToActivityId,
  tenantId,
  userId
}: EmailComposerPanelProps) {
  const supabase = createClient()
  const [toEmail, setToEmail] = useState(to)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [aiDrafting, setAiDrafting] = useState(false)

  const handleSend = async () => {
    if (!toEmail || !subject || !body) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!tenantId || !userId) {
      toast.error('Missing tenant or user context. Please refresh and try again.')
      return
    }

    setSending(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const authHeaders = session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : {}

      const response = await fetch('/api/communications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          to: toEmail.split(',').map(e => e.trim()),
          cc: cc ? cc.split(',').map(e => e.trim()) : [],
          bcc: bcc ? bcc.split(',').map(e => e.trim()) : [],
          subject,
          body,
          contact_id: contactId,
          deal_id: dealId,
          tenant_id: tenantId,
          user_id: userId
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Email sent successfully!')
        onClose()
        // Reset form
        setToEmail('')
        setCc('')
        setBcc('')
        setSubject('')
        setBody('')
      } else {
        toast.error(data.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleAiDraft = async () => {
    setAiDrafting(true)
    toast.info('AI drafting coming soon!', {
      description: 'This will use GPT-4 to generate a professional email based on context'
    })
    
    // TODO: Integrate with AI assistant API
    // Example: Analyze deal, contact, previous conversations
    // Generate appropriate email tone and content
    
    setAiDrafting(false)
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
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Compose Email</h2>
            {dealId && <Badge variant="secondary" className="text-xs">Deal Related</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiDraft}
              disabled={aiDrafting}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {aiDrafting ? 'Drafting...' : 'AI Draft'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900">
              {toEmail || 'Add a recipient to begin'}
            </p>
            <p className="text-xs text-gray-500">
              {dealId
                ? 'This email will be logged against the active deal.'
                : contactId
                ? 'Contact-linked communication.'
                : 'Manual outreach.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Email
            </Badge>
            {subject && (
              <span className="text-xs text-gray-500 truncate max-w-[160px]">
                Subject: {subject}
              </span>
            )}
          </div>
        </div>

        {/* Email Form */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* To Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">To</Label>
                <div className="flex gap-2">
                  {!showCc && (
                    <button
                      onClick={() => setShowCc(true)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>
              <Input
                placeholder="recipient@example.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Separate multiple emails with commas</p>
            </div>

            {/* Cc Field */}
            {showCc && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cc</Label>
                <Input
                  placeholder="cc@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
            )}

            {/* Bcc Field */}
            {showBcc && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bcc</Label>
                <Input
                  placeholder="bcc@example.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject</Label>
              <Input
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Message</Label>
              
              {/* Simple Formatting Toolbar */}
              <div className="flex items-center gap-1 p-2 border rounded-t bg-gray-50">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" className="h-8">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder="Write your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full rounded-t-none"
              />
              <p className="text-xs text-gray-500">{body.length} characters</p>
            </div>

            {/* Template Suggestions (placeholder) */}
            {body.length === 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-900 mb-2">Quick Templates:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubject('Following up on our conversation')
                      setBody('Hi,\n\nI wanted to follow up on our recent conversation...\n\nBest regards')
                    }}
                  >
                    Follow-up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubject('Thank you')
                      setBody('Hi,\n\nThank you for taking the time to speak with me...\n\nBest regards')
                    }}
                  >
                    Thank You
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubject('Appointment Confirmation')
                      setBody('Hi,\n\nThis is to confirm your appointment...\n\nBest regards')
                    }}
                  >
                    Appointment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {replyToActivityId && (
              <Badge variant="secondary" className="text-xs">
                Replying to previous email
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !toEmail || !subject || !body}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

