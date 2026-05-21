/**
 * @jest-environment node
 */

const mockSanitize = jest.fn((html: string) =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
)

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (html: string) => mockSanitize(html),
  },
}))

import {
  sanitiseOutboundHtml,
  dispatchEmail,
  dispatchSms,
  dispatchWhatsApp,
  dispatchVoiceCall,
} from '@/lib/communications/dispatcher'
import { computeConversationId } from '@/lib/communications/conversation-id'

const mockFrom = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockIntegrationLogsInsert = jest.fn()
const mockSettingsUpdate = jest.fn()

const mockSupabase = {
  from: mockFrom,
}

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => mockSupabase,
}))

const mockLoadSettings = jest.fn()
jest.mock('@/lib/integrations/tenant-integration-config', () => ({
  loadTenantIntegrationSettings: (...args: unknown[]) => mockLoadSettings(...args),
}))

const mockSendEmail = jest.fn()
jest.mock('@/lib/integrations/email-provider', () => ({
  sendEmailWithIntegration: (...args: unknown[]) => mockSendEmail(...args),
}))

const mockSmsInit = jest.fn()
const mockSmsSend = jest.fn()
jest.mock('@/lib/sms-service', () => ({
  smsService: {
    initialize: (...args: unknown[]) => mockSmsInit(...args),
    send: (...args: unknown[]) => mockSmsSend(...args),
  },
}))

const mockWhatsAppInit = jest.fn()
const mockWhatsAppSend = jest.fn()
jest.mock('@/lib/whatsapp-service', () => ({
  whatsappService: {
    initialize: (...args: unknown[]) => mockWhatsAppInit(...args),
    send: (...args: unknown[]) => mockWhatsAppSend(...args),
  },
}))

const mockVoiceInit = jest.fn()
const mockVoiceInitiateCall = jest.fn()
jest.mock('@/lib/voice-service', () => ({
  voiceService: {
    initialize: (...args: unknown[]) => mockVoiceInit(...args),
    initiateCall: (...args: unknown[]) => mockVoiceInitiateCall(...args),
  },
}))

jest.mock('@/lib/monitoring/metrics', () => ({
  recordProviderFailure: jest.fn(),
}))

jest.mock('@/lib/conversions/first-response-detector', () => ({
  detectAndFireFirstResponse: jest.fn(),
}))

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const CONTACT = 'c-1'
const ACTIVITY_ID = 'act-2b9-test'

function chainMock(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(result)
  chain.eq = jest.fn().mockResolvedValue({ error: null })
  chain.insert = jest.fn().mockReturnValue(chain)
  chain.update = jest.fn().mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'activities') {
      return {
        insert: mockInsert.mockReturnValue(
          chainMock({ data: { id: ACTIVITY_ID }, error: null })
        ),
        update: mockUpdate.mockReturnValue(chainMock({ data: null, error: null })),
      }
    }
    if (table === 'integration_logs') {
      return { insert: mockIntegrationLogsInsert.mockResolvedValue({ error: null }) }
    }
    if (table === 'integration_settings') {
      return { update: mockSettingsUpdate.mockReturnValue(chainMock({ data: null, error: null })) }
    }
    return { insert: jest.fn(), update: jest.fn() }
  })
})

describe('sanitiseOutboundHtml', () => {
  it('preserves safe html', () => {
    expect(sanitiseOutboundHtml('<p>hello</p>')).toBe('<p>hello</p>')
  })

  it('strips script tags', () => {
    const out = sanitiseOutboundHtml('<script>alert(1)</script><p>hi</p>')
    expect(out).toContain('<p>hi</p>')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('alert(1)')
  })

  it('strips javascript: href', () => {
    const out = sanitiseOutboundHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('javascript:')
  })

  it('falls back when DOMPurify throws (e.g. Vercel serverless)', () => {
    mockSanitize.mockImplementationOnce(() => {
      throw new Error('jsdom unavailable')
    })
    const out = sanitiseOutboundHtml('<script>x</script><p>ok</p>')
    expect(out).toBe('<p>ok</p>')
    mockSanitize.mockImplementation((html: string) =>
      html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
    )
  })
})

describe('dispatchEmail failed-send', () => {
  const baseContext = { tenantId: TENANT, userId: 'u-1', contactId: 'c-1', dealId: 'd-1' }

  it('marks activity failed when provider rejects', async () => {
    mockLoadSettings.mockResolvedValue({
      is_email_configured: true,
      email_provider: 'sendgrid',
      email_api_key: 'key',
      email_from_address: 'from@example.com',
      email_from_name: 'Test',
    })
    mockSendEmail.mockResolvedValue({ success: false, error: 'HTTP 401 unauthorized' })

    await expect(
      dispatchEmail({
        context: baseContext,
        to: ['to@example.com'],
        subject: 'Hi',
        html: '<p>body</p>',
      })
    ).rejects.toThrow('Send failed — invalid email API key')

    expect(mockUpdate).toHaveBeenCalled()
    const updateChain = mockUpdate.mock.results[0].value
    expect(updateChain.eq).toHaveBeenCalledWith('id', ACTIVITY_ID)
  })

  it('marks activity failed when email not configured', async () => {
    mockLoadSettings.mockResolvedValue({
      is_email_configured: false,
      email_provider: null,
    })

    await expect(
      dispatchEmail({
        context: baseContext,
        to: ['to@example.com'],
        subject: 'Hi',
        html: '<p>body</p>',
      })
    ).rejects.toThrow(/not configured/i)

    expect(mockUpdate).toHaveBeenCalled()
  })
})

describe('dispatchSms failed-send', () => {
  const baseContext = { tenantId: TENANT, userId: 'u-1', contactId: 'c-1', dealId: 'd-1' }

  it('marks activity failed when Twilio rejects', async () => {
    mockLoadSettings.mockResolvedValue({
      is_sms_configured: true,
      sms_account_sid: 'ACtest',
      sms_auth_token: 'token',
      sms_from_number: '+15551234567',
    })
    mockSmsInit.mockResolvedValue(undefined)
    const twilioErr = Object.assign(new Error('Authenticate'), { code: 20003, status: 401 })
    mockSmsSend.mockRejectedValue(twilioErr)

    await expect(
      dispatchSms({ context: baseContext, to: '+15559876543', message: 'test' })
    ).rejects.toThrow('Send failed — invalid SMS credentials')

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('marks activity failed when SMS not configured', async () => {
    mockLoadSettings.mockResolvedValue({ is_sms_configured: false })

    await expect(
      dispatchSms({ context: baseContext, to: '+15559876543', message: 'test' })
    ).rejects.toThrow(/not configured/i)

    expect(mockUpdate).toHaveBeenCalled()
  })
})

describe('dispatchWhatsApp failed-send', () => {
  const baseContext = { tenantId: TENANT, userId: 'u-1', contactId: 'c-1', dealId: 'd-1' }

  it('marks activity failed when Twilio rejects', async () => {
    mockLoadSettings.mockResolvedValue({
      is_whatsapp_configured: true,
      whatsapp_account_sid: 'ACtest',
      whatsapp_auth_token: 'token',
      whatsapp_from_number: '+15551234567',
    })
    mockWhatsAppInit.mockResolvedValue(undefined)
    mockWhatsAppSend.mockRejectedValue(Object.assign(new Error('Channel error'), { code: 63003 }))

    await expect(
      dispatchWhatsApp({ context: baseContext, to: '+15559876543', message: 'test' })
    ).rejects.toThrow('Send failed — WhatsApp number not approved for this sender')

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('marks activity failed when WhatsApp not configured', async () => {
    mockLoadSettings.mockResolvedValue({ is_whatsapp_configured: false })

    await expect(
      dispatchWhatsApp({ context: baseContext, to: '+15559876543', message: 'test' })
    ).rejects.toThrow(/not configured/i)

    expect(mockUpdate).toHaveBeenCalled()
  })
})

describe('dispatch* conversation_id stamping', () => {
  const baseContext = { tenantId: TENANT, userId: 'u-1', contactId: CONTACT, dealId: 'd-1' }

  beforeEach(() => {
    mockLoadSettings.mockResolvedValue({
      is_email_configured: true,
      email_provider: 'resend',
      email_api_key: 'key',
      email_from_address: 'from@example.com',
      email_from_name: 'Test',
      is_sms_configured: true,
      sms_account_sid: 'ACtest',
      sms_auth_token: 'token',
      sms_from_number: '+15551234567',
      is_whatsapp_configured: true,
      whatsapp_account_sid: 'ACtest',
      whatsapp_auth_token: 'token',
      whatsapp_from_number: '+15551234567',
    })
    mockSendEmail.mockResolvedValue({
      success: true,
      externalId: 'resend-id',
      providerMessageId: 'resend-id',
      status: 'sent',
    })
    mockSmsInit.mockResolvedValue(undefined)
    mockSmsSend.mockResolvedValue({
      success: true,
      messageId: 'SM123',
      status: 'queued',
    })
    mockWhatsAppInit.mockResolvedValue(undefined)
    mockWhatsAppSend.mockResolvedValue({
      success: true,
      messageId: 'SM456',
      status: 'queued',
    })
  })

  it('dispatchEmail stamps conversation_id on insert', async () => {
    await dispatchEmail({
      context: baseContext,
      to: ['to@example.com'],
      subject: 'Hi',
      html: '<p>body</p>',
    })
    expect(mockInsert).toHaveBeenCalled()
    const insertPayload = mockInsert.mock.calls[0][0]
    expect(insertPayload.conversation_id).toBe(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: 'email' })
    )
  })

  it('dispatchSms stamps conversation_id on insert', async () => {
    await dispatchSms({ context: baseContext, to: '+15559876543', message: 'test' })
    const insertPayload = mockInsert.mock.calls[0][0]
    expect(insertPayload.conversation_id).toBe(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: 'sms' })
    )
  })

  it('dispatchWhatsApp stamps conversation_id on insert', async () => {
    await dispatchWhatsApp({ context: baseContext, to: '+15559876543', message: 'test' })
    const insertPayload = mockInsert.mock.calls[0][0]
    expect(insertPayload.conversation_id).toBe(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: 'whatsapp' })
    )
  })

  it('dispatchVoiceCall does not stamp conversation_id', async () => {
    process.env.APP_URL = 'https://dental-crm-nine.vercel.app'
    mockLoadSettings.mockResolvedValue({
      is_voice_configured: true,
      voice_account_sid: 'ACtest',
      voice_auth_token: 'token',
      voice_from_number: '+15551234567',
    })
    mockVoiceInit.mockResolvedValue(undefined)
    mockVoiceInitiateCall.mockResolvedValue({
      success: true,
      callSid: 'CA123',
      status: 'queued',
    })

    await dispatchVoiceCall({ context: baseContext, to: '+15559876543' })

    expect(mockInsert).toHaveBeenCalled()
    const insertPayload = mockInsert.mock.calls[0][0]
    expect(insertPayload.conversation_id).toBeUndefined()
  })
})

describe('dispatch* Message-ID metadata', () => {
  const baseContext = { tenantId: TENANT, userId: 'u-1', contactId: CONTACT, dealId: 'd-1' }

  beforeEach(() => {
    mockLoadSettings.mockResolvedValue({
      is_email_configured: true,
      email_provider: 'resend',
      email_api_key: 'key',
      email_from_address: 'from@example.com',
      email_from_name: 'Test',
      is_sms_configured: true,
      sms_account_sid: 'ACtest',
      sms_auth_token: 'token',
      sms_from_number: '+15551234567',
    })
  })

  it('dispatchEmail passes Message-ID header matching metadata.message_id', async () => {
    mockSendEmail.mockResolvedValue({
      success: true,
      externalId: 'resend-id',
      providerMessageId: 'resend-id',
      status: 'sent',
    })

    await dispatchEmail({
      context: baseContext,
      to: ['to@example.com'],
      subject: 'Hi',
      html: '<p>body</p>',
    })

    const insertPayload = mockInsert.mock.calls[0][0]
    const messageId = insertPayload.metadata.message_id as string
    expect(messageId).toMatch(/^<.+@dental-crm-nine\.vercel\.app>$/)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: { 'Message-ID': messageId },
      })
    )
  })

  it('dispatchEmail stores provider_message_id on successful send', async () => {
    mockSendEmail.mockResolvedValue({
      success: true,
      externalId: 'resend-id',
      providerMessageId: 'resend-id',
      status: 'sent',
    })

    await dispatchEmail({
      context: baseContext,
      to: ['to@example.com'],
      subject: 'Hi',
      html: '<p>body</p>',
    })

    expect(mockUpdate).toHaveBeenCalled()
    const updatePayload = mockUpdate.mock.calls[0][0]
    expect(updatePayload.metadata.provider_message_id).toBe('resend-id')
  })

  it('dispatchSms stores Twilio SID as metadata.message_id', async () => {
    mockSmsInit.mockResolvedValue(undefined)
    mockSmsSend.mockResolvedValue({
      success: true,
      messageId: 'SMtwilio99',
      status: 'queued',
    })

    await dispatchSms({ context: baseContext, to: '+15559876543', message: 'test' })

    const updatePayload = mockUpdate.mock.calls[0][0]
    expect(updatePayload.metadata.message_id).toBe('SMtwilio99')
    expect(updatePayload.metadata.provider_name).toBe('twilio')
  })
})
