/**
 * Phase 2b.13 — Practice Brain helper.
 *
 * The Practice Brain is the per-tenant knowledge hub the practice owner
 * fills in (brand voice, services, pricing, opening hours, FAQs,
 * escalation rules, free-form instructions). Every AI feature in the
 * CRM reads from here:
 *
 *   - automations AI reply drafter (2b.15)
 *   - pipeline routing AI classifier (2b.16)
 *   - FAQ responder (2b.18)
 *
 * `loadPracticeBrain` always returns a brain — never null. If the row
 * does not exist for the tenant yet (e.g. a fresh tenant before the
 * 2b.22 seeding hook runs), it returns the empty default so AI prompt
 * builders never have to null-check.
 */

import { createServiceClient } from '@/lib/supabase-server'

export interface ServiceOffering {
  name: string
  description?: string | null
}

export interface PricingItem {
  service: string
  price: string
  notes?: string | null
}

export interface FaqItem {
  question: string
  answer: string
}

export type OpeningHours = Record<
  // 'monday' | 'tuesday' | ... — we keep this open so the UI can also
  // store 'public_holiday' or other practice-defined keys.
  string,
  | {
      open: string
      close: string
      closed?: boolean
    }
  | { closed: true }
>

export interface PracticeBrain {
  tenant_id: string
  brand_voice: string | null
  practice_description: string | null
  services_offered: ServiceOffering[]
  pricing: PricingItem[]
  opening_hours: OpeningHours
  faqs: FaqItem[]
  escalation_rules: string | null
  additional_instructions: string | null
  updated_at: string | null
}

export const EMPTY_PRACTICE_BRAIN: Omit<PracticeBrain, 'tenant_id'> = {
  brand_voice: null,
  practice_description: null,
  services_offered: [],
  pricing: [],
  opening_hours: {},
  faqs: [],
  escalation_rules: null,
  additional_instructions: null,
  updated_at: null,
}

export function emptyPracticeBrain(tenantId: string): PracticeBrain {
  return { tenant_id: tenantId, ...EMPTY_PRACTICE_BRAIN }
}

/**
 * Loads the Practice Brain for a tenant.
 *
 * - Returns the empty default if no row exists yet (e.g. a fresh tenant
 *   before the 2b.22 seeding hook runs). This is the only intentional
 *   "success-shaped empty" path.
 * - Throws on DB error so the calling route can return a real 500
 *   instead of silently advertising "Practice Brain is empty" while the
 *   read actually failed.
 * - Throws on empty tenantId — there is no legitimate caller; an empty
 *   string would otherwise leak as a `tenant_id: ''` brain into the
 *   downstream AI features.
 *
 * Uses the service-role client so server-side AI features (engine,
 * FAQ responder, drafter) can read regardless of RLS context. UI calls
 * should go through the /api/settings/practice-brain route, not this
 * helper directly.
 */
export async function loadPracticeBrain(tenantId: string): Promise<PracticeBrain> {
  if (!tenantId) {
    throw new Error('loadPracticeBrain requires a tenantId')
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tenant_ai_context')
    .select(
      'tenant_id, brand_voice, practice_description, services_offered, pricing, opening_hours, faqs, escalation_rules, additional_instructions, updated_at'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[loadPracticeBrain] db error', { tenantId, error })
    throw new Error(
      `loadPracticeBrain failed for tenant ${tenantId}: ${
        (error as { message?: string })?.message ?? 'unknown db error'
      }`
    )
  }

  if (!data) return emptyPracticeBrain(tenantId)

  return {
    tenant_id: data.tenant_id as string,
    brand_voice: (data.brand_voice as string | null) ?? null,
    practice_description: (data.practice_description as string | null) ?? null,
    services_offered: Array.isArray(data.services_offered)
      ? (data.services_offered as ServiceOffering[])
      : [],
    pricing: Array.isArray(data.pricing) ? (data.pricing as PricingItem[]) : [],
    opening_hours:
      data.opening_hours && typeof data.opening_hours === 'object'
        ? (data.opening_hours as OpeningHours)
        : {},
    faqs: Array.isArray(data.faqs) ? (data.faqs as FaqItem[]) : [],
    escalation_rules: (data.escalation_rules as string | null) ?? null,
    additional_instructions: (data.additional_instructions as string | null) ?? null,
    updated_at: (data.updated_at as string | null) ?? null,
  }
}

/**
 * Builds the system-prompt fragment AI features prepend to their own
 * task-specific instructions. Returns a single string with each section
 * delimited; sections with no content are omitted entirely so we don't
 * waste tokens on "Brand voice: (not set)".
 */
export function buildPracticeBrainPromptFragment(brain: PracticeBrain): string {
  const sections: string[] = []

  if (brain.practice_description?.trim()) {
    sections.push(`About the practice:\n${brain.practice_description.trim()}`)
  }

  if (brain.brand_voice?.trim()) {
    sections.push(`Brand voice:\n${brain.brand_voice.trim()}`)
  }

  if (brain.services_offered.length > 0) {
    const lines = brain.services_offered
      .filter((s) => s?.name)
      .map((s) => (s.description ? `- ${s.name} — ${s.description}` : `- ${s.name}`))
    if (lines.length > 0) sections.push(`Services offered:\n${lines.join('\n')}`)
  }

  if (brain.pricing.length > 0) {
    const lines = brain.pricing
      .filter((p) => p?.service && p?.price)
      .map((p) =>
        p.notes ? `- ${p.service}: ${p.price} (${p.notes})` : `- ${p.service}: ${p.price}`
      )
    if (lines.length > 0) sections.push(`Pricing:\n${lines.join('\n')}`)
  }

  if (Object.keys(brain.opening_hours).length > 0) {
    const lines = Object.entries(brain.opening_hours).map(([day, hours]) => {
      if ('closed' in hours && hours.closed) return `- ${day}: closed`
      if ('open' in hours && 'close' in hours) {
        return `- ${day}: ${hours.open}–${hours.close}`
      }
      return `- ${day}: (unspecified)`
    })
    sections.push(`Opening hours:\n${lines.join('\n')}`)
  }

  if (brain.faqs.length > 0) {
    const lines = brain.faqs
      .filter((f) => f?.question && f?.answer)
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    if (lines.length > 0) sections.push(`Frequently asked questions:\n${lines.join('\n\n')}`)
  }

  if (brain.escalation_rules?.trim()) {
    sections.push(`Escalation rules — hand off to a human when:\n${brain.escalation_rules.trim()}`)
  }

  if (brain.additional_instructions?.trim()) {
    sections.push(`Additional instructions:\n${brain.additional_instructions.trim()}`)
  }

  return sections.join('\n\n')
}
