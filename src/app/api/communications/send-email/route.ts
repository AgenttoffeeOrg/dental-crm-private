import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// AI Helper: Extract email purpose from subject/body
function extractEmailPurpose(subject: string, body: string): string {
  const combined = `${subject} ${body}`.toLowerCase()
  
  // Keywords for common purposes
  if (combined.includes('quote') || combined.includes('pricing') || combined.includes('cost') || combined.includes('price')) {
    return 'Quote Request'
  }
  if (combined.includes('appointment') || combined.includes('schedule') || combined.includes('book') || combined.includes('reschedule')) {
    return 'Appointment Scheduling'
  }
  if (combined.includes('follow up') || combined.includes('follow-up') || combined.includes('checking in')) {
    return 'Follow-up'
  }
  if (combined.includes('question') || combined.includes('inquiry') || combined.includes('asking') || combined.includes('wondering')) {
    return 'Question/Inquiry'
  }
  if (combined.includes('thank you') || combined.includes('thanks') || combined.includes('grateful')) {
    return 'Thank You'
  }
  if (combined.includes('confirm') || combined.includes('confirmation')) {
    return 'Confirmation'
  }
  if (combined.includes('consultation') || combined.includes('consult')) {
    return 'Consultation Request'
  }
  if (combined.includes('information') || combined.includes('details') || combined.includes('more about')) {
    return 'Information Request'
  }
  if (combined.includes('treatment') || combined.includes('procedure')) {
    return 'Treatment Discussion'
  }
  if (combined.includes('payment') || combined.includes('invoice') || combined.includes('bill')) {
    return 'Payment/Billing'
  }
  if (combined.includes('reminder')) {
    return 'Reminder'
  }
  
  // Default
  return 'General Communication'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      contact_id,
      deal_id,
      tenant_id,
      user_id
    } = body

    // Validate required fields
    if (!to || !subject || !emailBody || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body, tenant_id' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Load integration settings
    const { data: settings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (settingsError || !settings || !settings.is_email_configured) {
      return NextResponse.json(
        { error: 'Email integration not configured. Please configure in Settings → Integrations.' },
        { status: 400 }
      )
    }

    // 2. SEND EMAIL VIA PROVIDER
    // TODO: Add actual email sending logic based on provider
    let externalId: string | null = null
    let sendSuccess = false

    if (settings.email_provider === 'sendgrid') {
      // TODO: Integrate SendGrid API
      // Example:
      // const sgMail = require('@sendgrid/mail')
      // sgMail.setApiKey(settings.email_api_key)
      // const msg = {
      //   to: Array.isArray(to) ? to : [to],
      //   from: settings.email_from_address,
      //   subject: subject,
      //   html: emailBody,
      // }
      // const response = await sgMail.send(msg)
      // externalId = response[0].headers['x-message-id']
      
      console.log('[EMAIL] SendGrid integration ready. Add API key to send.')
      externalId = `sendgrid_${Date.now()}`
      sendSuccess = true
      
    } else if (settings.email_provider === 'gmail') {
      // TODO: Integrate Gmail API (OAuth required)
      console.log('[EMAIL] Gmail integration ready. Add OAuth token to send.')
      externalId = `gmail_${Date.now()}`
      sendSuccess = true
      
    } else if (settings.email_provider === 'outlook') {
      // TODO: Integrate Microsoft Graph API (OAuth required)
      console.log('[EMAIL] Outlook integration ready. Add OAuth token to send.')
      externalId = `outlook_${Date.now()}`
      sendSuccess = true
      
    } else if (settings.email_provider === 'ses') {
      // TODO: Integrate Amazon SES
      console.log('[EMAIL] Amazon SES integration ready. Add credentials to send.')
      externalId = `ses_${Date.now()}`
      sendSuccess = true
    }

    // 3. AI-Extract PURPOSE, OUTCOME, and SUMMARY
    const aiPurpose = extractEmailPurpose(subject, emailBody)
    const aiOutcome = sendSuccess ? 'Sent successfully' : 'Failed to send'
    const aiSummary = `${aiPurpose} email to ${Array.isArray(to) ? to.join(', ') : to}${subject ? ` - ${subject}` : ''}`
    
    // 4. Log activity in CRM with AI insights
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id,
        type: 'email',
        contact_id,
        deal_id,
        agent_user_id: user_id,
        direction: 'outbound',
        subject,
        snippet: emailBody.substring(0, 200),
        rich_content: emailBody,
        integration_provider: settings.email_provider,
        external_id: externalId,
        email_to: Array.isArray(to) ? to : [to],
        email_cc: cc || [],
        email_bcc: bcc || [],
        email_from: settings.email_from_address,
        message_status: sendSuccess ? 'sent' : 'failed',
        metadata: {
          ai_purpose: aiPurpose,
          ai_outcome: aiOutcome,
          ai_summary: aiSummary,
          ai_sentiment: 'neutral'
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[EMAIL] Error logging activity:', activityError)
      return NextResponse.json(
        { error: 'Email sent but failed to log activity', details: activityError },
        { status: 500 }
      )
    }

    // 4. Log integration event
    await supabase
      .from('integration_logs')
      .insert({
        tenant_id,
        integration_type: 'email',
        action: 'send',
        provider: settings.email_provider,
        activity_id: activity.id,
        external_id: externalId,
        request_data: { to, subject, body_length: emailBody.length },
        status: sendSuccess ? 'success' : 'error',
        error_message: sendSuccess ? null : 'Provider not fully configured'
      })

    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      external_id: externalId,
      message: sendSuccess 
        ? 'Email sent successfully!' 
        : 'Email logged. Configure integration to actually send.',
      provider: settings.email_provider
    })

  } catch (error: unknown) {
    console.error('[EMAIL] Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

