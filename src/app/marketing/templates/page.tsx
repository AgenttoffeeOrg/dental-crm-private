'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { TemplateList } from '@/components/marketing/template-list'

export default function TemplatesPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
              <p className="text-gray-600">Design beautiful, reusable email templates</p>
            </div>
            <Link href="/marketing/templates/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </Link>
          </div>

          <TemplateList />
        </div>
      </div>
    </DashboardLayout>
  )
}

