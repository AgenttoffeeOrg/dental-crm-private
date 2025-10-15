'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Shield, Search, Download, Eye, AlertTriangle, RefreshCw, Filter } from 'lucide-react'
import { formatDateTime } from '@/lib/dates'
import type { AuditTrail } from '@/types/database'

interface AuditDetailDialogProps {
  audit: AuditTrail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AuditDetailDialog({ audit, open, onOpenChange }: AuditDetailDialogProps) {
  if (!audit) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Trail Details
          </DialogTitle>
          <DialogDescription>
            Complete audit record for {audit.action_category} action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Action Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Action:</span>
                  <span className="ml-2 font-medium">{audit.action_type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium">{audit.action_category}</span>
                </div>
                <div>
                  <span className="text-gray-600">Entity:</span>
                  <span className="ml-2 font-medium">{audit.entity_type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Entity ID:</span>
                  <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">{audit.entity_id}</code>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Description:</span>
                  <p className="ml-2 font-medium">{audit.action_description || 'No description'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">When:</span>
                  <span className="ml-2 font-medium">{formatDateTime(audit.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Changed Fields */}
          {audit.changed_fields && audit.changed_fields.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Changed Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {audit.changed_fields.map(field => (
                    <Badge key={field} variant="secondary">{field}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Before/After State */}
          {(audit.before_state || audit.after_state) && (
            <div className="grid grid-cols-2 gap-4">
              {audit.before_state && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-700">Before</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-red-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(audit.before_state, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
              {audit.after_state && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-700">After</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-green-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(audit.after_state, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Context & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {audit.ip_address && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IP Address:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">{audit.ip_address}</code>
                </div>
              )}
              {audit.user_agent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">User Agent:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded truncate max-w-md" title={audit.user_agent}>
                    {audit.user_agent}
                  </code>
                </div>
              )}
              {audit.session_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Session ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">{audit.session_id}</code>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-600">Severity:</span>
                <Badge variant={audit.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {audit.severity}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AuditTrailViewer({ tenantId = '550e8400-e29b-41d4-a716-446655440000', isAdmin = true }: { tenantId?: string; isAdmin?: boolean }) {
  const [audits, setAudits] = useState<AuditTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAudit, setSelectedAudit] = useState<AuditTrail | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadAudits()
  }, [tenantId, categoryFilter, severityFilter])

  const loadAudits = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('audit_trail')
        .select(`
          *,
          user:app_users(id, full_name)
        `)
        .eq('tenant_id', tenantId)

      // Filter by admin-only if not admin
      if (!isAdmin) {
        query = query.eq('visible_to_admin_only', false)
      }

      // Apply filters
      if (categoryFilter !== 'all') {
        query = query.eq('action_category', categoryFilter)
      }
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setAudits(data || [])
    } catch (error) {
      console.error('Error loading audit trail:', JSON.stringify(error, null, 2))
      // Gracefully handle - show empty state
      setAudits([])
      // Don't show error to user - empty state is fine
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Category', 'Entity', 'Description'],
      ...audits.map(a => [
        a.created_at,
        (a as any).user?.full_name || 'Unknown',
        a.action_type,
        a.action_category,
        a.entity_type,
        a.action_description || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Audit trail exported')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredAudits = audits.filter(a =>
    searchTerm === '' ||
    a.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a as any).user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdmin) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h3>
          <p className="text-sm text-red-700">
            Audit trail is only accessible to administrators
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Audit Trail
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete history of all actions • Admin only
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAudits} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={audits.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="deal">Deals</SelectItem>
                <SelectItem value="contact">Contacts</SelectItem>
                <SelectItem value="pipeline">Pipelines</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="setting">Settings</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Audit Entries ({filteredAudits.length})
          </CardTitle>
          <CardDescription>
            Last 100 actions • Full state tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-300" />
              <p>Loading audit trail...</p>
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No audit entries found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAudits.map(audit => (
                <div
                  key={audit.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border"
                  onClick={() => {
                    setSelectedAudit(audit)
                    setDetailDialogOpen(true)
                  }}
                >
                  {/* User Avatar */}
                  {(audit as any).user ? (
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                        {(audit as any).user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-gray-500" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {audit.action_description || `${audit.action_type} on ${audit.entity_type}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      <span>{(audit as any).user?.full_name || 'System'}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatDateTime(audit.created_at)}</span>
                      {audit.changed_fields && audit.changed_fields.length > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{audit.changed_fields.length} fields changed</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className="text-xs">
                      {audit.action_category}
                    </Badge>
                    {audit.severity !== 'info' && (
                      <Badge className={`text-xs ${getSeverityColor(audit.severity)}`}>
                        {audit.severity}
                      </Badge>
                    )}
                    {audit.visible_to_admin_only && (
                      <Badge className="text-xs bg-red-100 text-red-800">
                        <Lock className="h-2 w-2 mr-1" />
                        Admin Only
                      </Badge>
                    )}
                  </div>

                  <Eye className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <AuditDetailDialog
        audit={selectedAudit}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  )
}
