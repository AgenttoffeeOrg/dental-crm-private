'use client'

import { Building2, Key, SkipForward, Plus, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { OrgDecisionModalProps, OrgDecision } from '@/types/invites'

/**
 * OrgDecisionModal Component
 * 
 * Presents the user with 2-3 choices for organization setup:
 * 1. Create your own organization
 * 2. Join with an invite code
 * 3. Skip (optional, only if canSkip=true)
 * 
 * Beautiful, modern UI with clear CTAs and helpful descriptions.
 * 
 * Features:
 * - Clear choice cards with icons
 * - Conditional skip option
 * - Responsive layout
 * - Keyboard accessible
 * - Beautiful animations
 * 
 * Usage:
 * ```tsx
 * <OrgDecisionModal
 *   isOpen={showDecision}
 *   onClose={() => setShowDecision(false)}
 *   onDecision={(decision) => handleDecision(decision)}
 *   canSkip={false}
 * />
 * ```
 */
export function OrgDecisionModal({
  isOpen,
  onClose,
  onDecision,
  hasInvites = false,
  canSkip = false
}: OrgDecisionModalProps) {
  
  const handleDecision = (decision: OrgDecision) => {
    onDecision(decision)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Get Started with Your Organization</DialogTitle>
          <DialogDescription className="text-base">
            {hasInvites ? (
              'You have pending invitations! You can also create your own organization or join with a code.'
            ) : (
              'Choose how you\'d like to set up your workspace.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Option 1: Create Organization */}
          <button
            onClick={() => handleDecision('create')}
            className="group relative flex items-start gap-4 rounded-lg border-2 border-gray-200 p-5 text-left transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:hover:border-blue-500"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-500 dark:bg-blue-900 dark:group-hover:bg-blue-600">
              <Plus className="h-6 w-6 text-blue-600 transition-colors group-hover:text-white dark:text-blue-400 dark:group-hover:text-white" />
            </div>
            
            <div className="flex-1 space-y-1.5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create Your Organization
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start fresh with your own practice. You'll be the owner and can invite team members later.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Building2 className="h-3.5 w-3.5" />
                <span>Recommended for solo practitioners</span>
              </div>
            </div>
          </button>

          {/* Option 2: Join with Code */}
          <button
            onClick={() => handleDecision('join')}
            className="group relative flex items-start gap-4 rounded-lg border-2 border-gray-200 p-5 text-left transition-all hover:border-green-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-700 dark:hover:border-green-500"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 transition-colors group-hover:bg-green-500 dark:bg-green-900 dark:group-hover:bg-green-600">
              <Key className="h-6 w-6 text-green-600 transition-colors group-hover:text-white dark:text-green-400 dark:group-hover:text-white" />
            </div>
            
            <div className="flex-1 space-y-1.5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Join with Invite Code
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Have a 6-character code? Enter it to join an existing organization.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-green-600 dark:text-green-400">
                <Users className="h-3.5 w-3.5" />
                <span>Perfect for joining a team</span>
              </div>
            </div>
          </button>

          {/* Option 3: Skip (Optional) */}
          {canSkip && (
            <button
              onClick={() => handleDecision('skip')}
              className="group relative flex items-center justify-center gap-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-600 transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <SkipForward className="h-4 w-4" />
              <span>I'll do this later</span>
            </button>
          )}
        </div>

        {/* Helper Text */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong className="font-medium text-gray-900 dark:text-gray-100">Need help?</strong>
            {' '}You can create multiple organizations and switch between them anytime from your dashboard.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

