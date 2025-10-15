'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase-client'
import { Clock, RotateCcw, Eye, User } from 'lucide-react'
import { toast } from 'sonner'

interface FormVersion {
  id: string
  form_id: string
  version_number: number
  snapshot: any
  changed_by_user_id: string | null
  change_summary: string | null
  changes: any
  created_at: string
}

interface VersionHistoryProps {
  formId: string
  onRollback?: () => void
}

export function VersionHistory({ formId, onRollback }: VersionHistoryProps) {
  const [versions, setVersions] = useState<FormVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<FormVersion | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadVersions()
  }, [formId])

  const loadVersions = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('form_versions')
        .select('*')
        .eq('form_id', formId)
        .order('version_number', { ascending: false })

      if (error) {
        console.error('[VersionHistory] Error:', error)
        toast.error('Failed to load version history')
        return
      }

      setVersions(data || [])
    } catch (err) {
      console.error('[VersionHistory] Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`Rollback to version ${versionNumber}? This will replace the current form.`)) {
      return
    }

    try {
      const { data, error } = await supabase.rpc('rollback_form_to_version', {
        p_form_id: formId,
        p_version_number: versionNumber,
      })

      if (error) {
        throw error
      }

      toast.success(`Rolled back to version ${versionNumber}`)
      
      if (onRollback) {
        onRollback()
      }
    } catch (error) {
      console.error('[VersionHistory] Rollback error:', error)
      toast.error('Failed to rollback form')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading version history...</p>
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No version history yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Versions are automatically saved when you edit the form
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Version History ({versions.length})
        </CardTitle>
        <p className="text-sm text-gray-600">
          All changes are automatically tracked. You can rollback to any previous version.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {versions.map((version, index) => {
          const isLatest = index === 0

          return (
            <div
              key={version.id}
              className={`
                border rounded-lg p-4 hover:shadow-md transition-all
                ${isLatest ? 'bg-green-50 border-green-300' : 'bg-white'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      Version {version.version_number}
                    </span>
                    {isLatest && (
                      <Badge variant="default" className="bg-green-600">
                        Current
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {new Date(version.created_at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {version.change_summary && (
                    <p className="text-xs text-gray-500 mb-2">
                      {version.change_summary}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {version.changed_by_user_id ? 'Auto-saved' : 'System'}
                    </span>
                    <span>
                      {version.snapshot.fields_json?.length || 0} fields
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedVersion(
                      selectedVersion?.id === version.id ? null : version
                    )}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {selectedVersion?.id === version.id ? 'Hide' : 'View'}
                  </Button>

                  {!isLatest && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRollback(version.version_number)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>

              {/* Version Details (expanded) */}
              {selectedVersion?.id === version.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold mb-2">Form Configuration:</h4>
                  <div className="bg-gray-50 rounded p-3 space-y-1 text-xs font-mono">
                    <div><strong>Name:</strong> {version.snapshot.name}</div>
                    <div><strong>Status:</strong> {version.snapshot.status}</div>
                    <div><strong>Fields:</strong> {version.snapshot.fields_json?.length || 0}</div>
                    <div><strong>reCAPTCHA:</strong> {version.snapshot.enable_recaptcha ? 'Enabled' : 'Disabled'}</div>
                  </div>

                  {version.changes && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold mb-2">Changes in This Version:</h4>
                      <div className="bg-blue-50 rounded p-3 text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(version.changes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

