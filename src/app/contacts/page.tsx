'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContactsListEnterprise as ContactsList } from '@/components/contacts/contacts-list-enterprise'

export default function ContactsPage() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <ContactsList />
      </div>
    </DashboardLayout>
  )
}
