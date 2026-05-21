/**
 * Phase 2b.16 — Pipeline router.
 *
 * Decides which pipeline (and optionally which stage) a lead belongs
 * to. Three-tier rule chain:
 *
 *   1. Practice keyword rules — exact substring match (case-insensitive)
 *      against `tenant_routing_settings.keyword_pipeline_rules`. Highest
 *      priority match wins.
 *
 *   2. AI classifier (Claude haiku-4-5) — when
 *      `tenant_routing_settings.ai_routing_enabled = true` AND
 *      ANTHROPIC_API_KEY is configured. Claude is shown the
 *      tenant's pipelines + the practice's services list (from
 *      Practice Brain) and asked which pipeline best fits the intent
 *      text. Confidence is checked against
 *      `tenant_routing_settings.ai_confidence_threshold` (default 60).
 *
 *   3. Unsorted fallback — `tenant_routing_settings.unsorted_pipeline_id`
 *      when set, otherwise null. The caller (deal-creation) handles
 *      the final fallthrough to `pipelines.is_default = true` when
 *      this returns null.
 *
 * Called from `lib/lead-ingestion/deal-creation.ts` `resolveDealContext`
 * BEFORE the default-pipeline fallback. If the lead carries a matching
 * `treatment_offering_id`, that path runs first and the router is
 * skipped entirely.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import {
  isAnthropicConfigured,
  claudeOneShot,
  DEFAULT_CLAUDE_MODEL,
} from '@/lib/anthropic-client'
import { loadPracticeBrain } from '@/lib/automations/practice-brain'

export interface KeywordRule {
  keywords: string[]
  pipeline_id: string
  stage_id?: string | null
  priority?: number
}

export interface RouteInput {
  tenantId: string
  intentText: string | null | undefined
}

export type RouteSource = 'keyword' | 'ai' | 'unsorted' | 'none'

export interface RouteResult {
  pipelineId: string
  stageId?: string | null
  source: RouteSource
  confidence?: number
  matchedKeyword?: string
}

interface RoutingSettings {
  routing_enabled: boolean | null
  ai_routing_enabled: boolean | null
  ai_keyword_matching_enabled: boolean | null
  ai_confidence_threshold: number | null
  unsorted_pipeline_id: string | null
  keyword_pipeline_rules: KeywordRule[] | null
}

interface PipelineRow {
  id: string
  name: string
  description: string | null
  is_default: boolean | null
}

/**
 * Resolve a pipeline for a lead from inbound text + tenant rules.
 * Returns `null` when neither keywords nor AI nor an unsorted
 * fallback yield a match; caller should fall through to the default
 * pipeline lookup.
 */
export async function routePipeline(
  input: RouteInput,
  options: { supabase?: SupabaseClient } = {}
): Promise<RouteResult | null> {
  const supabase = options.supabase ?? createServiceClient()
  const settings = await loadRoutingSettings(supabase, input.tenantId)
  if (!settings || settings.routing_enabled === false) return null

  const intentText = (input.intentText ?? '').toString().trim()

  // 1) keyword rules
  if (settings.ai_keyword_matching_enabled !== false && intentText.length > 0) {
    const hit = matchKeywordRules(settings.keyword_pipeline_rules ?? [], intentText)
    if (hit) {
      return {
        pipelineId: hit.rule.pipeline_id,
        stageId: hit.rule.stage_id ?? null,
        source: 'keyword',
        matchedKeyword: hit.matchedKeyword,
      }
    }
  }

  // 2) AI classifier
  if (settings.ai_routing_enabled === true && isAnthropicConfigured() && intentText.length > 0) {
    const aiResult = await classifyWithClaude(
      supabase,
      input.tenantId,
      intentText,
      settings.ai_confidence_threshold ?? 60
    )
    if (aiResult) return aiResult
  }

  // 3) unsorted fallback
  if (settings.unsorted_pipeline_id) {
    return {
      pipelineId: settings.unsorted_pipeline_id,
      source: 'unsorted',
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

async function loadRoutingSettings(
  supabase: SupabaseClient,
  tenantId: string
): Promise<RoutingSettings | null> {
  const { data, error } = await supabase
    .from('tenant_routing_settings')
    .select(
      'routing_enabled, ai_routing_enabled, ai_keyword_matching_enabled, ai_confidence_threshold, unsorted_pipeline_id, keyword_pipeline_rules'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    console.warn('[pipeline-router] loadRoutingSettings failed', { tenantId, error: error.message })
    return null
  }
  return (data as RoutingSettings | null) ?? null
}

function matchKeywordRules(
  rules: KeywordRule[],
  intentText: string
): { rule: KeywordRule; matchedKeyword: string } | null {
  if (!Array.isArray(rules) || rules.length === 0) return null
  const haystack = intentText.toLowerCase()

  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  for (const rule of sorted) {
    if (!rule?.pipeline_id || !Array.isArray(rule.keywords)) continue
    for (const kw of rule.keywords) {
      if (typeof kw !== 'string' || kw.length === 0) continue
      if (haystack.includes(kw.toLowerCase())) {
        return { rule, matchedKeyword: kw }
      }
    }
  }
  return null
}

async function fetchPipelinesForRouting(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PipelineRow[]> {
  const { data } = await supabase
    .from('pipelines')
    .select('id, name, description, is_default')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .limit(20)
  return (data as PipelineRow[] | null) ?? []
}

async function classifyWithClaude(
  supabase: SupabaseClient,
  tenantId: string,
  intentText: string,
  confidenceThreshold: number
): Promise<RouteResult | null> {
  const pipelines = await fetchPipelinesForRouting(supabase, tenantId)
  if (pipelines.length === 0) return null

  let servicesHint = ''
  try {
    const brain = await loadPracticeBrain(tenantId)
    if (brain.services_offered.length > 0) {
      servicesHint = brain.services_offered
        .filter((s) => s?.name)
        .map((s) => (s.description ? `- ${s.name}: ${s.description}` : `- ${s.name}`))
        .join('\n')
    }
  } catch (err) {
    // brain load failure is non-fatal; classify without services context
    console.warn('[pipeline-router] practice brain load failed', { tenantId, err })
  }

  const pipelineList = pipelines
    .map((p) => `- id="${p.id}" name="${p.name}"${p.description ? `, description="${p.description}"` : ''}`)
    .join('\n')

  const system = [
    'You are a routing classifier for a dental practice CRM. Decide which sales pipeline best fits an inbound enquiry.',
    'Reply with valid JSON only — exactly: {"pipeline_id": "<id-from-list>", "confidence": <0-100>}',
    'Pick the closest pipeline. If no pipeline matches at all, return {"pipeline_id": null, "confidence": 0}.',
    'Do not invent pipeline ids — pick from the list provided.',
  ].join('\n')

  const user = [
    'Available pipelines:',
    pipelineList,
    '',
    servicesHint
      ? `Services this practice offers:\n${servicesHint}\n`
      : '',
    'Inbound enquiry text:',
    `"""${intentText.substring(0, 1200)}"""`,
  ]
    .filter(Boolean)
    .join('\n')

  let raw: string | null
  try {
    raw = await claudeOneShot({
      system,
      user,
      model: DEFAULT_CLAUDE_MODEL,
      maxTokens: 120,
      temperature: 0.1,
    })
  } catch (err) {
    console.warn('[pipeline-router] Claude classify error', { tenantId, err })
    return null
  }
  if (!raw) return null

  let parsed: { pipeline_id?: string | null; confidence?: number }
  try {
    parsed = JSON.parse(stripJsonFence(raw)) as typeof parsed
  } catch {
    console.warn('[pipeline-router] Claude returned non-JSON', { raw: raw.substring(0, 200) })
    return null
  }

  if (!parsed.pipeline_id || typeof parsed.pipeline_id !== 'string') return null
  if (!pipelines.some((p) => p.id === parsed.pipeline_id)) {
    console.warn('[pipeline-router] Claude returned a pipeline id not in the list', {
      returned: parsed.pipeline_id,
    })
    return null
  }
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0
  if (confidence < confidenceThreshold) return null

  return {
    pipelineId: parsed.pipeline_id,
    source: 'ai',
    confidence,
  }
}

function stripJsonFence(s: string): string {
  const t = s.trim()
  if (t.startsWith('```')) {
    return t.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim()
  }
  return t
}
