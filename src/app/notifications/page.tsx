'use client'

/**
 * Full Notifications Page
 * 
 * Power user interface for managing notifications
 * 
 * Features:
 * - Table view with sortable columns
 * - Advanced filters (date range, module, severity, read/unread)
 * - Bulk actions (mark all as read, archive selected, delete)
 * - Full-text search
 * - Saved views
 * - Export to CSV
 * - Pagination
 */

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Bell, Search, Filter, Download, Check, Archive, Trash2, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  event_key: string
  title: string
  body?: string
  severity: string
  priority: string
  module?: string
  entity_type?: string
  entity_id?: string
  entity_url?: string
  read_at?: string
  archived_at?: string
  created_at: string
}

export default function NotificationsPage() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModule, setFilterModule] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    if (appUser?.id) {
      loadNotifications()
    }
  }, [appUser?.id, filterModule, filterStatus, filterSeverity])
  
  const loadNotifications = async () => {
    if (!appUser?.id) return
    
    try {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', appUser.id)
        .is('archived_at', null)  // Exclude archived
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (filterModule !== 'all') {
        query = query.eq('module', filterModule)
      }
      
      if (filterStatus === 'unread') {
        query = query.is('read_at', null)
      } else if (filterStatus === 'read') {
        query = query.not('read_at', 'is', null)
      }
      
      if (filterSeverity !== 'all') {
        query = query.eq('severity', filterSeverity)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setNotifications(data || [])
    } catch (error) {
      console.error('[Notifications] Error loading:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }
  
  // Filtered by search
  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return n.title.toLowerCase().includes(query) || n.body?.toLowerCase().includes(query)
  })
  
  // Bulk mark as read
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return
    
    try {
      const supabase = createClient()
      
      await Promise.all(
        Array.from(selectedIds).map(id =>
          supabase.rpc('mark_notification_read', {
            p_notification_id: id,
            p_user_id: appUser?.id
          })
        )
      )
      
      toast.success(`Marked ${selectedIds.size} notifications as read`)
      setSelectedIds(new Set())
      loadNotifications()
    } catch (error) {
      console.error('[Notifications] Error bulk marking as read:', error)
      toast.error('Failed to mark as read')
    }
  }
  
  // Bulk archive
  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return
    
    try {
      const supabase = createClient()
      
      await Promise.all(
        Array.from(selectedIds).map(id =>
          supabase.rpc('archive_notification', {
            p_notification_id: id,
            p_user_id: appUser?.id
          })
        )
      )
      
      toast.success(`Archived ${selectedIds.size} notifications`)
      setSelectedIds(new Set())
      loadNotifications()
    } catch (error) {
      console.error('[Notifications] Error bulk archiving:', error)
      toast.error('Failed to archive')
    }
  }
  
  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Date', 'Title', 'Module', 'Severity', 'Status'].join(','),
      ...filteredNotifications.map(n => [
        format(new Date(n.created_at), 'yyyy-MM-dd HH:mm:ss'),
        `"${n.title.replace(/"/g, '""')}"`,
        n.module || '',
        n.severity,
        n.read_at ? 'Read' : 'Unread'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notifications-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Exported to CSV')
  }
  
  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }
  
  // Select all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)))
    }
  }
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'critical': return 'bg-red-600 text-white'
      default: return 'bg-blue-100 text-blue-800'
    }
  }
  
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8 max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-600" />
                Notifications
              </h1>
              <p className="text-gray-600 mt-1">View and manage all your notifications</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push('/settings?tab=notifications')}>
                <Settings className="h-4 w-4 mr-2" />
                Notification Settings
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          
          {/* Filters & Search */}
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="integrations">Integrations</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
          
          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleBulkMarkAsRead}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as Read
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">No notifications found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => (
                    <TableRow key={notification.id} className={!notification.read_at ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(notification.id)}
                          onCheckedChange={() => toggleSelection(notification.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{notification.title}</p>
                          {notification.body && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{notification.body}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {notification.module && (
                          <Badge variant="outline" className="capitalize">
                            {notification.module}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSeverityColor(notification.severity)} capitalize text-xs`}>
                          {notification.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{notification.priority}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {notification.read_at ? (
                          <Badge variant="outline" className="text-xs">Read</Badge>
                        ) : (
                          <Badge className="bg-blue-600 text-xs">Unread</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {notification.entity_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(notification.entity_url!)}
                              title="Open"
                            >
                              →
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

