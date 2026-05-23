'use client'

/**
 * Phase 2b.52 — Dashboard smart-prompt nudges.
 *
 * Conditional cards under the triage grid. Each card surfaces a
 * specific actionable state of the tenant's CRM setup and routes
 * the operator to the fix.
 *
 * Per Q6 audit decision — dismiss behaviour is MIXED:
 *
 *   - Practice Setup Incomplete · Integration Warnings · AI Features
 *     Unconfigured  →  hide-if-resolved (no dismiss button at all;
 *     card disappears automatically when the underlying state is
 *     fixed). These are objective states.
 *
 *   - Re-engagement Opportunity  →  forever-dismiss (operator's
 *     personal preference; once dismissed it never comes back for
 *     this user, persisted in localStorage). Advisory only.
 *
 * Smart prompts NEVER block the page. They're hints, non-modal,
 * stack vertically with small spacing.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Settings,
  Phone,
  Bot,
  TrendingUp,
  X,
  ArrowRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import { addMonths } from 'date-fns'

const DISMISS_KEY_RE_ENGAGE = 're-engage-dismissed-v1'

interface DashboardSmartPromptsProps {
  tenantId: string | null | undefined
}

interface SetupState {
  needsPracticeSetup: boolean
  needsIntegrations: boolean
  integrationsMissing: string[]
  needsAiConfig: boolean
  closedLostCount6mo: number
}

const EMPTY: SetupState = {
  needsPracticeSetup: false,
  needsIntegrations: false,
  integrationsMissing: [],
  needsAiConfig: false,
  closedLostCount6mo: 0,
}

async function loadSetupState(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<SetupState> {
  // 1. Practice Setup — incomplete when there's no treatment_offerings
  //    row OR no unsorted_pipeline_id in tenant_routing_settings.
  const [offeringsCountRes, routingRes] = await Promise.all([
    supabase
      .from('practice_treatment_offerings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('tenant_routing_settings')
      .select('unsorted_pipeline_id')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ])
  const hasOfferings = (offeringsCountRes.count ?? 0) > 0
  const hasUnsorted = Boolean(
    (routingRes.data as { unsorted_pipeline_id?: string | null } | null)?.unsorted_pipeline_id
  )
  const needsPracticeSetup = !hasOfferings || !hasUnsorted

  // 2. Integration warnings — Twilio number + email provider.
  //    Both live on `integration_settings` (per the 2b.25 work).
  //    Best-effort: if the row doesn't exist we mark both missing.
  const integrationsRes = await supabase
    .from('integration_settings')
    .select('twilio_inbound_number, email_provider, email_provider_api_key')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  const intRow = integrationsRes.data as
    | { twilio_inbound_number?: string | null; email_provider?: string | null; email_provider_api_key?: string | null }
    | null
  const integrationsMissing: string[] = []
  if (!intRow?.twilio_inbound_number) integrationsMissing.push('Twilio inbound number')
  if (!intRow?.email_provider || !intRow?.email_provider_api_key) {
    integrationsMissing.push('Email provider')
  }
  const needsIntegrations = integrationsMissing.length > 0

  // 3. AI Features — Practice Brain (tenant_ai_context row + at
  //    least one non-null field).
  const aiRes = await supabase
    .from('tenant_ai_context')
    .select('brand_voice, practice_description, services_offered, faqs')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  const aiRow = aiRes.data as
    | {
        brand_voice?: string | null
        practice_description?: string | null
        services_offered?: unknown[] | null
        faqs?: unknown[] | null
      }
    | null
  const hasAi = Boolean(
    aiRow &&
      (aiRow.brand_voice ||
        aiRow.practice_description ||
        (Array.isArray(aiRow.services_offered) && aiRow.services_offered.length > 0) ||
        (Array.isArray(aiRow.faqs) && aiRow.faqs.length > 0))
  )
  const needsAiConfig = !hasAi

  // 4. Re-engagement — count of deals closed-lost ~6 months ago.
  //    Window: 5-7 months ago (sliding band so the prompt doesn't
  //    appear once and disappear before the operator notices).
  //    2b.57.3 (MEDIUM #3) — use date-fns addMonths instead of
  //    multiplying days; the 30-days-per-month approximation drifts
  //    ~5 days per year and the lane is labelled "6 months ago".
  const now = new Date()
  const sixMo = addMonths(now, -7).toISOString()
  const fiveMo = addMonths(now, -5).toISOString()
  const closedLostRes = await supabase
    .from('deals')
    .select('id, pipeline_stages!inner(is_lost)', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('pipeline_stages.is_lost', true)
    .gte('updated_at', sixMo)
    .lte('updated_at', fiveMo)
  const closedLostCount6mo = closedLostRes.count ?? 0

  return {
    needsPracticeSetup,
    needsIntegrations,
    integrationsMissing,
    needsAiConfig,
    closedLostCount6mo,
  }
}

export function DashboardSmartPrompts({ tenantId }: DashboardSmartPromptsProps) {
  const router = useRouter()
  const [state, setState] = useState<SetupState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [reEngageDismissed, setReEngageDismissed] = useState(false)

  // Load dismiss flag (localStorage, per-user, forever).
  useEffect(() => {
    if (typeof window === 'undefined') return
    setReEngageDismissed(localStorage.getItem(DISMISS_KEY_RE_ENGAGE) === '1')
  }, [])

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      try {
        const next = await loadSetupState(supabase, tenantId)
        if (!cancelled) setState(next)
      } catch (err) {
        console.warn('[smart-prompts] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
  }, [tenantId])

  const dismissReEngage = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY_RE_ENGAGE, '1')
    }
    setReEngageDismissed(true)
  }

  // Compute which cards to show. Hide-if-resolved: each card just
  // checks its own state. No card = nothing renders (no blank
  // section header).
  const showPracticeSetup = !loading && state.needsPracticeSetup
  const showIntegrations = !loading && state.needsIntegrations
  const showAi = !loading && state.needsAiConfig
  const showReEngage =
    !loading && state.closedLostCount6mo >= 10 && !reEngageDismissed

  const anyVisible = showPracticeSetup || showIntegrations || showAi || showReEngage
  if (!anyVisible) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
        Suggestions
      </h2>
      <div className="space-y-2">
        {showPracticeSetup && (
          <PromptCard
            icon={Settings}
            tone="violet"
            title="Set up your treatments"
            description="Pick the treatments your practice offers and the wizard will provision the right pipelines + an Unsorted catch-all for AI-uncertain leads."
            ctaLabel="Open setup wizard"
            onCta={() => router.push('/settings/practice-setup')}
          />
        )}

        {showIntegrations && (
          <PromptCard
            icon={Phone}
            tone="amber"
            title="Integration warnings"
            description={`Missing: ${state.integrationsMissing.join(' · ')}. Until these are wired, inbound from the affected channels won't reach the CRM.`}
            ctaLabel="Open integrations"
            onCta={() => router.push('/settings/integrations')}
          />
        )}

        {showAi && (
          <PromptCard
            icon={Bot}
            tone="blue"
            title="Set up Practice Brain"
            description="Add your brand voice + services + FAQs so AI replies, persona summaries, and pipeline routing match how you actually talk to patients."
            ctaLabel="Open AI settings"
            onCta={() => router.push('/settings/ai')}
          />
        )}

        {showReEngage && (
          <PromptCard
            icon={TrendingUp}
            tone="emerald"
            title={`${state.closedLostCount6mo} closed-lost leads from ~6 months ago`}
            description="People who didn't convert sometimes do six months later. Send a light re-engagement campaign to see who's still curious."
            ctaLabel="Build campaign"
            onCta={() => router.push('/marketing/campaigns/new?template=re-engagement')}
            onDismiss={dismissReEngage}
          />
        )}
      </div>
    </div>
  )
}

// ---- Card primitive --------------------------------------------------

const TONE: Record<string, { bg: string; border: string; iconBg: string; iconText: string; titleText: string; bodyText: string }> = {
  violet: {
    bg: 'bg-violet-50/60',
    border: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    titleText: 'text-violet-900',
    bodyText: 'text-violet-800',
  },
  amber: {
    bg: 'bg-amber-50/60',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    titleText: 'text-amber-900',
    bodyText: 'text-amber-800',
  },
  blue: {
    bg: 'bg-blue-50/60',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
    titleText: 'text-blue-900',
    bodyText: 'text-blue-800',
  },
  emerald: {
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    titleText: 'text-emerald-900',
    bodyText: 'text-emerald-800',
  },
}

interface PromptCardProps {
  icon: typeof Sparkles
  tone: keyof typeof TONE
  title: string
  description: string
  ctaLabel: string
  onCta: () => void
  onDismiss?: () => void
}

function PromptCard({ icon: Icon, tone, title, description, ctaLabel, onCta, onDismiss }: PromptCardProps) {
  const t = TONE[tone]
  return (
    <Card className={cn('p-4 border', t.bg, t.border)}>
      <div className="flex items-start gap-3">
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', t.iconBg)}>
          <Icon className={cn('h-4 w-4', t.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold', t.titleText)}>{title}</h3>
          <p className={cn('text-sm mt-1', t.bodyText)}>{description}</p>
          <div className="flex items-center gap-2 mt-2.5">
            <Button size="sm" onClick={onCta} className="h-7 text-xs">
              {ctaLabel}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-7 text-xs text-gray-500 hover:text-gray-700"
                title="Hide this suggestion permanently"
              >
                <X className="h-3 w-3 mr-1" />
                Hide
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
