'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TaskInbox } from '@/components/tasks/task-inbox'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'

export default function TasksPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage and track your tasks and to-dos</p>
        </div>
        <TaskInbox />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}
