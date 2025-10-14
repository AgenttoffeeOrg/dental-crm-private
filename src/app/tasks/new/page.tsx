'use client'

/**
 * New Task Page
 * Full-page task creation form
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { useAuth } from '@/lib/auth'

export default function NewTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appUser } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(true)

  // Get preselected contact or deal from URL params
  const preselectedContactId = searchParams.get('contact_id') || undefined
  const preselectedDealId = searchParams.get('deal_id') || undefined

  const handleTaskCreated = () => {
    // Refresh and go back to tasks list
    router.push('/tasks')
    router.refresh()
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // User cancelled - go back to tasks
      router.push('/tasks')
    }
    setDialogOpen(open)
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <Breadcrumbs 
            items={[
              { label: 'Tasks', href: '/tasks' },
              { label: 'New Task' }
            ]} 
          />
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Task</h1>
            <p className="text-gray-600 mt-1">Add a task and assign it to a team member</p>
          </div>

          {/* Use existing CreateTaskDialog */}
          <CreateTaskDialog
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            onTaskCreated={handleTaskCreated}
            tenantId={appUser?.tenant_id}
            preselectedContactId={preselectedContactId}
            preselectedDealId={preselectedDealId}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

