import { NextRequest, NextResponse } from 'next/server'
import { botService } from '@/lib/engagement/bot-service'
import { registerEngagementQueue } from '@/lib/queues/engagement-queue'

registerEngagementQueue()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenant_id: tenantId,
      session_id: sessionId,
      message,
      user_id: userId,
      metadata,
    } = body || {}

    if (!tenantId || !sessionId || !message) {
      return NextResponse.json(
        { error: 'tenant_id, session_id, and message are required' },
        { status: 400 }
      )
    }

    const result = await botService.handleUserTurn({
      tenantId,
      sessionId,
      message,
      userId,
      metadata,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[BOT] Failed to process turn', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: error?.status || 500 }
    )
  }
}





