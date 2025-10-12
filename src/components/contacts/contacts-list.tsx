'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Settings,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Check,
  X,
  Edit
} from 'lucide-react'
import { toast } from 'sonner'
import { ContactProfileDialog } from './contact-profile-dialog'
import { CreateContactDialog } from './create-contact-dialog'
import { formatDate } from '@/lib/dates'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Contact } from '@/types/database'

type FilterType = 'all' | 'active' | 'leads' | 'patients' | 'cold'
type SortType = 'name' | 'created' | 'activity' | 'value'

interface ContactsListProps {
  tenantId?: string
}

export function ContactsList({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: ContactsListProps) {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('created')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [editingField, setEditingField] = useState<{contactId: string, field: 'email' | 'phone'} | null>(null)
  const [editValue, setEditValue] = useState('')
  const supabase = createClient()

  const fetchContacts = async () => {
    try {
      setLoading(true)

      // Fetch contacts with deal and activity counts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)

      if (contactsError) throw contactsError

      // Fetch deal counts and values for each contact
      const { data: dealStats, error: dealsError } = await supabase
        .from('deals')
        .select('contact_id, value_estimate_cents, status')
        .eq('tenant_id', tenantId)

      // Fetch last activity for each contact
      const { data: lastActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('contact_id, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      // Aggregate data
      const enrichedContacts = (contactsData || []).map(contact => {
        const contactDeals = (dealStats || []).filter(d => d.contact_id === contact.id && d.status !== 'lost' && d.status !== 'won')
        const dealCount = contactDeals.length
        const dealValue = contactDeals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
        
        const contactActivities = (lastActivities || []).filter(a => a.contact_id === contact.id)
        const lastActivity = contactActivities[0]?.created_at

        return {
          ...contact,
          deal_count: dealCount,
          deal_value: dealValue,
          last_activity_at: lastActivity
        }
      })

      // Apply search filter
      let filtered = enrichedContacts
      if (searchQuery) {
        filtered = filtered.filter(c => 
          c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.primary_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.primary_phone?.includes(searchQuery)
        )
      }

      // Apply status filter
      if (filterType !== 'all') {
        filtered = filtered.filter(c => {
          switch(filterType) {
            case 'active': return c.deal_count > 0
            case 'leads': return c.lifecycle_stage === 'lead' || c.lifecycle_stage === 'new_lead'
            case 'patients': return c.lifecycle_stage === 'patient' || c.lifecycle_stage === 'active_patient'
            case 'cold': return !c.last_activity_at || (new Date().getTime() - new Date(c.last_activity_at).getTime()) > 30 * 24 * 60 * 60 * 1000
            default: return true
          }
        })
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch(sortBy) {
          case 'name': return a.full_name.localeCompare(b.full_name)
          case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          case 'activity': return (b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0) - (a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0)
          case 'value': return (b.deal_value || 0) - (a.deal_value || 0)
          default: return 0
        }
      })

      setContacts(filtered)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [searchQuery, filterType, sortBy])

  const handleUpdateField = async (contactId: string, field: 'primary_email' | 'primary_phone', value: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)

      if (error) throw error

      toast.success(`${field === 'primary_email' ? 'Email' : 'Phone'} updated!`)
      setEditingField(null)
      setEditValue('')
      fetchContacts()
    } catch (error) {
      console.error('Error updating contact:', error)
      toast.error('Failed to update contact')
    }
  }

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)))
    }
  }

  const toggleSelectContact = (contactId: string) => {
    const newSet = new Set(selectedContacts)
    if (newSet.has(contactId)) {
      newSet.delete(contactId)
    } else {
      newSet.add(contactId)
    }
    setSelectedContacts(newSet)
  }

  const getContactStatus = (contact: any) => {
    if (contact.deal_count > 0 && contact.deal_value > 500000) return { label: 'Hot Lead', color: 'bg-red-100 text-red-800 border-red-200' }
    if (contact.deal_count > 0) return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' }
    if (contact.lifecycle_stage === 'patient') return { label: 'Patient', color: 'bg-blue-100 text-blue-800 border-blue-200' }
    if (!contact.last_activity_at || (new Date().getTime() - new Date(contact.last_activity_at).getTime()) > 30 * 24 * 60 * 60 * 1000) {
      return { label: 'Cold', color: 'bg-gray-100 text-gray-600 border-gray-200' }
    }
    return { label: 'Lead', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
  }

  const getCounts = () => {
    const all = contacts.length
    const active = contacts.filter(c => c.deal_count > 0).length
    const leads = contacts.filter(c => c.lifecycle_stage === 'lead' || c.lifecycle_stage === 'new_lead').length
    const patients = contacts.filter(c => c.lifecycle_stage === 'patient' || c.lifecycle_stage === 'active_patient').length
    const cold = contacts.filter(c => !c.last_activity_at || (new Date().getTime() - new Date(c.last_activity_at).getTime()) > 30 * 24 * 60 * 60 * 1000).length
    return { all, active, leads, patients, cold }
  }

  const counts = getCounts()

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">All Contacts</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your patients and leads</p>
        </div>
        <div className="flex gap-2">
          {selectedContacts.size > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              {selectedContacts.size} selected
            </Badge>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Contact
          </Button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex items-center gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterType('all')}
            className="h-8"
          >
            All <Badge variant="secondary" className="ml-1.5">{contacts.length}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'active' ? 'default' : 'ghost'}
            onClick={() => setFilterType('active')}
            className="h-8"
          >
            Active <Badge variant="secondary" className="ml-1.5">{counts.active}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'leads' ? 'default' : 'ghost'}
            onClick={() => setFilterType('leads')}
            className="h-8"
          >
            Leads <Badge variant="secondary" className="ml-1.5">{counts.leads}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'patients' ? 'default' : 'ghost'}
            onClick={() => setFilterType('patients')}
            className="h-8"
          >
            Patients <Badge variant="secondary" className="ml-1.5">{counts.patients}</Badge>
          </Button>
          <Button
            size="sm"
            variant={filterType === 'cold' ? 'default' : 'ghost'}
            onClick={() => setFilterType('cold')}
            className="h-8"
          >
            Cold <Badge variant="secondary" className="ml-1.5">{counts.cold}</Badge>
          </Button>
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
          <SelectTrigger className="w-[180px] h-9">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="created">Sort by Created</SelectItem>
            <SelectItem value="activity">Sort by Activity</SelectItem>
            <SelectItem value="value">Sort by Value</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Contacts Table - Enterprise Design */}
      <Card>
        {/* Table Header */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 items-center text-xs font-medium text-gray-700 uppercase tracking-wide">
            <div className="col-span-1 flex items-center gap-2">
              <Checkbox
                checked={selectedContacts.size === contacts.length && contacts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Deals</div>
            <div className="col-span-2">Last Activity</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {contacts.map(contact => {
            const status = getContactStatus(contact)
            const isEditing = editingField?.contactId === contact.id
            
            return (
              <div key={contact.id} className="px-6 py-3 hover:bg-gray-50 transition-colors group">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Checkbox - 1 col */}
                  <div className="col-span-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={() => toggleSelectContact(contact.id)}
                    />
                  </div>

                  {/* Avatar & Name - 2 cols */}
                  <Link href={`/contacts/${contact.id}`} className="col-span-2 flex items-center gap-2 min-w-0">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-medium">
                        {getContactInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-600">
                        {contact.full_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {getSourceBadge(contact.source)}
                      </div>
                    </div>
                  </Link>

                  {/* Email - 2 cols */}
                  <div className="col-span-2 min-w-0">
                    {isEditing && editingField?.field === 'email' ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="email"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateField(contact.id, 'primary_email', editValue)
                            } else if (e.key === 'Escape') {
                              setEditingField(null)
                              setEditValue('')
                            }
                          }}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateField(contact.id, 'primary_email', editValue)}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingField(null); setEditValue('') }}>
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : contact.primary_email ? (
                      <div className="flex items-center gap-2 min-w-0 group/email">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <a
                          href={`mailto:${contact.primary_email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-gray-600 hover:text-blue-600 truncate flex-1"
                        >
                          {contact.primary_email}
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover/email:opacity-100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditingField({contactId: contact.id, field: 'email'})
                            setEditValue(contact.primary_email)
                          }}
                        >
                          <Edit className="h-3 w-3 text-gray-400" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingField({contactId: contact.id, field: 'email'})
                          setEditValue('')
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Email
                      </Button>
                    )}
                  </div>

                  {/* Phone - 2 cols */}
                  <div className="col-span-2 min-w-0">
                    {isEditing && editingField?.field === 'phone' ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="tel"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateField(contact.id, 'primary_phone', editValue)
                            } else if (e.key === 'Escape') {
                              setEditingField(null)
                              setEditValue('')
                            }
                          }}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateField(contact.id, 'primary_phone', editValue)}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingField(null); setEditValue('') }}>
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : contact.primary_phone ? (
                      <div className="flex items-center gap-2 min-w-0 group/phone">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <a
                          href={`tel:${contact.primary_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-gray-600 hover:text-green-600 truncate flex-1"
                        >
                          {contact.primary_phone}
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover/phone:opacity-100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditingField({contactId: contact.id, field: 'phone'})
                            setEditValue(contact.primary_phone)
                          }}
                        >
                          <Edit className="h-3 w-3 text-gray-400" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-green-600 hover:bg-green-50"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingField({contactId: contact.id, field: 'phone'})
                          setEditValue('')
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Phone
                      </Button>
                    )}
                  </div>

                  {/* Status - 1 col */}
                  <div className="col-span-1">
                    <Badge variant="outline" className={cn("text-xs", status.color)}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Open Deals - 1 col */}
                  <div className="col-span-1">
                    {contact.deal_count > 0 ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{contact.deal_count}</div>
                        <div className="text-xs text-gray-500">
                          £{((contact.deal_value || 0) / 100).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  {/* Last Activity - 2 cols */}
                  <div className="col-span-2">
                    {contact.last_activity_at ? (
                      <div className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(contact.last_activity_at), { addSuffix: true })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No activity</span>
                    )}
                  </div>

                  {/* Actions - 1 col */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <Link href={`/contacts/${contact.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
          
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
        </div>
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
