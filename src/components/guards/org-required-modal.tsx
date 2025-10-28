'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Key, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreateOrgModal,
  JoinWithCodeModal,
  type CreateOrgResponse,
  type AcceptInviteResponse
} from '@/components/invites'

/**
 * OrgRequiredModal Component
 * 
 * Displays when a user without an organization tries to perform an action
 * that requires one (e.g., creating a contact, deal, etc.).
 * 
 * Features:
 * - Friendly explanation of why org is needed
 * - Two main options: Create or Join
 * - Can redirect to onboarding
 * - Nested modals for org creation/joining
 * - Beautiful, non-blocking UI
 * 
 * Usage:
 * ```tsx
 * const { showOrgModal, setShowOrgModal } = useOrgGuard()
 * 
 * <OrgRequiredModal
 *   isOpen={showOrgModal}
 *   onClose={() => setShowOrgModal(false)}
 *   actionName="create this contact"
 * />
 * ```
 */

export interface OrgRequiredModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean
  
  /**
   * Called when modal should close
   */
  onClose: () => void
  
  /**
   * Name of the action being blocked (e.g., "create this contact")
   * Used in the explanation text
   */
  actionName?: string
  
  /**
   * Called after successful org creation or joining
   */
  onSuccess?: () => void
}

export function OrgRequiredModal({
  isOpen,
  onClose,
  actionName = 'perform this action',
  onSuccess
}: OrgRequiredModalProps) {
  const router = useRouter()
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showJoinCode, setShowJoinCode] = useState(false)
  
  // =====================================================================================================
  // HANDLERS
  // =====================================================================================================
  const handleOrgCreated = async (org: CreateOrgResponse) => {
    console.log('[ORG_REQUIRED] Organization created:', org.organization.tenant.name)
    
    // Wait for backend sync
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Close all modals
    setShowCreateOrg(false)
    onClose()
    
    // Notify parent
    onSuccess?.()
    
    // Refresh page to update UI
    router.refresh()
  }
  
  const handleOrgJoined = async (membership: AcceptInviteResponse) => {
    console.log('[ORG_REQUIRED] Organization joined:', membership.membership.tenant.name)
    
    // Wait for backend sync
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Close all modals
    setShowJoinCode(false)
    onClose()
    
    // Notify parent
    onSuccess?.()
    
    // Refresh page to update UI
    router.refresh()
  }
  
  const handleGoToOnboarding = () => {
    onClose()
    router.push('/onboarding')
  }
  
  // =====================================================================================================
  // RENDER
  // =====================================================================================================
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-center text-xl">
              Organization Required
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              You need to be part of an organization to {actionName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Explanation */}
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Organizations help you manage your practice, team members, and data all in one place.
                It only takes a minute to set up!
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="grid gap-3">
              {/* Create Organization */}
              <button
                onClick={() => setShowCreateOrg(true)}
                className="group flex items-start gap-3 rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-500 dark:bg-blue-900 dark:group-hover:bg-blue-600">
                  <Building2 className="h-5 w-5 text-blue-600 transition-colors group-hover:text-white dark:text-blue-400 dark:group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Create Your Organization
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start fresh and invite your team later
                  </p>
                </div>
              </button>

              {/* Join with Code */}
              <button
                onClick={() => setShowJoinCode(true)}
                className="group flex items-start gap-3 rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-green-500 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-500 dark:hover:bg-green-950/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 transition-colors group-hover:bg-green-500 dark:bg-green-900 dark:group-hover:bg-green-600">
                  <Key className="h-5 w-5 text-green-600 transition-colors group-hover:text-white dark:text-green-400 dark:group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Join with Invite Code
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Have a 6-character code from your team?
                  </p>
                </div>
              </button>
            </div>

            {/* Alternative: Full Onboarding */}
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                onClick={handleGoToOnboarding}
                className="w-full text-sm"
              >
                Or go through full setup wizard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Modals */}
      <CreateOrgModal
        isOpen={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        onSuccess={handleOrgCreated}
      />

      <JoinWithCodeModal
        isOpen={showJoinCode}
        onClose={() => setShowJoinCode(false)}
        onSuccess={handleOrgJoined}
      />
    </>
  )
}

