'use client'

/**
 * Settings Version History & Rollback UI
 * 
 * View change history and rollback to previous versions
 * 
 * Features:
 * - Version timeline
 * - Side-by-side diff viewer
 * - One-click rollback
 * - Change reason display
 * - Who changed what when
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { History, RotateCcw, User, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { format } from 'date-fns'

interface SettingVersion {
  id: string
  settingKey: string
  versionNumber: number
  oldValue: any
  newValue: any
  changedBy: string
  changedByName: string
  changedAt: string
  changeReason?: string
  isRolledBack: boolean
  rolledBackAt?: string
  rolledBackBy?: string
}

interface SettingsVersionHistoryProps {
  settingKey: string
  settingLabel: string
  tenantId?: string
}

export function SettingsVersionHistory({
  settingKey,
  settingLabel,
  tenantId,
}: SettingsVersionHistoryProps) {
  const [versions, setVersions] = useState<SettingVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  
  useEffect(() => {
    if (showDialog && tenantId) {
      loadVersions()
    }
  }, [showDialog, tenantId, settingKey])
  
  const loadVersions = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data } = await supabase
        .from('settings_versions')
        .select('*, app_users!changed_by(full_name), app_users!rolled_back_by(full_name)')
        .eq('tenant_id', tenantId)
        .eq('setting_key', settingKey)
        .order('version_number', { ascending: false })
      
      if (data) {
        const formattedVersions: SettingVersion[] = data.map((v: any) => ({
          id: v.id,
          settingKey: v.setting_key,
          versionNumber: v.version_number,
          oldValue: v.old_value,
          newValue: v.new_value,
          changedBy: v.changed_by,
          changedByName: v.app_users?.full_name || 'Unknown',
          changedAt: v.changed_at,
          changeReason: v.change_reason,
          isRolledBack: v.is_rolled_back,
          rolledBackAt: v.rolled_back_at,
          rolledBackBy: v.rolled_back_by,
        }))
        
        setVersions(formattedVersions)
      }
    } catch (error) {
      console.error('[Version History] Error loading versions:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRollback = async (versionId: string, versionNumber: number) => {
    if (!confirm(
      `Are you sure you want to rollback to version ${versionNumber}?\n\n` +
      `This will restore the previous value and create a new version.`
    )) {
      return
    }
    
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase.rpc('rollback_setting', {
        p_version_id: versionId,
        p_rolled_back_by: user.id,
        p_rollback_reason: 'Manual rollback from UI',
      })
      
      if (error) {
        toast.error('Failed to rollback setting')
        console.error(error)
        return
      }
      
      toast.success(`Rolled back to version ${versionNumber}`)
      loadVersions()
    } catch (error) {
      console.error('[Version History] Error rolling back:', error)
      toast.error('Failed to rollback')
    }
  }
  
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }
  
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History: {settingLabel}</DialogTitle>
          <DialogDescription>
            View all changes and rollback to previous versions
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No version history yet</p>
            <p className="text-sm">Changes will appear here when you modify this setting</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {versions.map((version, index) => (
              <Card key={version.id} className={`p-4 ${
                version.isRolledBack ? 'bg-red-50 border-red-200' : ''
              }`}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'outline'}>
                        v{version.versionNumber}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="font-medium">{version.changedByName}</span>
                          <span className="text-gray-500">•</span>
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-600">
                            {format(new Date(version.changedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {version.changeReason && (
                          <p className="text-xs text-gray-600 mt-1">
                            Reason: {version.changeReason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {index !== 0 && !version.isRolledBack && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(version.id, version.versionNumber)}
                      >
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Rollback
                      </Button>
                    )}
                  </div>
                  
                  {/* Rolled Back Indicator */}
                  {version.isRolledBack && (
                    <div className="flex items-center gap-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      <span>
                        This version was rolled back on {format(new Date(version.rolledBackAt!), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {/* Diff Viewer */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Previous Value</Label>
                      <pre className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-xs overflow-x-auto max-h-32">
                        {formatValue(version.oldValue)}
                      </pre>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">New Value</Label>
                      <pre className="mt-1 p-3 bg-green-50 border border-green-200 rounded text-xs overflow-x-auto max-h-32">
                        {formatValue(version.newValue)}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

