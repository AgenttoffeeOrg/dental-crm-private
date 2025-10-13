'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ModernCampaignBuilder } from '@/components/marketing/modern-campaign-builder'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'
import { useTenant } from '@/lib/hooks/use-tenant'

export const dynamic = 'force-dynamic'

export default function CreateCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { tenantId } = useTenant()

  const handleComplete = async (campaignData: any) => {
    const supabase = createClient()

    try {
      if (editId) {
        // Update existing campaign
        const { error } = await supabase
          .from('marketing_campaigns')
          .update({
            name: campaignData.name,
            type: campaignData.channel,
            subject_line: campaignData.content.subject,
            preview_text: campaignData.content.preview,
            email_html: campaignData.content.body,
            sms_text: campaignData.content.message,
            whatsapp_template_id: campaignData.content.templateId,
            audience_segment_id: campaignData.audience.segmentId,
            scheduled_send_at: campaignData.schedule.sendTime,
            status: campaignData.schedule.sendNow ? 'active' : 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', editId)
          .eq('tenant_id', tenantId)

        if (error) throw error

        toast.success('Campaign updated successfully!')
      } else {
        // Create new campaign
        const { error } = await supabase
          .from('marketing_campaigns')
          .insert([{
            tenant_id: tenantId,
            name: campaignData.name,
            type: campaignData.channel,
            subject_line: campaignData.content.subject,
            preview_text: campaignData.content.preview,
            email_html: campaignData.content.body,
            sms_text: campaignData.content.message,
            whatsapp_template_id: campaignData.content.templateId,
            audience_segment_id: campaignData.audience.segmentId,
            scheduled_send_at: campaignData.schedule.sendTime,
            status: campaignData.schedule.sendNow ? 'active' : 'scheduled'
          }])

        if (error) throw error

        toast.success('Campaign created successfully!')
      }

      router.push('/marketing/campaigns')
    } catch (error: any) {
      console.error('Error saving campaign:', error)
      toast.error(error.message || 'Failed to save campaign')
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="p-8 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/marketing/campaigns">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-indigo-600" />
                {editId ? 'Edit Campaign' : 'Create Campaign'}
              </h1>
              <p className="text-gray-600 mt-1">Build your multi-channel marketing campaign</p>
            </div>
          </div>

          <ModernCampaignBuilder onComplete={handleComplete} />
        </div>
      </div>
    </DashboardLayout>
  )
}
