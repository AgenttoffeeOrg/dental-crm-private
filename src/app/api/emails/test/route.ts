import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    await emailService.send({
      to,
      subject: 'Test Email from Dental CRM',
      html: `
        <div style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1 style="color: #667eea;">✅ Email System Working!</h1>
          <p>This is a test email from your Dental CRM.</p>
          <p>If you received this, your email configuration is correct!</p>
        </div>
      `
    })

    return NextResponse.json({ success: true, message: 'Test email sent!' })
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}


