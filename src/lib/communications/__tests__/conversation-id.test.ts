/**
 * @jest-environment node
 */

import {
  computeConversationId,
  CONVERSATION_NAMESPACE_UUID,
} from '@/lib/communications/conversation-id'
import { v5 as uuidv5 } from 'uuid'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const CONTACT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('computeConversationId', () => {
  it('returns a string UUID for valid email input', () => {
    const id = computeConversationId({
      tenantId: TENANT,
      contactId: CONTACT,
      channel: 'email',
    })
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('returns the same UUID on repeated calls (deterministic)', () => {
    const input = { tenantId: TENANT, contactId: CONTACT, channel: 'email' as const }
    expect(computeConversationId(input)).toBe(computeConversationId(input))
  })

  it('returns null when contactId is null', () => {
    expect(
      computeConversationId({ tenantId: TENANT, contactId: null, channel: 'email' })
    ).toBeNull()
  })

  it('returns null when contactId is undefined', () => {
    expect(
      computeConversationId({ tenantId: TENANT, contactId: undefined, channel: 'email' })
    ).toBeNull()
  })

  it('returns null when channel is voice', () => {
    expect(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: 'voice' })
    ).toBeNull()
  })

  it('returns null when channel is note', () => {
    expect(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: 'note' })
    ).toBeNull()
  })

  it('returns null when channel is null', () => {
    expect(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: null })
    ).toBeNull()
  })

  it('returns different UUIDs for email vs sms vs whatsapp', () => {
    const base = { tenantId: TENANT, contactId: CONTACT }
    const email = computeConversationId({ ...base, channel: 'email' })
    const sms = computeConversationId({ ...base, channel: 'sms' })
    const whatsapp = computeConversationId({ ...base, channel: 'whatsapp' })
    expect(new Set([email, sms, whatsapp]).size).toBe(3)
  })

  it('matches SQL uuid_generate_v5 for a known triple', () => {
    const name = `${TENANT}:${CONTACT}:sms`
    const expected = uuidv5(name, CONVERSATION_NAMESPACE_UUID)
    expect(
      computeConversationId({ tenantId: TENANT, contactId: CONTACT, channel: 'sms' })
    ).toBe(expected)
  })
})
