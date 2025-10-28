'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Plus, Rocket } from 'lucide-react'
import Link from 'next/link'
import { CampaignsDashboard } from '@/components/marketing/campaigns-dashboard'

export default function CampaignsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Rocket className="h-8 w-8 text-blue-600" />
                Campaigns
              </h1>
              <p className="text-gray-600 mt-1">Manage multi-channel campaigns across Email, SMS & WhatsApp</p>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" asChild>
              <Link href="/marketing/campaigns/create">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          </div>

          <CampaignsDashboard />
        </div>
      </div>
    </DashboardLayout>
  )
}

