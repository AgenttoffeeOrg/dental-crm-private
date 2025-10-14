'use client'

/**
 * New Contact Page
 * Full-page contact creation form
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContactProfileDialog } from '@/components/contacts/contact-profile-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { useAuth } from '@/lib/auth'

export default function NewContactPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(true)

  const handleContactCreated = () => {
    // Refresh and go back to contacts list
    router.push('/contacts')
    router.refresh()
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // User cancelled - go back to contacts
      router.push('/contacts')
    }
    setDialogOpen(open)
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <Breadcrumbs 
            items={[
              { label: 'Contacts', href: '/contacts' },
              { label: 'New Contact' }
            ]} 
          />
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Contact</h1>
            <p className="text-gray-600 mt-1">Add a new patient or lead to your CRM</p>
          </div>

          {/* Use existing ContactProfileDialog in create mode */}
          <ContactProfileDialog
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            contact={null}
            onContactUpdated={handleContactCreated}
            tenantId={appUser?.tenant_id}
            mode="create"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

