/**
 * @jest-environment node
 *
 * Phase 2b.4 — SMS inbound orchestration tests.
 *
 * Mirrors `src/lib/whatsapp/__tests__/inbound.test.ts`, with SMS-specific
 * differences: no `whatsapp:` prefix-stripping, no ProfileName / WaId, no
 * media download (mediaUrls captured but not acted on).
 *
 * `ingestLead` is mocked at the module boundary so we can assert call
 * arguments precisely without touching the DB.
 */

const mockIngestLead = jest.fn()

jest.mock('@/lib/lead-ingestion/ingest-lead', () => ({
  __esModule: true,
  ingestLead: (...args: unknown[]) => mockIngestLead(...args),
}))

import {
  parseTwilioInboundSmsMessage,
  resolveTenantBySmsNumber,
  isSmsAlreadyProcessed,
  processSmsInboundMessage,
} from '../inbound'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const TENANT_NAME = "Deepak's Dental Practice"
const MESSAGE_SID = 'SMabc123def456'
const FROM_PHONE = '+447700900000'
const TO_PHONE = '+447782218044'

// -----------------------------------------------------------------------------
// parseTwilioInboundSmsMessage
// -----------------------------------------------------------------------------

describe('parseTwilioInboundSmsMessage', () => {
  it('extracts canonical fields from a plain SMS without touching the phone numbers', () => {
    const result = parseTwilioInboundSmsMessage({
      MessageSid: MESSAGE_SID,
      From: FROM_PHONE,
      To: TO_PHONE,
      Body: 'Hello, interested in Invisalign',
      NumMedia: '0',
    })

    expect(result.messageSid).toBe(MESSAGE_SID)
    expect(result.fromPhoneE164).toBe(FROM_PHONE)
    expect(result.toPhoneE164).toBe(TO_PHONE)
    expect(result.body).toBe('Hello, interested in Invisalign')
    expect(result.numMedia).toBe(0)
    expect(result.mediaUrls).toEqual([])
  })

  it('does NOT strip a `whatsapp:` prefix — preserves it verbatim so misrouted payloads are visible', () => {
    // If Twilio ever routes a WhatsApp message to the SMS webhook by accident
    // (e.g. operator misconfigures both numbers in the Console), we want the
    // misrouting to surface as a downstream tenant-resolve failure, not be
    // silently normalised away. The parser is dumb on purpose.
    const result = parseTwilioInboundSmsMessage({
      MessageSid: MESSAGE_SID,
      From: 'whatsapp:+447700900000',
      To: 'whatsapp:+14155238886',
      Body: 'misrouted',
    })
    expect(result.fromPhoneE164).toBe('whatsapp:+447700900000')
    expect(result.toPhoneE164).toBe('whatsapp:+14155238886')
  })

  it('round-trips the entire form body into rawPayload as an independent copy', () => {
    const form: Record<string, string> = {
      MessageSid: MESSAGE_SID,
      From: FROM_PHONE,
      To: TO_PHONE,
      Body: 'x',
      AccountSid: 'ACxxx',
      NumMedia: '0',
      Custom: 'custom-value',
    }
    const result = parseTwilioInboundSmsMessage(form)
    expect(result.rawPayload).toEqual(form)
    // Mutating the source must not mutate rawPayload (independent copy).
    form.Custom = 'mutated'
    expect(result.rawPayload.Custom).toBe('custom-value')
  })

  it('parses NumMedia as integer and collects MediaUrl{N} URLs', () => {
    const result = parseTwilioInboundSmsMessage({
      MessageSid: MESSAGE_SID,
      From: FROM_PHONE,
      To: TO_PHONE,
      Body: '',
      NumMedia: '2',
      MediaUrl0: 'https://api.twilio.com/.../Media/MEa',
      MediaContentType0: 'image/jpeg',
      MediaUrl1: 'https://api.twilio.com/.../Media/MEb',
      MediaContentType1: 'application/pdf',
    })
    expect(result.numMedia).toBe(2)
    expect(result.mediaUrls).toEqual([
      'https://api.twilio.com/.../Media/MEa',
      'https://api.twilio.com/.../Media/MEb',
    ])
  })

  it('caps NumMedia iteration at 10 even when a corrupt payload claims more', () => {
    const form: Record<string, string> = {
      MessageSid: MESSAGE_SID,
      From: FROM_PHONE,
      To: TO_PHONE,
      Body: '',
      NumMedia: '15', // above the 10-cap
    }
    for (let i = 0; i < 15; i++) {
      form[`MediaUrl${i}`] = `https://x/${i}`
    }
    const result = parseTwilioInboundSmsMessage(form)
    expect(result.mediaUrls).toHaveLength(10)
  })

  it('defaults missing fields: body="" / numMedia=0 / messageSid=""', () => {
    const result = parseTwilioInboundSmsMessage({
      From: FROM_PHONE,
      To: TO_PHONE,
    })
    expect(result.body).toBe('')
    expect(result.numMedia).toBe(0)
    expect(result.messageSid).toBe('')
    expect(result.mediaUrls).toEqual([])
  })

  it('coerces non-numeric NumMedia to 0 (defensive against malformed payloads)', () => {
    const result = parseTwilioInboundSmsMessage({
      MessageSid: MESSAGE_SID,
      From: FROM_PHONE,
      To: TO_PHONE,
      Body: 'x',
      NumMedia: 'not-a-number',
    })
    expect(result.numMedia).toBe(0)
  })
})

// -----------------------------------------------------------------------------
// resolveTenantBySmsNumber
// -----------------------------------------------------------------------------

function buildTenantsClient(
  result: {
    data:
      | Array<{ id: string; name?: string; created_at: string }>
      | null
    error: { message: string } | null
  }
) {
  const limit = jest.fn(() => Promise.resolve(result))
  const order = jest.fn(() => ({ limit }))
  const eq = jest.fn(() => ({ order }))
  const select = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ select }))
  return { from, _limit: limit, _eq: eq, _order: order, _select: select } as const
}

describe('resolveTenantBySmsNumber', () => {
  it('returns { tenantId, tenantName } on a single match and queries by sms_phone_number', async () => {
    const client = buildTenantsClient({
      data: [{ id: TENANT_ID, name: TENANT_NAME, created_at: '2026-01-01T00:00:00Z' }],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantBySmsNumber(client as any, TO_PHONE)
    expect(result).toEqual({ tenantId: TENANT_ID, tenantName: TENANT_NAME })
    expect(client.from).toHaveBeenCalledWith('tenants')
    expect(client._eq).toHaveBeenCalledWith('sms_phone_number', TO_PHONE)
  })

  it('returns null when no tenant matches', async () => {
    const client = buildTenantsClient({ data: [], error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantBySmsNumber(client as any, '+18005550199')
    expect(result).toBeNull()
  })

  it('returns the OLDEST tenant when multiple share the same number, and warns', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const client = buildTenantsClient({
      data: [
        { id: 'older-tenant', name: 'Older', created_at: '2026-01-01T00:00:00Z' },
        { id: 'newer-tenant', name: 'Newer', created_at: '2026-04-01T00:00:00Z' },
      ],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantBySmsNumber(client as any, TO_PHONE)
    expect(result).toEqual({ tenantId: 'older-tenant', tenantName: 'Older' })
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
    const result = await resolveTenantBySmsNumber(client as any, TO_PHONE)
    expect(result).toBeNull()
    errorSpy.mockRestore()
  })

  it('returns null on empty input string without hitting the DB', async () => {
    const client = buildTenantsClient({ data: [], error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveTenantBySmsNumber(client as any, '')
    expect(result).toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })
})

// -----------------------------------------------------------------------------
// isSmsAlreadyProcessed
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

describe('isSmsAlreadyProcessed', () => {
  it('returns true when a touchpoint row exists for the tenant + sid on sms_inbound', async () => {
    const client = buildTouchpointsClient({
      data: { id: 'tp-123' },
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isSmsAlreadyProcessed(client as any, TENANT_ID, MESSAGE_SID)
    expect(result).toBe(true)
    expect(client.from).toHaveBeenCalledWith('attribution_touchpoints')
    expect(client._eq1).toHaveBeenCalledWith('tenant_id', TENANT_ID)
    expect(client._eq2).toHaveBeenCalledWith('source_channel', 'sms_inbound')
    expect(client._eq3).toHaveBeenCalledWith('external_message_id', MESSAGE_SID)
  })

  it('returns false when no touchpoint row matches', async () => {
    const client = buildTouchpointsClient({ data: null, error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isSmsAlreadyProcessed(client as any, TENANT_ID, MESSAGE_SID)
    expect(result).toBe(false)
  })

  it('returns false when messageSid is empty (cannot dedup against an empty key)', async () => {
    const client = buildTouchpointsClient({ data: null, error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isSmsAlreadyProcessed(client as any, TENANT_ID, '')
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
    const result = await isSmsAlreadyProcessed(client as any, TENANT_ID, MESSAGE_SID)
    expect(result).toBe(false)
    warnSpy.mockRestore()
  })
})

// -----------------------------------------------------------------------------
// processSmsInboundMessage
// -----------------------------------------------------------------------------

const SAMPLE_MESSAGE = {
  messageSid: MESSAGE_SID,
  fromPhoneE164: FROM_PHONE,
  toPhoneE164: TO_PHONE,
  body: 'Hi, interested in Invisalign for my teen',
  numMedia: 0,
  mediaUrls: [],
  rawPayload: {
    MessageSid: MESSAGE_SID,
    From: FROM_PHONE,
    To: TO_PHONE,
    Body: 'Hi, interested in Invisalign for my teen',
    NumMedia: '0',
  },
}

describe('processSmsInboundMessage', () => {
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

    const result = await processSmsInboundMessage(
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
    })

    expect(mockIngestLead).toHaveBeenCalledTimes(1)
    const [input] = mockIngestLead.mock.calls[0]
    expect(input.tenant_id).toBe(TENANT_ID)
    expect(input.source_channel).toBe('sms_inbound')
    expect(input.contact).toEqual({
      phone: FROM_PHONE,
      full_name: null,
      email: null,
    })
    expect(input.treatment_intent_text).toBe('Hi, interested in Invisalign for my teen')
    expect(input.event_id).toBe(`sms_inbound:${MESSAGE_SID}`)
    expect(input.external_message_id).toBe(MESSAGE_SID)
    // Raw payload preserves the full Twilio body verbatim, plus structured extras.
    expect(input.raw_payload.MessageSid).toBe(MESSAGE_SID)
    expect(input.raw_payload._media_urls).toEqual([])
    expect(input.raw_payload._num_media).toBe(0)
  })

  it('returns wasNewContact=false on the existing-contact (matched) path with no deal', async () => {
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

    const result = await processSmsInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )

    expect(result.wasNewContact).toBe(false)
    expect(result.dealId).toBeNull()
  })

  it('propagates a reused deal_id from ingestLead transparently (cross-channel reuse from 2b.2.a.3)', async () => {
    // ingestLead's engine-level reuse fix returns the existing open deal id
    // when one exists. processSmsInboundMessage is a thin wrapper — its only
    // contract is to surface ingestLead's `deal_id` unchanged. This locks in
    // the contract for the SMS-after-WhatsApp scenario where the same phone
    // number already has an open deal from a prior WhatsApp inbound.
    const REUSED_DEAL_ID = 'deal-reused-engine-1'
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-existing',
      attribution_touchpoint_id: 'tp-reuse',
      activity_id: 'act-reuse',
      deal_id: REUSED_DEAL_ID,
      dedup_decision: 'matched',
      dedup_signals: { email_match: false, phone_match: true, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    const result = await processSmsInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )

    expect(result.dealId).toBe(REUSED_DEAL_ID)
    expect(result.wasNewContact).toBe(false)
    expect(result.attributionTouchpointId).toBe('tp-reuse')
    expect(result.activityId).toBe('act-reuse')
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

    const result = await processSmsInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      SAMPLE_MESSAGE
    )
    expect(result.wasNewContact).toBe(false)
  })

  it('throws when ingestLead returns null IDs (review_required) — surfaces 5xx for Twilio retry', async () => {
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
      processSmsInboundMessage(
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

    await processSmsInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      { ...SAMPLE_MESSAGE, messageSid: 'SMxyz' }
    )
    const [input] = mockIngestLead.mock.calls[0]
    expect(input.external_message_id).toBe('SMxyz')
    expect(input.event_id).toBe('sms_inbound:SMxyz')
  })

  it('still ingests an MMS payload with body + mediaUrls preserved in raw_payload, no media download', async () => {
    // Text-only scope: an inbound MMS becomes a regular SMS lead. The body
    // (which may be the user's text caption alongside the photo, or '' for
    // photo-only messages) flows through; the media URLs are captured into
    // raw_payload so a future MMS phase can pick them up. No download or
    // storage in this phase.
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-mms',
      attribution_touchpoint_id: 'tp-mms',
      activity_id: 'act-mms',
      deal_id: 'deal-mms',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    const mmsMessage = {
      ...SAMPLE_MESSAGE,
      body: 'Sending a photo of my tooth',
      numMedia: 2,
      mediaUrls: [
        'https://api.twilio.com/.../Media/MEa',
        'https://api.twilio.com/.../Media/MEb',
      ],
      rawPayload: {
        ...SAMPLE_MESSAGE.rawPayload,
        Body: 'Sending a photo of my tooth',
        NumMedia: '2',
        MediaUrl0: 'https://api.twilio.com/.../Media/MEa',
        MediaContentType0: 'image/jpeg',
        MediaUrl1: 'https://api.twilio.com/.../Media/MEb',
        MediaContentType1: 'image/jpeg',
      },
    }

    const result = await processSmsInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      mmsMessage
    )

    expect(result.contactId).toBe('contact-mms')
    expect(result.activityId).toBe('act-mms')

    const [input] = mockIngestLead.mock.calls[0]
    expect(input.treatment_intent_text).toBe('Sending a photo of my tooth')
    expect(input.raw_payload._media_urls).toEqual([
      'https://api.twilio.com/.../Media/MEa',
      'https://api.twilio.com/.../Media/MEb',
    ])
    expect(input.raw_payload._num_media).toBe(2)
    // Verbatim Twilio fields preserved.
    expect(input.raw_payload.MediaUrl0).toBe('https://api.twilio.com/.../Media/MEa')
  })

  it('handles photo-only MMS (empty body) by ingesting with body="" — activity description falls back', async () => {
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-photo-only',
      attribution_touchpoint_id: 'tp-photo',
      activity_id: 'act-photo',
      deal_id: 'deal-photo',
      dedup_decision: 'new',
      dedup_signals: { email_match: false, phone_match: false, channel_identifier_match: false },
      sla: null,
      routing_log_id: null,
    })

    await processSmsInboundMessage(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      TENANT_ID,
      {
        ...SAMPLE_MESSAGE,
        body: '',
        numMedia: 1,
        mediaUrls: ['https://api.twilio.com/.../Media/MEa'],
      }
    )

    const [input] = mockIngestLead.mock.calls[0]
    // body is '' — ingestLead's insertActivity falls back to
    // 'New lead via sms_inbound'. We don't assert the fallback string here
    // (that's ingestLead's contract) — just that we didn't fabricate a body.
    expect(input.treatment_intent_text).toBe('')
  })
})
