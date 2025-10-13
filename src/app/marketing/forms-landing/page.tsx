'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default function FormsLandingPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Forms & Landing Pages</h1>
              <p className="text-gray-600">Capture leads with embedded forms and hosted pages</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Form
            </Button>
          </div>

          <Card className="p-12">
            <div className="text-center text-gray-500">
              <p>Forms & landing pages coming soon...</p>
              <p className="text-sm mt-2">Form builder with embed codes and hosted URLs</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


