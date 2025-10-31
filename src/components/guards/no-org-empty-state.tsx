'use client'

import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOrgGuard, OrgRequiredModal } from '@/components/guards'
import { useRouter } from 'next/navigation'

interface NoOrgEmptyStateProps {
  /**
   * Title to display (e.g., "Deals", "Contacts", "Pipeline")
   */
  title?: string
  /**
   * Description text (optional, defaults to generic message)
   */
  description?: string
}

/**
 * NoOrgEmptyState Component
 * 
 * Reusable empty state for pages that require an organization.
 * Shows a friendly message with a "Create Organization" button.
 * 
 * Usage:
 * ```tsx
 * if (!hasOrg && !loading) {
 *   return (
 *     <DashboardLayout>
 *       <NoOrgEmptyState title="Deals" />
 *     </DashboardLayout>
 *   )
 * }
 * ```
 */
export function NoOrgEmptyState({ 
  title = 'this page',
  description 
}: NoOrgEmptyStateProps) {
  const router = useRouter()
  const { requireOrg, showOrgModal, setShowOrgModal } = useOrgGuard()
  const [currentAction, setCurrentAction] = useState('')

  return (
    <>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Organization Required
            </h1>
            <p className="text-gray-600 mb-6">
              {description || `To access ${title}, you need to create an organization first. This will let you manage your ${title.toLowerCase()}, contacts, deals, and more.`}
            </p>
            <Button
              onClick={() => {
                setCurrentAction(`access ${title.toLowerCase()}`)
                requireOrg(() => {
                  // This will trigger OrgRequiredModal
                  router.push('/settings/organizations/create')
                })()
              }}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Organization
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              You can explore the app, but you'll need an organization to create data.
            </p>
          </div>
        </div>
      </div>
      <OrgRequiredModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        actionName={currentAction || 'access this feature'}
        onSuccess={() => {
          // Refresh after org creation
          window.location.reload()
        }}
      />
    </>
  )
}
