/**
 * @jest-environment node
 *
 * Phase 2b.2.a — WhatsApp inbound orchestration tests.
 *
 * `ingestLead` is mocked at the module boundary so we can assert call
 * arguments precisely without touching the DB. Each helper has a
 * focused suite below.
 */

const mockIngestLead = jest.fn()
const mockProcessInboundMediaItems = jest.fn()

jest.mock('@/lib/lead-ingestion/ingest-lead', () => ({
  __esModule: true,
  ingestLead: (...args: unknown[]) => mockIngestLead(...args),
}))

jest.mock('@/lib/inbound-media/media-store', () => ({
  __esModule: true,
  processInboundMediaItems: (...args: unknown[]) => mockProcessInboundMediaItems(...args),
}))

import {
  parseTwilioInboundMessage,
  resolveTenantByWhatsappNumber,
  isMessageAlreadyProcessed,
  processWhatsappInboundMessage,
} from '../inbound'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const MESSAGE_SID = 'SM21e529441bf3ed5b583a6be82303b50c'

// -----------------------------------------------------------------------------
// parseTwilioInboundMessage
// -----------------------------------------------------------------------------

describe('parseTwilioInboundMessage', () => {
  it('extracts the canonical fields and strips the whatsapp: prefix from From/To', () => {
    const result = parseTwilioInboundMessage({
      MessageSid: MESSAGE_SID,
      From: 'whatsapp:+919916558958',
      To: 'whatsapp:+14155238886',
      Body: 'Hello from new lead test',
      ProfileName: 'Deepak',
      WaId: '919916558958',
      NumMedia: '0',
    })

    expect(result.messageSid).toBe(MESSAGE_SID)
    expect(result.from).toBe('+919916558958')
    expect(result.to).toBe('+14155238886')
    expect(result.body).toBe('Hello from new lead test')
    expect(result.profileName).toBe('Deepak')
    expect(result.waId).toBe('919916558958')
    expect(result.numMedia).toBe(0)
    expect(result.mediaUrls).toEqual([])
  })

  it('round-trips the entire form body into rawPayload verbatim', () => {
    const form = {
      MessageSid: MESSAGE_SID,
      From: 'whatsapp:+1',
      To: 'whatsapp:+2',
      Body: 'x',
      AccountSid: 'ACxxx',
      NumMedia: '0',
      Custom: 'custom-value',
    }
    const result = parseTwilioInboundMessage(form)
    expect(result.rawPayload).toEqual(form)
    // Independent copy — mutating the source must not mutate rawPayload.
    form.Custom = 'mutated'
    expect(result.rawPayload.Custom).toBe('custom-value')
  })

  it('parses NumMedia as integer and collects MediaUrl{N} / MediaContentType{N} pairs', () => {
    const result = parseTwilioInboundMessage({
      MessageSid: MESSAGE_SID,
      From: 'whatsapp:+1',
      To: 'whatsapp:+2',
      Body: '',
      NumMedia: '2',
      MediaUrl0: 'https://api.twilio.com/.../Media/MEa',
      MediaContentType0: 'image/jpeg',
      MediaUrl1: 'https://api.twilio.com/.../Media/MEb',
      MediaContentType1: 'application/pdf',
    })
    expect(result.numMedia).toBe(2)
    expect(result.mediaUrls).toEqual([
      { url: 'https://api.twilio.com/.../Media/MEa', contentType: 'image/jpeg' },
      { url: 'https://api.twilio.com/.../Media/MEb', contentType: 'application/pdf' },
    ])
  })

  it('caps NumMedia iteration at 10 and ignores out-of-range MediaUrl keys', () => {
    const form: Record<string, string> = {
      MessageSid: MESSAGE_SID,
      From: 'whatsapp:+1',
      To: 'whatsapp:+2',
      Body: '',
      NumMedia: '999', // malicious / corrupt
    }
    for (let i = 0; i < 12; i++) {
      form[`MediaUrl${i}`] = `https://x/${i}`
      form[`MediaContentType${i}`] = 'image/jpeg'
    }
    const result = parseTwilioInboundMessage(form)
    expect(result.mediaUrls).toHaveLength(10)
  })

  it('returns body = "" and numMedia = 0 when those fields are missing', () => {
    const result = parseTwilioInboundMessage({
      MessageSid: MESSAGE_SID,
      From: 'whatsapp:+1',
      To: 'whatsapp:+2',
    })
    expect(result.body).toBe('')
    expect(result.numMedia).toBe(0)
    expect(result.profileName).toBeNull()
    expect(result.waId).toBeNull()
  })

  it('leaves From/To unchanged when the whatsapp: prefix is absent', () => {
    const result = parseTwilioInboundMessage({
      MessageSid: MESSAGE_SID,
      From: '+919916558958',
      To: '+14155238886',
    })
    expect(result.from).toBe('+919916558958')
    expect(result.to).toBe('+14155238886')
  })
})

// -----------------------------------------------------------------------------
// resolveTenantByWhatsappNumber
// -----------------------------------------------------------------------------

function buildTenantsClient(
  result: { data: Array<{ id: string; created_at: string }> | null; error: { message: string } | null }
) {
  const limit = jest.fn(() => Promise.resolve(result))
  const order = jest.fn(() => ({ limit }))
  const eq = jest.fn(() => ({ order }))
  const select = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ select }))
  return { from, _limit: limit, _eq: eq, _order: order, _select: select } as const
}

describe('resolveTenantByWhatsappNumber', () => {
  it('returns the matching tenantId on a single match', async () => {
    const client = buildTenantsClient({
      data: [{ id: TENANT_ID, created_at: '2026-01-01T00:00:00Z' }],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantByWhatsappNumber(client as any, '+14155238886')
    expect(result).toEqual({ tenantId: TENANT_ID })
    expect(client.from).toHaveBeenCalledWith('tenants')
    expect(client._eq).toHaveBeenCalledWith('whatsapp_phone_number', '+14155238886')
  })

  it('returns null when no tenant matches', async () => {
    const client = buildTenantsClient({ data: [], error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantByWhatsappNumber(client as any, '+18005550199')
    expect(result).toBeNull()
  })

  it('returns the OLDEST tenant when multiple share the same number, and warns', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const client = buildTenantsClient({
      data: [
        { id: 'older-tenant', created_at: '2026-01-01T00:00:00Z' },
        { id: 'newer-tenant', created_at: '2026-04-01T00:00:00Z' },
      ],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantByWhatsappNumber(client as any, '+14155238886')
    expect(result).toEqual({ tenantId: 'older-tenant' })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('returns null on supabase error (caller treats as 401, not 500)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = buildTenantsClient({
      data: null,
      error: { message: 'connection refused' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantByWhatsappNumber(client as any, '+14155238886')
    expect(result).toBeNull()
    errorSpy.mockRestore()
  })

  it('returns null on empty toNumber without hitting the DB', async () => {
    const client = buildTenantsClient({ data: [], error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantByWhatsappNumber(client as any, '')
    expect(result).toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })
})

// -----------------------------------------------------------------------------
// isMessageAlreadyProcessed
// -----------------------------------------------------------------------------

function buildTouchpointsClient(
  result: { data: { id: string } | null; error: { message: string } | null }
) {
  const maybeSingle = jest.fn(() => Promise.resolve(result))
  const limit = jest.fn(() => ({ maybeSingle }))
  const eq3 = jest.fn(() => ({ limit }))
  const eq2 = jest.fn(() => ({ eq: eq3 }))
  const eq1 = jest.fn(() => ({ eq: eq2 }))
  const select = jest.fn(() => ({ eq: eq1 }))
  const from = jest.fn(() => ({ select }))
  return { from, _eq1: eq1, _eq2: eq2, _eq3: eq3 } as const
}

describe('isMessageAlreadyProcessed', () => {
  it('returns true when a touchpoint row exists for the tenant + sid', async () => {
    const client = buildTouchpointsClient({
      data: { id: 'tp-123' },
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isMessageAlreadyProcessed(client as any, TENANT_ID, MESSAGE_SID)
    expect(result).toBe(true)
    expect(client.from).toHaveBeenCalledWith('attribution_touchpoints')
    expect(client._eq1).toHaveBeenCalledWith('tenant_id', TENANT_ID)
    expect(client._eq2).toHaveBeenCalledWith('source_channel', 'whatsapp_inbound')
    expect(client._eq3).toHaveBeenCalledWith('external_message_id', MESSAGE_SID)
  })

  it('returns false when no touchpoint row matches', async () => {
    const client = buildTouchpointsClient({ data: null, error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isMessageAlreadyProcessed(client as any, TENANT_ID, MESSAGE_SID)
    expect(result).toBe(false)
  })

  it('returns false when messageSid is empty (cannot dedup against an empty key)', async () => {
    const client = buildTouchpointsClient({ data: null, error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isMessageAlreadyProcessed(client as any, TENANT_ID, '')
    expect(result).toBe(false)
    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns false (not throws) on supabase error — the DB unique index is the safety net', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const client = buildTouchpointsClient({
      data: null,
      error: { message: 'transient failure' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isMessageAlreadyProcessed(client as any, TENANT_ID, MESSAGE_SID)
    expect(result).toBe(false)
    warnSpy.mockRestore()
  })
})

// -----------------------------------------------------------------------------
// processWhatsappInboundMessage
// -----------------------------------------------------------------------------

const SAMPLE_MESSAGE = {
  messageSid: MESSAGE_SID,
  from: '+919916558958',
  to: '+14155238886',
  body: 'Hello from new lead test',
  profileName: 'Deepak',
  waId: '919916558958',
  numMedia: 0,
  mediaUrls: [],
  rawPayload: {
    MessageSid: MESSAGE_SID,
    From: 'whatsapp:+919916558958',
    To: 'whatsapp:+14155238886',
    Body: 'Hello from new lead test',
    NumMedia: '0',
    ProfileName: 'Deepak',
    WaId: '919916558958',
  },
}

describe('processWhatsappInboundMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls ingestLead with the canonical input shape and returns wasNewContact=true on the new path', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    const result = await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )

    expect(result).toEqual({
      contactId: 'contact-1',
      dealId: 'deal-1',
      attributionTouchpointId: 'tp-1',
      activityId: 'act-1',
      wasNewContact: true,
      mediaResults: [],
    })

    expect(mockIngestLead).toHaveBeenCalledTimes(1)
    const [input] = mockIngestLead.mock.calls[0]
    expect(input.tenant_id).toBe(TENANT_ID)
    expect(input.source_channel).toBe('whatsapp_inbound')
    expect(input.contact).toEqual({
      phone: '+919916558958',
      full_name: 'Deepak',
      email: null,
    })
    expect(input.treatment_intent_text).toBe('Hello from new lead test')
    expect(input.event_id).toBe(`whatsapp_inbound:${MESSAGE_SID}`)
    expect(input.external_message_id).toBe(MESSAGE_SID)
    // Raw payload preserves the full Twilio body verbatim, plus structured extras.
    expect(input.raw_payload.MessageSid).toBe(MESSAGE_SID)
    expect(input.raw_payload._profile_name).toBe('Deepak')
    expect(input.raw_payload._wa_id).toBe('919916558958')
  })

  it('returns wasNewContact=false on the existing-contact (matched) path', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-2',
      activity_id: 'act-2',
      deal_id: null,
      dedup_decision: 'matched',
      dedup_signals: { email_match: false, phone_match: true, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    const result = await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )

    expect(result.wasNewContact).toBe(false)
    expect(result.dealId).toBeNull()
  })

  it('returns wasNewContact=false on idempotent_replay (engine-side short-circuit)', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'matched',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      idempotent_replay: true,
      routing_log_id: null,
    })

    const result = await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )
    expect(result.wasNewContact).toBe(false)
  })

  it('throws when ingestLead returns null IDs (review_required) — surfacing 5xx for Twilio retry', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: null,
      attribution_touchpoint_id: null,
      activity_id: null,
      deal_id: null,
      dedup_decision: 'review_required',
      dedup_signals: {
        email_match: false,
        phone_match: true,
        channel_identifier_match: false,
        conflict_reason: 'phone_matches_different_email',
      },
      sla: null,
      routing_log_id: null,
    })

    await expect(
      processWhatsappInboundMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        TENANT_ID,
        SAMPLE_MESSAGE
      )
    ).rejects.toThrow(/review_required/)
  })

  it('passes external_message_id through so the partial unique index protects against races', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      { ...SAMPLE_MESSAGE, messageSid: 'SMabc' }
    )
    const [input] = mockIngestLead.mock.calls[0]
    expect(input.external_message_id).toBe('SMabc')
    expect(input.event_id).toBe('whatsapp_inbound:SMabc')
  })

  // ---------------------------------------------------------------------------
  // Phase 2b.2.a.2 — media capture wiring
  // ---------------------------------------------------------------------------

  it('does NOT call processInboundMediaItems when mediaUrls is empty', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    const result = await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )

    expect(mockProcessInboundMediaItems).not.toHaveBeenCalled()
    expect(result.mediaResults).toEqual([])
  })

  it('forwards 2 media URLs to processInboundMediaItems and propagates the result', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })
    mockProcessInboundMediaItems.mockResolvedValueOnce([
      { status: 'persisted', mediaIndex: 0, messageMediaId: 'mm-0' },
      { status: 'persisted', mediaIndex: 1, messageMediaId: 'mm-1' },
    ])

    const supabase = { sentinel: 'admin' }
    const result = await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      TENANT_ID,
      {
        ...SAMPLE_MESSAGE,
        numMedia: 2,
        mediaUrls: [
          { url: 'https://api.twilio.com/.../Media/MEa', contentType: 'image/jpeg' },
          { url: 'https://api.twilio.com/.../Media/MEb', contentType: 'application/pdf' },
        ],
      }
    )

    expect(mockProcessInboundMediaItems).toHaveBeenCalledTimes(1)
    const [client, args] = mockProcessInboundMediaItems.mock.calls[0]
    expect(client).toBe(supabase)
    expect(args).toEqual({
      tenantId: TENANT_ID,
      activityId: 'act-1',
      contactId: 'contact-1',
      attributionTouchpointId: 'tp-1',
      externalMessageId: MESSAGE_SID,
      mediaUrls: [
        { url: 'https://api.twilio.com/.../Media/MEa', contentType: 'image/jpeg' },
        { url: 'https://api.twilio.com/.../Media/MEb', contentType: 'application/pdf' },
      ],
    })
    expect(result.mediaResults).toEqual([
      { status: 'persisted', mediaIndex: 0, messageMediaId: 'mm-0' },
      { status: 'persisted', mediaIndex: 1, messageMediaId: 'mm-1' },
    ])
  })

  it('still returns success with mixed media results when some items fail', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })
    mockProcessInboundMediaItems.mockResolvedValueOnce([
      { status: 'persisted', mediaIndex: 0, messageMediaId: 'mm-0' },
      { status: 'failed', mediaIndex: 1, reason: 'download:network' },
      { status: 'already_persisted', mediaIndex: 2, messageMediaId: 'mm-2' },
    ])

    const result = await processWhatsappInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      {
        ...SAMPLE_MESSAGE,
        numMedia: 3,
        mediaUrls: [
          { url: 'https://x/0', contentType: 'image/jpeg' },
          { url: 'https://x/1', contentType: 'image/jpeg' },
          { url: 'https://x/2', contentType: 'image/jpeg' },
        ],
      }
    )

    // Activity creation still succeeded — media outcome is reported, not thrown.
    expect(result.activityId).toBe('act-1')
    expect(result.mediaResults).toHaveLength(3)
    expect(result.mediaResults[1]).toEqual({
      status: 'failed',
      mediaIndex: 1,
      reason: 'download:network',
    })
  })
})
