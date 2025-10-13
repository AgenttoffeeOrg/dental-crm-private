import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email, name, practiceName } = await request.json()

    if (!email || !name || !practiceName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await emailService.sendWelcome(email, name, practiceName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

