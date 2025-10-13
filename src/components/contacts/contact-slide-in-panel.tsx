'use client'

import { useEffect, useState } from 'react'
import { X, Mail, Phone, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface ContactSlideInPanelProps {
  contactId: string | null
  open: boolean
  onClose: () => void
  onContactUpdated?: () => void
}

export function ContactSlideInPanel({ contactId, open, onClose, onContactUpdated }: ContactSlideInPanelProps) {
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && contactId) {
      loadContact()
    }
  }, [open, contactId])

  const loadContact = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    setContact(data)
    setLoading(false)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">
                {contact?.first_name} {contact?.last_name}
              </h2>
              <Badge className="mt-2">
                {contact?.status}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ) : contact ? (
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  {contact.primary_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span>{contact.primary_email}</span>
                    </div>
                  )}
                  {contact.primary_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span>{contact.primary_phone}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>

                {/* Deals, Tasks, Activities would go here */}
              </div>
            ) : (
              <p>Contact not found</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

