'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AudiencesList } from '@/components/marketing/audiences-list'
import { CreateAudienceDialog } from '@/components/marketing/create-audience-dialog'

export default function AudiencesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audiences & Segments</h1>
              <p className="text-gray-600">Organize and target your contacts</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Audience
            </Button>
          </div>

          <AudiencesList key={refreshTrigger} />

          <CreateAudienceDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onAudienceCreated={() => setRefreshTrigger(prev => prev + 1)}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

