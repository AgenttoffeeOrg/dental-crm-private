'use client'

/**
 * Change Impact Warning
 * 
 * Shows impact analysis before saving critical settings
 * 
 * Features:
 * - Calculate affected records
 * - Show warning modal
 * - Require confirmation
 * - Display specific impacts
 * 
 * Usage:
 * ```typescript
 * <ChangeImpactWarning
 *   settingKey="email.provider"
 *   newValue="sendgrid"
 *   oldValue="resend"
 *   onConfirm={handleSave}
 * />
 * ```
 */

import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ImpactDetail {
  recordType: string
  count: number
  description: string
}

interface ChangeImpactWarningProps {
  settingKey: string
  settingLabel: string
  oldValue: any
  newValue: any
  impacts: ImpactDetail[]
  onConfirm: () => void
  onCancel: () => void
  isOpen: boolean
}

export function ChangeImpactWarning({
  settingKey,
  settingLabel,
  oldValue,
  newValue,
  impacts,
  onConfirm,
  onCancel,
  isOpen,
}: ChangeImpactWarningProps) {
  const totalAffected = impacts.reduce((sum, i) => sum + i.count, 0)
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Confirm Setting Change
          </DialogTitle>
          <DialogDescription>
            This change will affect multiple records
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          {/* Setting Change */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">{settingLabel}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Current Value:</p>
                <Badge variant="outline">{JSON.stringify(oldValue)}</Badge>
              </div>
              <div>
                <p className="text-gray-600 mb-1">New Value:</p>
                <Badge>{JSON.stringify(newValue)}</Badge>
              </div>
            </div>
          </div>
          
          {/* Impact Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-2">
                  This will affect {totalAffected} record{totalAffected !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-1">
                  {impacts.map((impact, index) => (
                    <li key={index} className="text-sm text-yellow-800">
                      • {impact.count} {impact.recordType}: {impact.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-600">
            This change will be logged and can be rolled back from Version History.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-yellow-600 hover:bg-yellow-700">
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

