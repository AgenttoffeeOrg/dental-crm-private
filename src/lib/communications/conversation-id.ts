import { v5 as uuidv5 } from 'uuid'

/**
 * Namespace UUID for v5 derivation of activity.conversation_id.
 * Generated once in Phase 2b.11 (see docs/2b/2b-11-changes.md §1.8).
 * DO NOT change this value — rotating it would orphan every existing
 * stored conversation_id.
 */
export const CONVERSATION_NAMESPACE_UUID = 'dc5cee30-9488-4ebf-a7fe-250a98176501'

export type SupportedConversationChannel = 'email' | 'sms' | 'whatsapp'

const SUPPORTED_CHANNELS: ReadonlySet<string> = new Set(['email', 'sms', 'whatsapp'])

export interface ComputeConversationIdInput {
  tenantId: string
  contactId: string | null | undefined
  channel: string | null | undefined
}

/**
 * Returns a stable v5 UUID derived from (tenant, contact, channel).
 * `channel` is the activities.type value for messaging channels.
 * Returns null if contactId is missing or channel is unsupported.
 */
export function computeConversationId(
  input: ComputeConversationIdInput
): string | null {
  const { tenantId, contactId, channel } = input
  if (!contactId) return null
  if (!channel) return null
  if (!SUPPORTED_CHANNELS.has(channel)) return null
  const name = `${tenantId}:${contactId}:${channel}`
  return uuidv5(name, CONVERSATION_NAMESPACE_UUID)
}
