/**
 * Join Request Manager Component
 * 
 * Admin interface for viewing and managing join requests.
 * Includes approval, rejection, and role assignment functionality.
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Mail, 
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle 
} from 'lucide-react'

interface JoinRequest {
  id: string
  tenant_id: string
  requester_email: string
  requester_name: string | null
  message: string | null
  requested_role: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  decided_by_user_id: string | null
  decided_at: string | null
  rejection_reason: string | null
  created_at: string
}

interface JoinRequestManagerProps {
  tenantId: string
  className?: string
}

export function JoinRequestManager({ tenantId, className = '' }: JoinRequestManagerProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    loadJoinRequests()
  }, [statusFilter])

  const loadJoinRequests = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/join-requests?status=${statusFilter}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load join requests')
      }

      setRequests(data.requests || [])
    } catch (err: any) {
      console.error('Error loading join requests:', err)
      setError(err.message || 'Failed to load join requests')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Join Requests
              </h2>
              <p className="text-sm text-gray-600">
                Manage requests from users wanting to join your organization
              </p>
            </div>
          </div>

          <button
            onClick={loadJoinRequests}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Status Tabs */}
        <div className="mt-4 flex gap-2">
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              No {statusFilter} requests
            </p>
            <p className="text-sm text-gray-600">
              {statusFilter === 'pending'
                ? 'When users request to join, they will appear here.'
                : `No requests have been ${statusFilter}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <JoinRequestCard
                key={request.id}
                request={request}
                onUpdate={loadJoinRequests}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Join Request Card Component
 */
interface JoinRequestCardProps {
  request: JoinRequest
  onUpdate: () => void
}

function JoinRequestCard({ request, onUpdate }: JoinRequestCardProps) {
  const [processing, setProcessing] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState(request.requested_role)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = async () => {
    if (!confirm(`Approve ${request.requester_email} as ${selectedRole}?`)) {
      return
    }

    setProcessing(true)

    try {
      const response = await fetch(`/api/join-requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_role: selectedRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requires_upgrade) {
          alert(`Cannot approve: ${data.error}\n\nPlease upgrade your plan to add more seats.`)
        } else {
          throw new Error(data.error || 'Failed to approve request')
        }
        return
      }

      alert('✅ Join request approved! User has been notified via email.')
      onUpdate()
    } catch (err: any) {
      console.error('Error approving request:', err)
      alert('Error: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setProcessing(true)

    try {
      const response = await fetch(`/api/join-requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject request')
      }

      alert('Request rejected. User has been notified via email.')
      setShowRejectDialog(false)
      onUpdate()
    } catch (err: any) {
      console.error('Error rejecting request:', err)
      alert('Error: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {request.requester_name || request.requester_email}
            </span>
            {request.requester_name && (
              <span className="text-sm text-gray-600">({request.requester_email})</span>
            )}
          </div>

          {/* Message */}
          {request.message && (
            <p className="text-sm text-gray-700 mb-2 italic">
              &quot;{request.message}&quot;
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Requested: {formatDate(request.created_at)}</span>
            <span>•</span>
            <span>Role: {request.requested_role}</span>
          </div>

          {/* Rejection Reason */}
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-900">
              <strong>Rejected:</strong> {request.rejection_reason}
            </div>
          )}

          {/* Approval Info */}
          {request.status === 'approved' && request.decided_at && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>Approved on {formatDate(request.decided_at)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {request.status === 'pending' && (
          <div className="flex flex-col gap-2">
            {/* Role Selector */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={processing}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
              <option value="viewer">Viewer</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-1.5 transition-colors"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve
              </button>

              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={processing}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 flex items-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Reject Join Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting {request.requester_email}
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., We don't recognize this email address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              disabled={processing}
            />

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setShowRejectDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

