'use client'

import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CampaignWizard } from '@/components/marketing/campaign-wizard'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'

export default function CreateCampaignPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleComplete = async (campaignData: any) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name: campaignData.name,
          type: campaignData.type,
          status: 'draft',
          subject_line: campaignData.subject,
          from_name: campaignData.fromName,
          from_email: campaignData.fromEmail,
        })

      if (error) throw error

      toast.success('Campaign created!')
      router.push('/marketing/campaigns')
    } catch (error) {
      console.error('[CAMPAIGN] Error creating:', error)
      toast.error('Failed to create campaign')
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/marketing/campaigns">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
              <p className="text-sm text-gray-600">Follow the steps to set up your campaign</p>
            </div>
          </div>

          <CampaignWizard
            onComplete={handleComplete}
            onCancel={() => router.push('/marketing/campaigns')}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

