'use client'

/**
 * Form Submissions Modal
 * View and manage form submissions for a specific form
 * 
 * Features:
 * - Table view of all submissions
 * - Filter by spam/valid
 * - View full submission details
 * - Export to CSV
 * - Link to created Contact/Deal
 */

import { useState, useEffect } from 'react'
import { X, Download, Eye, User, Briefcase, Calendar, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import type { MarketingForm } from '@/hooks/use-marketing-forms'

interface FormSubmission {
  id: string
  form_id: string
  contact_id: string | null
  payload: any
  source_url: string | null
  contact_created: boolean
  is_spam: boolean
  spam_score: number | null
  submitted_at: string
  ip_address: string | null
}

interface FormSubmissionsModalProps {
  open: boolean
  onClose: () => void
  form: MarketingForm
}

export function FormSubmissionsModal({
  open,
  onClose,
  form,
}: FormSubmissionsModalProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [showSpam, setShowSpam] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)

  useEffect(() => {
    if (open && form) {
      loadSubmissions()
    }
  }, [open, form, showSpam])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      let query = supabase
        .from('marketing_form_submissions')
        .select('*')
        .eq('form_id', form.id)
        .order('submitted_at', { ascending: false })

      if (!showSpam) {
        query = query.eq('is_spam', false)
      }

      const { data, error } = await query

      if (error) throw error

      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.error('No submissions to export')
      return
    }

    // Create CSV content
    const headers = ['Date', 'Email', 'Contact Created', 'Spam', 'IP Address']
    const rows = submissions.map(sub => [
      new Date(sub.submitted_at).toLocaleString(),
      sub.payload?.email || sub.payload?.primary_email || 'N/A',
      sub.contact_created ? 'Yes' : 'No',
      sub.is_spam ? 'Yes' : 'No',
      sub.ip_address || 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.name.replace(/\s+/g, '_')}_submissions_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Submissions exported successfully!')
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-x-20 md:top-20 md:bottom-20 bg-white rounded-lg shadow-2xl z-[60] flex flex-col max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Form Submissions</h2>
            <p className="text-sm text-gray-600 mt-1">{form.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpam(!showSpam)}
            >
              {showSpam ? 'Hide Spam' : 'Show Spam'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={submissions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600">Total Submissions</p>
            <p className="text-2xl font-bold">{form.total_submissions}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Valid Submissions</p>
            <p className="text-2xl font-bold">
              {submissions.filter(s => !s.is_spam).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Spam Blocked</p>
            <p className="text-2xl font-bold">
              {submissions.filter(s => s.is_spam).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Contacts Created</p>
            <p className="text-2xl font-bold">
              {submissions.filter(s => s.contact_created).length}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm">Loading submissions...</p>
              </div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600">No submissions yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Submissions will appear here once someone fills out your form
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Submission Details View */}
              {selectedSubmission ? (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubmission(null)}
                    className="mb-4"
                  >
                    ← Back to list
                  </Button>
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Submission Details</h3>
                      <div className="flex gap-2">
                        {selectedSubmission.is_spam && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Spam
                          </Badge>
                        )}
                        {selectedSubmission.contact_created && (
                          <Badge className="bg-green-500">
                            <User className="h-3 w-3 mr-1" />
                            Contact Created
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Submitted At</p>
                        <p className="font-medium">
                          {new Date(selectedSubmission.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">IP Address</p>
                        <p className="font-medium">{selectedSubmission.ip_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Source URL</p>
                        <p className="font-medium text-xs break-all">
                          {selectedSubmission.source_url || 'N/A'}
                        </p>
                      </div>
                      {selectedSubmission.spam_score !== null && (
                        <div>
                          <p className="text-sm text-gray-600">Spam Score</p>
                          <p className="font-medium">{selectedSubmission.spam_score.toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Form Data</h4>
                      <div className="bg-gray-50 rounded p-4 space-y-2">
                        {Object.entries(selectedSubmission.payload || {}).map(([key, value]) => (
                          <div key={key} className="flex gap-4">
                            <span className="text-sm text-gray-600 font-medium min-w-[150px]">
                              {key}:
                            </span>
                            <span className="text-sm">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Email/Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {new Date(submission.submitted_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.payload?.email || submission.payload?.primary_email || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {submission.is_spam ? (
                              <Badge variant="destructive" className="text-xs">
                                Spam
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500 text-xs">Valid</Badge>
                            )}
                            {submission.contact_created && (
                              <Badge variant="outline" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                Contact
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {submission.source_url ? (
                            <span className="truncate max-w-[200px] block">
                              {new URL(submission.source_url).hostname}
                            </span>
                          ) : (
                            'Direct'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

