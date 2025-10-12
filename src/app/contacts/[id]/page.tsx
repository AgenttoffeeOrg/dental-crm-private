'use client'

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContactDetailView } from '@/components/contacts/contact-detail-view'

export default function ContactDetailPage() {
  const params = useParams()
  const contactId = params.id as string

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden">
        <ContactDetailView contactId={contactId} />
      </div>
    </DashboardLayout>
  )
}
