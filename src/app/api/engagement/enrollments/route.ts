import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { enqueueEngagementEnrollment, registerEngagementQueue } from '@/lib/queues/engagement-queue'

registerEngagementQueue()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenant_id: tenantId,
      campaign_id: campaignId,
      contact_id: contactId,
      deal_id: dealId,
      context,
      user_id: userId,
    } = body || {}

    if (!tenantId || !campaignId) {
      return NextResponse.json({ error: 'tenant_id and campaign_id are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('engagement_enrollments')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaignId,
        contact_id: contactId ?? null,
        deal_id: dealId ?? null,
        status: 'pending',
        context: context || {},
        metadata: {
          created_by: userId ?? null,
        },
      })
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to create enrollment')
    }

    await enqueueEngagementEnrollment(data.id, 0)

    return NextResponse.json({ success: true, enrollment: data })
  } catch (error: any) {
    console.error('[ENGAGEMENT] Failed to create enrollment', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: error?.status || 500 }
    )
  }
}



