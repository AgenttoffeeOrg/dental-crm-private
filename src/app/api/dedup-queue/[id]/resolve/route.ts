/**
 * Phase 2a.2b — Dedup review queue: resolve endpoint.
 * Phase 2a.9 — added deal creation to merge / create_new (mirrors ingestLead).
 *
 * POST /api/dedup-queue/[id]/resolve
 *
 * Body (discriminated union):
 *   { action: 'merge', merge_into_contact_id: uuid, notes?: string }
 *   { action: 'create_new', notes?: string }
 *   { action: 'dismiss', notes?: string }
 *
 * Auth: requires `contacts.dedup_queue_manage`.
 *
 * merge:
 *   - Validates `merge_into_contact_id` is in `matched_contact_ids`.
 *   - Additively patches the target contact (only fills NULL fields, never
 *     overwrites). Consents widen-only (false/null → true allowed; true never
 *     downgraded).
 *   - Inserts an attribution_touchpoint, then creates a Deal via
 *     `createDealForLead` using the queue row's original
 *     `treatment_offering_id` + `source_channel`, then inserts an inbound
 *     activity linked to that deal_id (NULL on graceful-skip).
 *   - Marks the queue row `merged` and emits `lead.arrived` with `deal_id`
 *     + `deal_title` in metadata.
 *
 * create_new:
 *   - Inserts a new contact from `candidate_payload`.
 *   - Same flow as merge for touchpoint + deal + activity + notification;
 *     marks queue `new_contact`.
 *
 * dismiss:
 *   - Just marks queue `dismissed`. No contact mutation, no deal, no
 *     notification. (Explicit "this is spam / duplicate I want to drop".)
 *
 * Idempotency: the load query filters `status = 'pending'`, so a second
 * resolve call on the same row returns 404 `already resolved` rather than
 * double-creating a deal. `lead.arrived` notifications also use idempotency
 * key `dedup_resolved:<queue_id>` so the notification side is safe against
 * upstream retries.
 *
 * Response shape (merge / create_new):
 *   { queue_item, contact, deal_id, deal_title, action }
 * Response shape (dismiss):
 *   { queue_item, deal_id: null, action: 'dismiss' }
 *
 * `deal_id` is NULL when deal-creation gracefully skipped (no default
 * pipeline / zero-stage pipeline / deals.insert error). The contact is
 * still merged/created in that case — the resolution never fails the
 * request just because the deal step couldn't complete.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { sourceChannelToLabel } from '@/lib/lead-ingestion/source-labels'
import type { SourceChannelEnum } from '@/lib/lead-ingestion/types'
import {
  createDealForLead,
  type DealCreationOutcome,
} from '@/lib/lead-ingestion/deal-creation'

export const dynamic = 'force-dynamic'

const ResolveSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('merge'),
    merge_into_contact_id: z.string().uuid(),
    notes: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal('create_new'),
    notes: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal('dismiss'),
    notes: z.string().max(2000).optional(),
  }),
])

type ResolveBody = z.infer<typeof ResolveSchema>

interface QueueRow {
  id: string
  tenant_id: string
  candidate_payload: Record<string, unknown>
  candidate_email: string | null
  candidate_phone: string | null
  candidate_name: string | null
  source_channel: SourceChannelEnum
  matched_contact_ids: string[]
  match_signals: Record<string, unknown>
  status: string
  created_at: string
}

interface ContactRow {
  id: string
  tenant_id: string
  full_name: string | null
  primary_email: string | null
  primary_email_norm: string | null
  primary_phone: string | null
  primary_phone_e164: string | null
  treatment_offering_id: string | null
  marketing_consent: boolean | null
  email_consent: boolean | null
  sms_consent: boolean | null
  owner_user_id: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getApiRequestContext(request)
    const { supabase, tenantId, user } = context

    let parsedBody: ResolveBody
    try {
      const json = await request.json()
      parsedBody = ResolveSchema.parse(json)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: err.errors },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { data: hasPerm, error: permError } = await supabase.rpc(
      'user_has_permission',
      {
        p_user_id: user.id,
        p_tenant_id: tenantId,
        p_permission_code: 'contacts.dedup_queue_manage',
      }
    )

    if (permError) {
      console.error('[API:dedup-queue/resolve] permission check failed', permError)
      return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
    }
    if (!hasPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: itemData, error: loadError } = await supabase
      .from('dedup_review_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', params.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (loadError) {
      console.error('[API:dedup-queue/resolve] load failed', loadError)
      return NextResponse.json({ error: 'Failed to load queue item' }, { status: 500 })
    }
    if (!itemData) {
      return NextResponse.json(
        { error: 'Queue item not found or already resolved' },
        { status: 404 }
      )
    }

    const item = itemData as unknown as QueueRow
    const candidate = (item.candidate_payload ?? {}) as Record<string, unknown>

    if (parsedBody.action === 'dismiss') {
      const { data: updatedRow, error: updateError } = await supabase
        .from('dedup_review_queue')
        .update({
          status: 'dismissed',
          resolved_by_user_id: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: parsedBody.notes ?? null,
        })
        .eq('id', item.id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (updateError) {
        console.error('[API:dedup-queue/resolve] dismiss update failed', updateError)
        return NextResponse.json({ error: 'Failed to dismiss item' }, { status: 500 })
      }

      // Phase 2a.9: dismiss never creates a deal (it's the explicit "this is
      // spam / a duplicate I don't want to keep" path). We surface
      // `deal_id: null` here so callers can rely on the response shape
      // being consistent across all three actions.
      return NextResponse.json({
        queue_item: updatedRow,
        deal_id: null,
        action: 'dismiss',
      })
    }

    // merge / create_new — both end up writing a touchpoint, activity, queue
    // update, and notification. Resolve / create the contact first.
    let contact: ContactRow
    let resolvedAction: 'merge' | 'create_new'
    let queueStatus: 'merged' | 'new_contact'

    if (parsedBody.action === 'merge') {
      if (!item.matched_contact_ids.includes(parsedBody.merge_into_contact_id)) {
        return NextResponse.json(
          { error: 'merge_into_contact_id is not one of the matched contacts for this queue item' },
          { status: 400 }
        )
      }

      const { data: target, error: targetError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', parsedBody.merge_into_contact_id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()

      if (targetError) {
        console.error('[API:dedup-queue/resolve] target load failed', targetError)
        return NextResponse.json({ error: 'Failed to load target contact' }, { status: 500 })
      }
      if (!target) {
        return NextResponse.json({ error: 'Target contact not found' }, { status: 404 })
      }

      const targetTyped = target as unknown as ContactRow
      const patch = buildAdditivePatch(targetTyped, candidate)

      if (Object.keys(patch).length > 0) {
        ;(patch as Record<string, unknown>).updated_at = new Date().toISOString()
        const { error: patchError } = await supabase
          .from('contacts')
          .update(patch)
          .eq('id', targetTyped.id)
          .eq('tenant_id', tenantId)

        if (patchError) {
          console.error('[API:dedup-queue/resolve] additive patch failed', patchError)
          return NextResponse.json({ error: 'Failed to update target contact' }, { status: 500 })
        }
      }

      contact = { ...targetTyped, ...(patch as Partial<ContactRow>) }
      resolvedAction = 'merge'
      queueStatus = 'merged'
    } else {
      // create_new
      const newContactInsert = buildNewContactRow(tenantId, item.source_channel, candidate)
      const { data: created, error: insertError } = await supabase
        .from('contacts')
        .insert(newContactInsert)
        .select('*')
        .single()

      if (insertError || !created) {
        console.error('[API:dedup-queue/resolve] create_new insert failed', insertError)
        return NextResponse.json(
          { error: insertError?.message ?? 'Failed to create new contact' },
          { status: 500 }
        )
      }

      contact = created as unknown as ContactRow
      resolvedAction = 'create_new'
      queueStatus = 'new_contact'
    }

    // ---- Touchpoint -----------------------------------------------------
    const occurredAt = new Date()
    const touchpointId = await insertTouchpoint(
      supabase,
      tenantId,
      contact.id,
      item,
      candidate,
      occurredAt
    )

    // ---- Deal creation (Phase 2a.9) -------------------------------------
    //
    // Mirror ingestLead()'s ordering: deal first, then activity links to it.
    // We use the queue row's stored `source_channel` column and read
    // `treatment_offering_id` from the original `candidate_payload` — the
    // queue insertion path (Phase 2a.9 also touched `ingestLead`) merges
    // both `treatment_offering_id` and `treatment_intent_text` into the
    // payload exactly so that this read is reliable. The fallback chain in
    // `createDealForLead` (offering → default pipeline → graceful skip)
    // means a missing offering id just lands the deal as 'Inquiry' on the
    // tenant's default pipeline — same as ingestLead.
    const treatmentOfferingId = pickStringField(candidate, ['treatment_offering_id'])
    const dealOutcome: DealCreationOutcome = await createDealForLead(supabase, {
      tenantId,
      contactId: contact.id,
      treatmentOfferingId,
      sourceChannel: item.source_channel,
    })
    const dealId = dealOutcome.ok ? dealOutcome.dealId : null
    const dealTitle = dealOutcome.ok
      ? dealOutcome.context.title
      : dealOutcome.context?.title ?? null

    // ---- Activity (links to deal when one was created) ------------------
    await insertActivity(
      supabase,
      tenantId,
      contact.id,
      item,
      occurredAt,
      resolvedAction,
      touchpointId,
      dealId
    )

    // ---- Update queue ---------------------------------------------------
    const { data: updatedQueueRow, error: queueUpdateError } = await supabase
      .from('dedup_review_queue')
      .update({
        status: queueStatus,
        resolved_contact_id: contact.id,
        resolved_by_user_id: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: parsedBody.notes ?? null,
      })
      .eq('id', item.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (queueUpdateError) {
      console.error('[API:dedup-queue/resolve] queue status update failed', queueUpdateError)
      // Contact / touchpoint / deal / activity already written; surface the
      // error but flag the partial success and include the deal id so the
      // caller can still link to it.
      return NextResponse.json(
        {
          error: 'Resolved but failed to update queue row',
          contact,
          deal_id: dealId,
          partial: true,
        },
        { status: 500 }
      )
    }

    // ---- Emit `lead.arrived` notification (best-effort) -----------------
    try {
      const { emitNotification } = await import('@/lib/notifications/notification-router')
      const candidateFullName = pickStringField(candidate, ['full_name', 'name'])
      const sourceLabel = sourceChannelToLabel(item.source_channel)
      await emitNotification({
        event_key: 'lead.arrived',
        event_id: `dedup_resolved:${item.id}`,
        tenant_id: tenantId,
        triggered_by_user_id: user.id,
        entity_type: 'contact',
        entity_id: contact.id,
        entity_url: `/contacts/${contact.id}`,
        metadata: {
          contact_id: contact.id,
          attribution_touchpoint_id: touchpointId,
          // Phase 2a.9: surface deal_id + deal_title in metadata so the
          // notification template / future deep-link can land on the
          // created deal. Mirrors the metadata shape ingestLead emits.
          deal_id: dealId,
          deal_title: dealTitle,
          lead_name: contact.full_name || candidateFullName || 'A new lead',
          treatment_label: pickStringField(candidate, ['treatment_label']) ?? 'a general enquiry',
          source_label: sourceLabel,
          source_channel: item.source_channel,
          respond_within_minutes: pickNumberField(candidate, ['sla_minutes']) ?? 15,
          pipeline_id: pickStringField(candidate, ['pipeline_id']),
          assigned_user_id: contact.owner_user_id ?? null,
          treatment_offering_id: contact.treatment_offering_id ?? null,
          dedup_resolved_action: resolvedAction,
          dedup_queue_item_id: item.id,
        },
      })
    } catch (err) {
      console.error('[API:dedup-queue/resolve] emitNotification failed (non-fatal):', err)
    }

    return NextResponse.json({
      queue_item: updatedQueueRow,
      contact,
      // Phase 2a.9: surface deal_id (and the resolved title for callers
      // that want a label without re-querying) so the dedup-queue UI can
      // eventually deep-link to the created deal. NULL when:
      //   - graceful-skip path (no default pipeline / zero stages /
      //     deals.insert error) — contact is still merged/created.
      deal_id: dealId,
      deal_title: dealTitle,
      action: resolvedAction,
    })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[API:dedup-queue/resolve] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickStringField(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim().length > 0) return v
  }
  return null
}

function pickNumberField(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

function pickConsents(candidate: Record<string, unknown>): {
  marketing_consent: boolean
  email_consent: boolean
  sms_consent: boolean
} {
  const flat = {
    marketing_consent: candidate.marketing_consent === true,
    email_consent: candidate.email_consent !== false, // default true
    sms_consent: candidate.sms_consent === true,
  }
  // Also support nested `consents` shape for forward compatibility.
  const nested = (candidate.consents ?? null) as Record<string, unknown> | null
  if (nested && typeof nested === 'object') {
    return {
      marketing_consent: flat.marketing_consent || nested.marketing_consent === true,
      email_consent: nested.email_consent !== false ? flat.email_consent : false,
      sms_consent: flat.sms_consent || nested.sms_consent === true,
    }
  }
  return flat
}

function pickFullName(candidate: Record<string, unknown>): string | null {
  const direct = pickStringField(candidate, ['full_name', 'name'])
  if (direct) return direct.trim() || null
  const first = pickStringField(candidate, ['first_name', 'firstName'])
  const last = pickStringField(candidate, ['last_name', 'lastName'])
  const joined = [first, last].filter(Boolean).join(' ').trim()
  return joined.length > 0 ? joined : null
}

function buildAdditivePatch(
  target: ContactRow,
  candidate: Record<string, unknown>
): Partial<ContactRow> {
  const patch: Partial<ContactRow> = {}
  const candidateEmail = pickStringField(candidate, ['email'])
  const candidatePhone = pickStringField(candidate, ['phone'])
  const candidateFullName = pickFullName(candidate)
  const candidateOfferingId = pickStringField(candidate, ['treatment_offering_id'])
  const consents = pickConsents(candidate)

  if (!target.primary_email && candidateEmail) {
    patch.primary_email = candidateEmail
    if (!target.primary_email_norm) patch.primary_email_norm = candidateEmail.toLowerCase()
  }
  if (!target.primary_phone && candidatePhone) {
    patch.primary_phone = candidatePhone
  }
  if (
    (!target.full_name || target.full_name === 'Unknown Lead') &&
    candidateFullName
  ) {
    patch.full_name = candidateFullName
  }
  if (!target.treatment_offering_id && candidateOfferingId) {
    patch.treatment_offering_id = candidateOfferingId
  }

  // Consents: widen only — never downgrade an existing `true`.
  if (target.marketing_consent !== true && consents.marketing_consent) {
    patch.marketing_consent = true
  }
  if (target.email_consent !== true && consents.email_consent) {
    patch.email_consent = true
  }
  if (target.sms_consent !== true && consents.sms_consent) {
    patch.sms_consent = true
  }

  return patch
}

function buildNewContactRow(
  tenantId: string,
  sourceChannel: SourceChannelEnum,
  candidate: Record<string, unknown>
): Record<string, unknown> {
  const consents = pickConsents(candidate)
  const candidateEmail = pickStringField(candidate, ['email'])
  const candidatePhone = pickStringField(candidate, ['phone'])
  const candidateOfferingId = pickStringField(candidate, ['treatment_offering_id'])
  const fullName = pickFullName(candidate)

  return {
    tenant_id: tenantId,
    full_name: fullName,
    primary_email: candidateEmail,
    primary_email_norm: candidateEmail ? candidateEmail.toLowerCase() : null,
    primary_phone: candidatePhone,
    treatment_offering_id: candidateOfferingId,
    marketing_consent: consents.marketing_consent,
    email_consent: consents.email_consent,
    sms_consent: consents.sms_consent,
    source: sourceChannel,
    contact_type: 'lead',
    status: 'lead',
  }
}

async function insertTouchpoint(
  supabase: { from: (t: string) => any },
  tenantId: string,
  contactId: string,
  item: QueueRow,
  candidate: Record<string, unknown>,
  occurredAt: Date
): Promise<string | null> {
  const metadata: Record<string, unknown> = {
    raw_payload: candidate,
    dedup_queue_item_id: item.id,
    dedup_resolved: true,
  }

  const { data, error } = await supabase
    .from('attribution_touchpoints')
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      treatment_offering_id: pickStringField(candidate, ['treatment_offering_id']),
      source_channel: item.source_channel,
      occurred_at: occurredAt.toISOString(),
      event_id: `dedup_resolved:${item.id}`,
      metadata,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error(
      '[API:dedup-queue/resolve] touchpoint insert failed (non-fatal):',
      error?.message ?? 'unknown'
    )
    return null
  }
  return (data as { id: string }).id
}

async function insertActivity(
  supabase: { from: (t: string) => any },
  tenantId: string,
  contactId: string,
  item: QueueRow,
  occurredAt: Date,
  resolvedAction: 'merge' | 'create_new',
  touchpointId: string | null,
  dealId: string | null
): Promise<void> {
  const description =
    resolvedAction === 'merge'
      ? `Merged from dedup queue (item ${item.id})`
      : `Created new contact from dedup queue (item ${item.id})`

  const { error } = await supabase.from('activities').insert({
    tenant_id: tenantId,
    contact_id: contactId,
    // Phase 2a.9: link the activity to the deal created during queue
    // resolution so it shows on the deal timeline as well as the contact's.
    // NULL is fine — the graceful-skip paths in deal-creation leave the
    // activity contact-scoped.
    deal_id: dealId,
    type: mapSourceChannelToActivityType(item.source_channel),
    direction: 'inbound',
    source_channel: item.source_channel,
    occurred_at: occurredAt.toISOString(),
    title: 'Lead received (dedup resolved)',
    description,
    metadata: {
      dedup_queue_item_id: item.id,
      resolved_action: resolvedAction,
      attribution_touchpoint_id: touchpointId,
      deal_id: dealId,
    },
  })

  if (error) {
    console.error(
      '[API:dedup-queue/resolve] activity insert failed (non-fatal):',
      error.message
    )
  }
}

/**
 * Mirrors the mapping in `src/lib/lead-ingestion/ingest-lead.ts` so the
 * resolved-from-queue activities use the same `activities.type` values as
 * leads ingested directly.
 */
function mapSourceChannelToActivityType(channel: SourceChannelEnum): string {
  switch (channel) {
    case 'form_embedded':
    case 'form_hosted_landing':
    case 'booking_widget_webform':
      return 'form_submission'
    case 'booking_widget_calendar':
      return 'web_chat'
    case 'booking_widget_whatsapp':
    case 'whatsapp_website_button':
    case 'whatsapp_meta_ad':
    case 'whatsapp_qr':
      return 'whatsapp_message'
    case 'meta_lead_ad':
    case 'meta_messenger_ad':
      return 'meta_lead_received'
    case 'google_lead_form':
    case 'google_search_ad':
    case 'google_display_ad':
      return 'google_lead_received'
    case 'instagram_dm':
      return 'instagram_message'
    case 'fb_messenger':
      return 'messenger_message'
    case 'sms_inbound':
      return 'sms_received'
    case 'phone_call_inbound':
      return 'call_received'
    case 'phone_call_voicemail':
      return 'voicemail_received'
    case 'online_booking_completed':
    case 'online_booking_abandoned':
      return 'booking_event'
    case 'manual_entry':
    case 'csv_import':
    case 'api_partner':
    case 'referral':
    case 'other':
    default:
      return 'note'
  }
}
