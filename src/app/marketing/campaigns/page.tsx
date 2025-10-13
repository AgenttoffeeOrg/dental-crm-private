'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { CampaignsList } from '@/components/marketing/campaigns-list'

export default function CampaignsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
              <p className="text-gray-600">Email & SMS campaigns with tracking</p>
            </div>
            <Link href="/marketing/campaigns/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          </div>

          <CampaignsList />
        </div>
      </div>
    </DashboardLayout>
  )
}

