'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContactsList } from '@/components/contacts/contacts-list'

export default function ContactsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Manage your patients and leads</p>
        </div>
        <ContactsList />
      </div>
    </DashboardLayout>
  )
}
