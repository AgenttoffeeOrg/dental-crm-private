import { NextRequest, NextResponse } from 'next/server'
import { botService } from '@/lib/engagement/bot-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id: tenantId, session_id: sessionId, reason, user_id: userId } = body || {}

    if (!tenantId || !sessionId) {
      return NextResponse.json({ error: 'tenant_id and session_id are required' }, { status: 400 })
    }

    const result = await botService.escalateSession({
      tenantId,
      sessionId,
      reason,
      userId,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[BOT] Failed to escalate session', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: error?.status || 500 }
    )
  }
}



