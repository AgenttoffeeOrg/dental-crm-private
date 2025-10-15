/**
 * Email Notifications for Form Submissions
 * Sends confirmation emails and admin notifications
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * Send email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, from = 'noreply@dentalcrm.com' } = params

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    console.warn('[Email] Resend API key not configured')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Email] Failed to send:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return false
  }
}

/**
 * Generate confirmation email HTML
 */
export function generateConfirmationEmail(params: {
  recipientName: string
  formName: string
  message: string
  submissionData: Record<string, any>
}): string {
  const { recipientName, formName, message, submissionData } = params

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Form Submission Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #3b82f6, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Thank You!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Dear ${recipientName},
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${message}
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937; font-size: 16px;">Your Submission Details:</h3>
      ${Object.entries(submissionData)
        .map(([key, value]) => `
          <p style="margin: 8px 0; font-size: 14px;">
            <strong style="color: #6b7280;">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> 
            ${value}
          </p>
        `)
        .join('')}
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      If you have any questions, feel free to contact us.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
    <p>This is an automated message. Please do not reply to this email.</p>
    <p>© ${new Date().getFullYear()} DentalCRM. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate admin notification email HTML
 */
export function generateAdminNotificationEmail(params: {
  formName: string
  submissionData: Record<string, any>
  submittedAt: string
  leadScore?: number
  leadCategory?: string
}): string {
  const { formName, submissionData, submittedAt, leadScore, leadCategory } = params

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Form Submission</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">🔔 New Form Submission</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; font-weight: bold; color: #1e40af;">Form: ${formName}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">
        Submitted: ${new Date(submittedAt).toLocaleString('en-GB')}
      </p>
    </div>
    
    ${leadScore !== undefined ? `
      <div style="background: ${leadCategory === 'HOT' ? '#fee2e2' : leadCategory === 'WARM' ? '#fef3c7' : '#dbeafe'}; 
                  border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; 
                   color: ${leadCategory === 'HOT' ? '#991b1b' : leadCategory === 'WARM' ? '#92400e' : '#1e40af'};">
          Lead Score: ${leadScore}/100 — ${leadCategory}
        </p>
      </div>
    ` : ''}
    
    <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px;">Submission Details:</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      ${Object.entries(submissionData)
        .map(([key, value]) => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 8px; font-weight: 600; color: #6b7280; width: 40%;">
              ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </td>
            <td style="padding: 12px 8px; color: #1f2937;">
              ${value || '—'}
            </td>
          </tr>
        `)
        .join('')}
    </table>
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/contacts" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; font-weight: 600;">
        View in CRM
      </a>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af; border-radius: 0 0 10px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
    <p>This is an automated notification from your DentalCRM form.</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Send confirmation email to form submitter
 */
export async function sendConfirmationEmail(params: {
  recipientEmail: string
  recipientName: string
  formName: string
  message: string
  submissionData: Record<string, any>
}): Promise<boolean> {
  const html = generateConfirmationEmail(params)

  return sendEmail({
    to: params.recipientEmail,
    subject: `Thank you for contacting us, ${params.recipientName}`,
    html,
  })
}

/**
 * Send admin notification email
 */
export async function sendAdminNotification(params: {
  adminEmail: string
  formName: string
  submissionData: Record<string, any>
  submittedAt: string
  leadScore?: number
  leadCategory?: string
}): Promise<boolean> {
  const html = generateAdminNotificationEmail(params)

  const subject = params.leadCategory === 'HOT'
    ? `🔥 HOT Lead: New ${params.formName} Submission`
    : `New Form Submission: ${params.formName}`

  return sendEmail({
    to: params.adminEmail,
    subject,
    html,
  })
}

