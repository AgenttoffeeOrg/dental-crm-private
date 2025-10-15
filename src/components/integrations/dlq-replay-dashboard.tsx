'use client'

/**
 * Dead Letter Queue (DLQ) Replay Dashboard
 * 
 * Manual intervention UI for failed webhook/API operations
 * 
 * Features:
 * - View all failed operations
 * - See error details and retry history
 * - Manual retry individual items
 * - Bulk retry all failed items
 * - Discard permanently failed items
 * - Filter by integration type
 * - Export for analysis
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  PlayCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface DLQItem {
  id: string
  integration_type: string
  operation: string
  payload: any
  error_message: string
  error_code: string | null
  retry_count: number
  max_retries: number
  status: string
  first_failed_at: string
  last_retry_at: string | null
  next_retry_at: string | null
}

export function DLQReplayDashboard() {
  const [items, setItems] = useState<DLQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<DLQItem | null>(null)
  const [filter, setFilter] = useState<'pending' | 'failed' | 'all'>('pending')

  const loadDLQItems = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('integration_dlq')
        .select('*')
        .order('first_failed_at', { ascending: false })
      
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setItems(data || [])
    } catch (error) {
      console.error('Error loading DLQ items:', error)
      toast.error('Failed to load failed operations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDLQItems()
  }, [filter])

  const handleRetry = async (itemId: string) => {
    try {
      const supabase = createClient()
      
      // Trigger retry by setting next_retry_at to now
      const { error } = await supabase
        .from('integration_dlq')
        .update({
          status: 'pending',
          next_retry_at: new Date().toISOString(),
        })
        .eq('id', itemId)
      
      if (error) throw error
      
      toast.success('Item queued for retry')
      loadDLQItems()
    } catch (error) {
      console.error('Error retrying item:', error)
      toast.error('Failed to queue retry')
    }
  }

  const handleBulkRetry = async () => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('integration_dlq')
        .update({
          status: 'pending',
          next_retry_at: new Date().toISOString(),
        })
        .in('status', ['pending', 'failed'])
      
      if (error) throw error
      
      toast.success('All items queued for retry')
      loadDLQItems()
    } catch (error) {
      console.error('Error bulk retrying:', error)
      toast.error('Failed to bulk retry')
    }
  }

  const handleDiscard = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently discard this item?')) return
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('integration_dlq')
        .update({
          status: 'discarded',
        })
        .eq('id', itemId)
      
      if (error) throw error
      
      toast.success('Item discarded')
      loadDLQItems()
    } catch (error) {
      console.error('Error discarding item:', error)
      toast.error('Failed to discard item')
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return <Badge className="bg-yellow-500">Pending Retry</Badge>
    }
    if (status === 'failed') {
      return <Badge variant="destructive">Permanently Failed</Badge>
    }
    if (status === 'retrying') {
      return <Badge className="bg-blue-500">Retrying...</Badge>
    }
    if (status === 'resolved') {
      return <Badge className="bg-green-500">Resolved</Badge>
    }
    return <Badge variant="secondary">Discarded</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Failed Operations (DLQ)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage and retry failed webhook/API operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDLQItems}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkRetry}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Retry All
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filter === 'failed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('failed')}
        >
          Permanently Failed
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {/* DLQ Items Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">Loading failed operations...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <PlayCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No failed operations</h3>
            <p className="text-gray-600">
              All integration operations are processing successfully!
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>First Failed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.integration_type.replace(/_/g, ' ').toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {item.operation}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm text-red-600 truncate">{item.error_message}</p>
                      {item.error_code && (
                        <p className="text-xs text-gray-500 mt-1">Code: {item.error_code}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.retry_count}/{item.max_retries}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(item.first_failed_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRetry(item.id)}
                        disabled={item.status === 'retrying'}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => handleDiscard(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Failed Operation Details</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Integration</p>
                  <p className="font-medium">{selectedItem.integration_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Operation</p>
                  <p className="font-medium">{selectedItem.operation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getStatusBadge(selectedItem.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Retries</p>
                  <p className="font-medium">{selectedItem.retry_count}/{selectedItem.max_retries}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Error Message</p>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{selectedItem.error_message}</p>
                  {selectedItem.error_code && (
                    <p className="text-xs text-red-600 mt-1">Code: {selectedItem.error_code}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Payload</p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded text-xs font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedItem.payload, null, 2)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">First Failed</p>
                  <p className="font-medium">{formatDate(selectedItem.first_failed_at)}</p>
                </div>
                {selectedItem.last_retry_at && (
                  <div>
                    <p className="text-sm text-gray-600">Last Retry</p>
                    <p className="font-medium">{formatDate(selectedItem.last_retry_at)}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="default" 
                  onClick={() => {
                    handleRetry(selectedItem.id)
                    setSelectedItem(null)
                  }}
                  disabled={selectedItem.status === 'retrying'}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Now
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDiscard(selectedItem.id)
                    setSelectedItem(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard
                </Button>
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

