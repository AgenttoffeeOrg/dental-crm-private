'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Plus, Search, Mail, Phone, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { ContactProfileDialog } from './contact-profile-dialog'
import { CreateContactDialog } from './create-contact-dialog'
import { formatDate } from '@/lib/dates'
import type { Contact } from '@/types/database'

interface ContactsListProps {
  tenantId?: string
}

export function ContactsList({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const supabase = createClient()

  const fetchContacts = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)

      // Apply search
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,primary_email.ilike.%${searchQuery}%,primary_phone.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [searchQuery])

  const getContactInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getSourceBadge = (source?: string) => {
    if (!source) return null
    
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      website: 'default',
      referral: 'secondary',
      google_ads: 'outline',
      walk_in: 'destructive',
    }
    
    return (
      <Badge variant={variants[source] || 'outline'}>
        {source.replace('_', ' ')}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading contacts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">All Contacts</h2>
          <Badge variant="outline">
            {contacts.length} contacts
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSettingsDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Contact Settings
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Contact Profile
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <div className="space-y-4">
          {contacts.map(contact => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getContactInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{contact.full_name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        {contact.primary_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {contact.primary_phone}
                          </div>
                        )}
                        {contact.primary_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {contact.primary_email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {getSourceBadge(contact.source)}
                        {contact.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag.replace('_', ' ')}
                          </Badge>
                        ))}
                        {contact.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Created</div>
                      <div>{formatDate(contact.created_at, 'MMM d, yyyy')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        {contacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Avatar className="h-12 w-12 mx-auto mb-4">
              <AvatarFallback>
                <Plus className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <p>No contacts found</p>
            <p className="text-sm">
              {searchQuery ? 'Try adjusting your search' : 'Create your first contact to get started'}
            </p>
          </div>
        )}
      </Card>

          <ContactProfileDialog
            contact={null}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onContactUpdated={fetchContacts}
            mode="create"
          />

          {/* Contact Settings Dialog Placeholder */}
          {settingsDialogOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Contact Settings</h3>
                <p className="text-gray-600 mb-4">
                  Configure contact fields, import/export options, and data management settings.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-700">• Custom contact fields</div>
                  <div className="text-sm text-gray-700">• Import/export contacts</div>
                  <div className="text-sm text-gray-700">• Data validation rules</div>
                  <div className="text-sm text-gray-700">• Lead scoring settings</div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setSettingsDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
