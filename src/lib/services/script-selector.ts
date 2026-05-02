import { createServiceClient } from '@/lib/supabase-server'
import {
  ensureScriptLibrarySeeded,
  SCRIPT_TRIGGER_LABELS,
  SCRIPT_TRIGGERS
} from '@/lib/services/script-library'
import { ScriptTrigger } from '@/types/database'

export interface PersonaProfile {
  anxietyLevel?: number | null
  trustScore?: number | null
  decisionStyle?: string | null
  communicationStyle?: string | null
}

export interface ScriptSelectorContext {
  tenantId: string
  trigger: ScriptTrigger
  personaTags?: string[]
  personaProfile?: PersonaProfile
  contactId?: string
  dealId?: string
  limit?: number
}

export interface ScriptRecommendation {
  scriptVersionId: string
  scriptId: string
  slug: string
  title: string
  body: string
  trigger: ScriptTrigger
  triggerLabel: string
  personaTags: string[]
  toneDescriptor?: string | null
  estimatedDurationSeconds?: number | null
  successRate: number
  usageCount: number
  helpfulCount: number
  lastUsedAt?: string | null
  outcomeCount: number
  positiveOutcomeCount: number
  totalRevenueCents: number
  lastOutcomeAt?: string | null
  scriptName: string
  scriptCategory?: string | null
  marketingHook?: string | null
  marketingHighlight?: string | null
  score: number
}

const BASE_SCORE = 50
const PERSONA_MATCH_WEIGHT = 12
const ANXIETY_WEIGHT = 8
const TRUST_WEIGHT = 6
const POSITIVE_OUTCOME_WEIGHT = 10
const USAGE_PENALTY = 0.4

export function normalizeTrigger(trigger: string | null): ScriptTrigger {
  if (!trigger) {
    return 'price_objection'
  }

  if ((SCRIPT_TRIGGERS as string[]).includes(trigger)) {
    return trigger as ScriptTrigger
  }

  return 'price_objection'
}

export async function selectScripts(context: ScriptSelectorContext): Promise<ScriptRecommendation[]> {
  const tenantId = context.tenantId
  await ensureScriptLibrarySeeded(tenantId)

  const supabase = createServiceClient()

  const triggersToQuery = context.trigger === 'universal'
    ? SCRIPT_TRIGGERS
    : [context.trigger, 'universal']

  const { data, error } = await supabase
    .from('sales_script_versions')
    .select(`
      id,
      script_id,
      slug,
      title,
      content,
      trigger_type,
      persona_tags,
      tone_descriptor,
      estimated_duration_seconds,
      success_rate,
      usage_count,
      helpful_count,
      last_used_at,
      outcome_count,
      positive_outcome_count,
      total_revenue_cents,
      last_outcome_at,
      metadata,
      sales_scripts!inner(
        id,
        name,
        category,
        marketing_hook
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .in('trigger_type', triggersToQuery)
    .order('success_rate', { ascending: false })
    .order('usage_count', { ascending: true })
    .limit(30)

  if (error) {
    throw error
  }

  const personaTags = new Set((context.personaTags ?? []).map((tag) => tag.toLowerCase()))
  const recommendations: ScriptRecommendation[] = (data ?? []).map((row) => {
    const variantPersonaTags: string[] = row.persona_tags ?? []
    const matches = variantPersonaTags.filter((tag) => personaTags.has(tag.toLowerCase()))
    const matchScore = matches.length * PERSONA_MATCH_WEIGHT

    let anxietyScore = 0
    let trustScore = 0

    if (context.personaProfile?.anxietyLevel !== undefined && context.personaProfile?.anxietyLevel !== null) {
      if (context.personaProfile.anxietyLevel > 60 && variantPersonaTags.includes('anxious')) {
        anxietyScore = ANXIETY_WEIGHT
      }
    }

    if (context.personaProfile?.trustScore !== undefined && context.personaProfile?.trustScore !== null) {
      if (context.personaProfile.trustScore < 50 && variantPersonaTags.includes('low_trust')) {
        trustScore = TRUST_WEIGHT
      }
    }

    const successRate = row.success_rate ?? 0
    const usageCount = row.usage_count ?? 0
    const positiveOutcomeCount = row.positive_outcome_count ?? 0
    const outcomeScore = positiveOutcomeCount * POSITIVE_OUTCOME_WEIGHT
    const penalty = usageCount * USAGE_PENALTY

    const score =
      BASE_SCORE +
      successRate +
      matchScore +
      anxietyScore +
      trustScore +
      outcomeScore -
      penalty

    return {
      scriptVersionId: row.id,
      scriptId: row.script_id,
      slug: row.slug,
      title: row.title,
      body: row.content,
      trigger: (row.trigger_type as ScriptTrigger) ?? 'universal',
      triggerLabel: SCRIPT_TRIGGER_LABELS[(row.trigger_type as ScriptTrigger) ?? 'universal'],
      personaTags: variantPersonaTags,
      toneDescriptor: row.tone_descriptor,
      estimatedDurationSeconds: row.estimated_duration_seconds,
      successRate,
      usageCount,
      helpfulCount: row.helpful_count ?? 0,
      lastUsedAt: row.last_used_at,
      outcomeCount: row.outcome_count ?? 0,
      positiveOutcomeCount,
      totalRevenueCents: row.total_revenue_cents ?? 0,
      lastOutcomeAt: row.last_outcome_at ?? null,
      scriptName: row.sales_scripts?.name ?? '',
      scriptCategory: row.sales_scripts?.category,
      marketingHook: row.sales_scripts?.marketing_hook ?? undefined,
      marketingHighlight: row.metadata?.marketingHighlight,
      score
    }
  })

  const limit = context.limit ?? 3
  const sortedRecommendations = recommendations.toSorted((a, b) => b.score - a.score || b.successRate - a.successRate || a.usageCount - b.usageCount)
  return sortedRecommendations.slice(0, limit)
}

