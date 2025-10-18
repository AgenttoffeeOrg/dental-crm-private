'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContactsListEnterprise as ContactsList } from '@/components/contacts/contacts-list-enterprise'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { LocationBanner } from '@/components/ui/location-indicator'
import { Users } from 'lucide-react'

export default function ContactsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <LocationBanner />
        <div className="p-6">
          <Breadcrumbs items={[{ label: 'Contacts' }]} />
          <PageHeader
            title="Contacts"
            description="Manage your patients and leads"
            icon={Users}
          />
          <ContactsList />
        </div>
      </div>
    </DashboardLayout>
  )
}
