/**
 * Phase 2a.2a — SLA resolver.
 *
 * Resolves the first-response SLA window for an incoming lead.
 *
 * Resolution chain (first hit wins):
 *   1. Matching `lead_sla_rules` row for (tenant_id, source_channel)
 *      NOTE: live `lead_sla_rules` schema does NOT include treatment_offering_id.
 *      The planner's draft assumed it did. We match by (tenant, source_channel)
 *      only and prefer the most-specific rule (tenant-scoped over platform default).
 *   2. The offering's `custom_sla_minutes` (if treatment_offering_id provided)
 *   3. The canonical treatment type's `default_sla_minutes`
 *   4. SLA_SYSTEM_FALLBACK_MINUTES (15)
 *
 * Business-hours-aware computation is deferred to Phase 2b (audit confirms).
 * `due_at` here is naive: lead_arrived_at + minutes * 60_000.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import type { SourceChannelEnum } from './types'

export const SLA_SYSTEM_FALLBACK_MINUTES = 15

export interface SLAResolveInput {
  tenant_id: string
  source_channel: SourceChannelEnum
  treatment_offering_id?: string | null
  lead_arrived_at: Date
}

export interface SLAResolveOutput {
  sla_rule_id: string | null
  first_response_minutes: number
  due_at: Date
  source: 'matched_rule' | 'offering_default' | 'canonical_default' | 'system_fallback'
}

export async function resolveSLA(
  input: SLAResolveInput,
  client?: SupabaseClient
): Promise<SLAResolveOutput> {
  const supabase = client ?? createServiceClient()

  // Tier 1 — lead_sla_rules. Prefer tenant-specific rule over platform default
  // (rules with NULL tenant_id act as cross-tenant defaults). Always require
  // exact source_channel match — matching rules are explicitly typed.
  try {
    const { data: rules, error } = await supabase
      .from('lead_sla_rules')
      .select('id, first_response_minutes, tenant_id')
      .eq('source_channel', input.source_channel)
      .or(`tenant_id.eq.${input.tenant_id},tenant_id.is.null`)
      .eq('is_active', true)
      .order('tenant_id', { ascending: false, nullsFirst: false }) // tenant-specific first
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && rules && rules.length > 0) {
      return buildOutput(input.lead_arrived_at, rules[0].first_response_minutes, 'matched_rule', rules[0].id)
    }
  } catch {
    // fall through — never fail SLA resolution; default below
  }

  // Tier 2 + Tier 3 — offering's custom_sla_minutes, then its canonical type's default.
  // Single query joins both so we don't make two round-trips.
  if (input.treatment_offering_id) {
    try {
      const { data: offering, error } = await supabase
        .from('practice_treatment_offerings')
        .select('custom_sla_minutes, treatment_types ( default_sla_minutes )')
        .eq('id', input.treatment_offering_id)
        .maybeSingle()

      if (!error && offering) {
        if (offering.custom_sla_minutes != null) {
          return buildOutput(input.lead_arrived_at, offering.custom_sla_minutes, 'offering_default', null)
        }
        // PostgREST may return the joined treatment_types row as either an
        // object or a single-element array depending on the relationship type.
        const tt = offering.treatment_types as
          | { default_sla_minutes: number | null }
          | Array<{ default_sla_minutes: number | null }>
          | null
        const canonical = Array.isArray(tt) ? tt[0] : tt
        if (canonical?.default_sla_minutes != null) {
          return buildOutput(input.lead_arrived_at, canonical.default_sla_minutes, 'canonical_default', null)
        }
      }
    } catch {
      // fall through to system fallback
    }
  }

  // Tier 4 — system fallback
  return buildOutput(input.lead_arrived_at, SLA_SYSTEM_FALLBACK_MINUTES, 'system_fallback', null)
}

function buildOutput(
  arrivedAt: Date,
  minutes: number,
  source: SLAResolveOutput['source'],
  ruleId: string | null
): SLAResolveOutput {
  return {
    sla_rule_id: ruleId,
    first_response_minutes: minutes,
    due_at: new Date(arrivedAt.getTime() + minutes * 60_000),
    source,
  }
}
