import { google } from 'googleapis'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

export interface EmailIntegrationSettings {
  email_provider: string | null
  email_api_key?: string | null
  email_from_address?: string | null
  email_from_name?: string | null
  email_oauth_token?: string | null
  email_oauth_refresh_token?: string | null
  email_oauth_expires_at?: string | null
}

export interface EmailSendPayload {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  replyTo?: string
  fromEmail?: string
  fromName?: string
  headers?: Record<string, string>
}

export interface EmailSendResult {
  success: boolean
  externalId?: string
  providerMessageId?: string
  status?: string
  providerResponse?: Record<string, any>
  updatedToken?: {
    accessToken: string
    expiresAt?: string
  }
  error?: string
}

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000

function isTokenExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return true
  const expiry = new Date(expiresAt).getTime()
  return Number.isNaN(expiry) || expiry <= Date.now() + TOKEN_EXPIRY_BUFFER_MS
}

function getFromAddress(settings: EmailIntegrationSettings, fallback?: string) {
  return settings.email_from_address || fallback
}

function formatRecipients(addresses: string[] | undefined) {
  return (addresses || []).filter(Boolean)
}

function buildMimeMessage(payload: EmailSendPayload, fromAddress: string) {
  const headers: string[] = [
    `From: ${payload.fromName ? `${payload.fromName} <${fromAddress}>` : fromAddress}`,
    `To: ${payload.to.join(', ')}`,
    `Subject: ${payload.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
  ]

  if (payload.cc && payload.cc.length > 0) {
    headers.push(`Cc: ${payload.cc.join(', ')}`)
  }

  if (payload.bcc && payload.bcc.length > 0) {
    headers.push(`Bcc: ${payload.bcc.join(', ')}`)
  }

  if (payload.replyTo) {
    headers.push(`Reply-To: ${payload.replyTo}`)
  }

  const messageIdHeader = payload.headers?.['Message-ID']
  if (messageIdHeader) {
    headers.push(`Message-ID: ${messageIdHeader}`)
  }

  const message = `${headers.join('\r\n')}\r\n\r\n${payload.html}`
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client credentials not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Google token refresh failed: ${error.error_description || error.error || response.statusText}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token as string,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
  }
}

async function refreshMicrosoftAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_TENANT_ID || process.env.AZURE_AD_TENANT_ID || 'common'

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth client credentials not configured')
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Microsoft token refresh failed: ${error.error_description || error.error || response.statusText}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token as string,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
  }
}

async function sendViaSendGrid(settings: EmailIntegrationSettings, payload: EmailSendPayload): Promise<EmailSendResult> {
  if (!settings.email_api_key) {
    return { success: false, error: 'SendGrid API key not configured' }
  }

  const sgMail = await import('@sendgrid/mail')
  sgMail.default.setApiKey(settings.email_api_key)

  const fromAddress = getFromAddress(settings, payload.fromEmail || '')
  if (!fromAddress) {
    return { success: false, error: 'From address not configured for SendGrid' }
  }

  try {
    const message = {
      from: payload.fromName ? { email: fromAddress, name: payload.fromName } : fromAddress,
      to: payload.to,
      cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
      bcc: payload.bcc && payload.bcc.length > 0 ? payload.bcc : undefined,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
      headers: payload.headers,
    }

    const response = await sgMail.default.send(message)
    const providerMessageId =
      response[0].headers['x-message-id'] || response[0].headers['x-sendgrid-message-id']
    return {
      success: true,
      externalId: providerMessageId,
      providerMessageId,
      status: response[0].statusCode === 202 ? 'queued' : 'sent',
      providerResponse: {
        headers: response[0].headers,
        statusCode: response[0].statusCode,
      },
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'SendGrid send failed' }
  }
}

async function sendViaGmail(settings: EmailIntegrationSettings, payload: EmailSendPayload): Promise<EmailSendResult> {
  if (!settings.email_oauth_refresh_token) {
    return { success: false, error: 'Gmail integration missing refresh token' }
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  if (settings.email_oauth_token && !isTokenExpired(settings.email_oauth_expires_at)) {
    oauth2Client.setCredentials({
      access_token: settings.email_oauth_token,
      refresh_token: settings.email_oauth_refresh_token,
      expiry_date: settings.email_oauth_expires_at ? new Date(settings.email_oauth_expires_at).getTime() : undefined,
    })
  } else {
    const refreshed = await refreshGoogleAccessToken(settings.email_oauth_refresh_token)
    oauth2Client.setCredentials({
      access_token: refreshed.accessToken,
      refresh_token: settings.email_oauth_refresh_token,
      expiry_date: refreshed.expiresAt ? new Date(refreshed.expiresAt).getTime() : undefined,
    })

    settings.email_oauth_token = refreshed.accessToken
    settings.email_oauth_expires_at = refreshed.expiresAt || null
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const fromAddress = getFromAddress(settings, payload.fromEmail || '')
  if (!fromAddress) {
    return { success: false, error: 'From address not configured for Gmail' }
  }

  try {
    const raw = buildMimeMessage(payload, fromAddress)
    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return {
      success: true,
      externalId: data.id || undefined,
      providerMessageId: data.id || undefined,
      status: data.labelIds?.includes('SENT') ? 'sent' : 'queued',
      providerResponse: data,
      updatedToken: settings.email_oauth_token
        ? {
            accessToken: settings.email_oauth_token,
            expiresAt: settings.email_oauth_expires_at || undefined,
          }
        : undefined,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Gmail send failed' }
  }
}

async function sendViaOutlook(settings: EmailIntegrationSettings, payload: EmailSendPayload): Promise<EmailSendResult> {
  if (!settings.email_oauth_refresh_token) {
    return { success: false, error: 'Outlook integration missing refresh token' }
  }

  let accessToken = settings.email_oauth_token || ''

  if (!accessToken || isTokenExpired(settings.email_oauth_expires_at)) {
    const refreshed = await refreshMicrosoftAccessToken(settings.email_oauth_refresh_token)
    accessToken = refreshed.accessToken
    settings.email_oauth_token = refreshed.accessToken
    settings.email_oauth_expires_at = refreshed.expiresAt || null
  }

  const fromAddress = getFromAddress(settings, payload.fromEmail || '')
  if (!fromAddress) {
    return { success: false, error: 'From address not configured for Outlook' }
  }

  const createRecipient = (address: string) => ({
    emailAddress: { address },
  })

  const internetMessageHeaders =
    payload.headers && Object.keys(payload.headers).length > 0
      ? Object.entries(payload.headers).map(([name, value]) => ({ name, value }))
      : undefined

  const message = {
    subject: payload.subject,
    body: {
      contentType: 'HTML',
      content: payload.html,
    },
    toRecipients: payload.to.map(createRecipient),
    ccRecipients: payload.cc && payload.cc.length > 0 ? payload.cc.map(createRecipient) : undefined,
    bccRecipients: payload.bcc && payload.bcc.length > 0 ? payload.bcc.map(createRecipient) : undefined,
    replyTo: payload.replyTo ? [createRecipient(payload.replyTo)] : undefined,
    from: {
      emailAddress: {
        address: fromAddress,
        name: payload.fromName || undefined,
      },
    },
    internetMessageHeaders,
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      saveToSentItems: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { success: false, error: `Outlook send failed: ${errorText || response.statusText}` }
  }

  const providerMessageId = response.headers.get('x-ms-request-id') || undefined
  return {
    success: true,
    externalId: providerMessageId,
    providerMessageId,
    status: 'queued',
    providerResponse: {
      requestId: response.headers.get('x-ms-request-id'),
      clientRequestId: response.headers.get('x-ms-ags-diagnostic'),
    },
    updatedToken: settings.email_oauth_token
      ? {
          accessToken: settings.email_oauth_token,
          expiresAt: settings.email_oauth_expires_at || undefined,
        }
      : undefined,
  }
}

async function sendViaSES(settings: EmailIntegrationSettings, payload: EmailSendPayload): Promise<EmailSendResult> {
  const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    return { success: false, error: 'AWS credentials not configured for SES' }
  }

  const fromAddress = getFromAddress(settings, payload.fromEmail || '')
  if (!fromAddress) {
    return { success: false, error: 'From address not configured for SES' }
  }

  const client = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const command = new SendEmailCommand({
    Source: payload.fromName ? `${payload.fromName} <${fromAddress}>` : fromAddress,
    Destination: {
      ToAddresses: payload.to,
      CcAddresses: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
      BccAddresses: payload.bcc && payload.bcc.length > 0 ? payload.bcc : undefined,
    },
    ReplyToAddresses: payload.replyTo ? [payload.replyTo] : undefined,
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: payload.subject,
      },
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: payload.html,
        },
      },
    },
  })

  try {
    const response = await client.send(command)
    return {
      success: true,
      externalId: response.MessageId,
      providerMessageId: response.MessageId,
      status: 'queued',
      providerResponse: response,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'SES send failed' }
  }
}

export async function sendEmailWithIntegration(
  settings: EmailIntegrationSettings,
  payload: EmailSendPayload
): Promise<EmailSendResult> {
  const provider = settings.email_provider?.toLowerCase()
  const normalizedPayload: EmailSendPayload = {
    ...payload,
    to: formatRecipients(payload.to),
    cc: formatRecipients(payload.cc),
    bcc: formatRecipients(payload.bcc),
  }

  if (normalizedPayload.to.length === 0) {
    return { success: false, error: 'Recipient list is empty' }
  }

  switch (provider) {
    case 'sendgrid':
      return sendViaSendGrid(settings, normalizedPayload)
    case 'gmail':
      return sendViaGmail(settings, normalizedPayload)
    case 'outlook':
    case 'microsoft':
    case 'office365':
      return sendViaOutlook(settings, normalizedPayload)
    case 'ses':
    case 'amazon_ses':
      return sendViaSES(settings, normalizedPayload)
    case 'resend':
      return sendViaResend(settings, normalizedPayload)
    default:
      return { success: false, error: `Unsupported email provider: ${settings.email_provider}` }
  }
}

// Resend HTTP API. The `resend` SDK is already a dependency (used by
// src/lib/services/email-service.ts for transactional system emails); this adapter
// makes the dispatcher's `email_provider='resend'` path work end-to-end.
// API key is stored in `integration_settings.email_api_key` per tenant,
// matching the SendGrid pattern.
async function sendViaResend(settings: EmailIntegrationSettings, payload: EmailSendPayload): Promise<EmailSendResult> {
  if (!settings.email_api_key) {
    return { success: false, error: 'Resend API key not configured' }
  }

  const fromAddress = getFromAddress(settings, payload.fromEmail || '')
  if (!fromAddress) {
    return { success: false, error: 'From address not configured for Resend' }
  }

  try {
    const { Resend } = await import('resend')
    const client = new Resend(settings.email_api_key)

    const { data, error } = await client.emails.send({
      from: payload.fromName ? `${payload.fromName} <${fromAddress}>` : fromAddress,
      to: payload.to,
      cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
      bcc: payload.bcc && payload.bcc.length > 0 ? payload.bcc : undefined,
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo,
      headers: payload.headers,
    })

    if (error) {
      return { success: false, error: error.message || 'Resend send failed' }
    }

    return {
      success: true,
      externalId: data?.id,
      providerMessageId: data?.id,
      status: 'queued',
      providerResponse: { id: data?.id },
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Resend send failed' }
  }
}





