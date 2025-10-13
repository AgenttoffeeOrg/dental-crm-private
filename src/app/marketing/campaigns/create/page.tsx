'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ModernCampaignBuilder } from '@/components/marketing/modern-campaign-builder'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'

export default function CreateCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialChannel = searchParams.get('channel') as 'email' | 'sms' | 'whatsapp' | null
  const supabase = createClient()

  const handleComplete = async (campaignData: any) => {
    try {
      const status = campaignData.scheduleType === 'now' ? 'active' : 'scheduled'
      
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name: campaignData.name,
          channel: campaignData.channel,
          status: status,
          subject_line: campaignData.subject,
          from_name: campaignData.fromName,
          from_email: campaignData.fromEmail,
          content_html: campaignData.message,
          segment_id: campaignData.segmentId,
          template_id: campaignData.templateId || null,
          scheduled_send_time: campaignData.scheduleType === 'schedule' ? campaignData.scheduledTime : null,
          sent_at: campaignData.scheduleType === 'now' ? new Date().toISOString() : null,
          metrics: {
            sent: campaignData.scheduleType === 'now' ? campaignData.estimatedReach : 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            unsubscribed: 0
          }
        })
        .select()
        .single()

      if (error) throw error

      toast.success(
        campaignData.scheduleType === 'now' 
          ? '🚀 Campaign created and sent!' 
          : '📅 Campaign scheduled successfully!'
      )
      router.push('/marketing/campaigns')
    } catch (error) {
      console.error('[CAMPAIGN] Error creating:', error)
      toast.error('Failed to create campaign')
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/marketing/campaigns">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Create Campaign
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </h1>
                <p className="text-gray-600 mt-1">Build and launch your campaign in one seamless flow</p>
              </div>
            </div>
          </div>

          <ModernCampaignBuilder
            initialChannel={initialChannel || undefined}
            onComplete={handleComplete}
            onCancel={() => router.push('/marketing/campaigns')}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}


