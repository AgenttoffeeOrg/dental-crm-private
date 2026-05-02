import { NextRequest, NextResponse } from 'next/server'
import { botService } from '@/lib/engagement/bot-service'
import { registerEngagementQueue } from '@/lib/queues/engagement-queue'

registerEngagementQueue()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenant_id: tenantId,
      contact_id: contactId,
      deal_id: dealId,
      channel,
      user_id: userId,
      metadata,
    } = body || {}

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }
    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }

    const session = await botService.getOrCreateSession({
      tenantId,
      contactId,
      dealId,
      channel,
      userId,
      metadata,
    })

    return NextResponse.json({ success: true, session })
  } catch (error: any) {
    console.error('[BOT] Failed to create session', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: error?.status || 500 }
    )
  }
}







