'use client'

/**
 * Phase 2b.31.2 — Next-Best-Action card.
 *
 * Sits at the top of the contact detail page's right column. Tells
 * the operator what to DO with this contact right now rather than
 * just showing them data. The rule engine is in
 * `src/lib/contacts/next-best-action.ts` and has its own unit tests.
 *
 * The card is self-fetching:
 *   - Pulls latest inbound / outbound activity timestamps.
 *   - Pulls the contact's open deals (with pipeline + stage names).
 *   - Computes a recommendation locally.
 *   - Renders an icon, title, subtitle and a single primary CTA.
 *
 * CTA handlers are owned by the parent (the contact detail view)
 * because they open composer slide-overs / navigate to deals — i.e.
 * they live in the parent's state.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import {
  computeNextBestAction,
  type NextBestAction,
  type OpenDealRef,
} from '@/lib/contacts/next-best-action'

interface NextBestActionCardProps {
  contactId: string
  tenantId: string | null | undefined
  onSendSms?: () => void
  onSendEmail?: () => void
  onSendWhatsapp?: () => void
  onCreateDeal?: () => void
  onViewDeal?: (dealId: string) => void
}

const ICON_BY_KIND: Record<NextBestAction['kind'], typeof AlertCircle> = {
  reply_inbound: MessageSquare,
  follow_up_stale: Clock,
  move_stage: TrendingUp,
  create_deal: Plus,
  on_track: CheckCircle2,
  first_touch: Sparkles,
  no_signal: CheckCircle2,
}

const TONE_BY_PRIORITY: Record<NextBestAction['priority'], { card: string; icon: string; badge: string }> = {
  urgent: {
    card: 'border-red-200 bg-red-50/60',
    icon: 'bg-red-100 text-red-700',
    badge: 'bg-red-600 text-white',
  },
  high: {
    card: 'border-amber-200 bg-amber-50/60',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-600 text-white',
  },
  normal: {
    card: 'border-blue-200 bg-blue-50/60',
    icon: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-600 text-white',
  },
  info: {
    card: 'border-emerald-200 bg-emerald-50/40',
    icon: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-600 text-white',
  },
}

const PRIORITY_LABEL: Record<NextBestAction['priority'], string> = {
  urgent: 'Action needed',
  high: 'Suggested',
  normal: 'Suggested',
  info: 'All good',
}

export function NextBestActionCard({
  contactId,
  tenantId,
  onSendSms,
  onSendEmail,
  onSendWhatsapp,
  onCreateDeal,
  onViewDeal,
}: NextBestActionCardProps) {
  const supabaseRef = useRef(createClient())
  const [loading, setLoading] = useState(true)
  // 2b.34.10 (MEDIUM #3) — track fetch failure explicitly so the
  // card can render "couldn't load suggestion" instead of falsely
  // claiming "Nothing urgent" via the Rule 7 fallback when the
  // inputs default to empty.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastInboundAt, setLastInboundAt] = useState<string | null>(null)
  const [lastOutboundAt, setLastOutboundAt] = useState<string | null>(null)
  const [openDeals, setOpenDeals] = useState<OpenDealRef[]>([])

  useEffect(() => {
    if (!contactId || !tenantId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const supabase = supabaseRef.current

    const run = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        // Run the two reads in parallel — both are tenant + contact
        // bound so the typical query latency is <100ms each.
        const [activitiesRes, dealsRes] = await Promise.all([
          supabase
            .from('activities')
            .select('direction, occurred_at')
            .eq('tenant_id', tenantId)
            .eq('contact_id', contactId)
            .in('direction', ['inbound', 'outbound'])
            .order('occurred_at', { ascending: false })
            .limit(50),
          supabase
            .from('deals')
            .select(
              'id, title, pipeline_id, last_activity_at, updated_at, pipelines(name), pipeline_stages!inner(name, is_won, is_lost)'
            )
            .eq('tenant_id', tenantId)
            .eq('contact_id', contactId)
            .eq('pipeline_stages.is_won', false)
            .eq('pipeline_stages.is_lost', false)
            .is('deleted_at', null),
        ])
        if (cancelled) return

        // Most recent inbound + outbound from the limited window. The
        // .limit(50) ceiling is fine — older history isn't relevant to
        // the next-best-action decision.
        let inbound: string | null = null
        let outbound: string | null = null
        for (const row of (activitiesRes.data ?? []) as Array<{ direction: string; occurred_at: string }>) {
          if (!row.occurred_at) continue
          if (row.direction === 'inbound' && (inbound === null || row.occurred_at > inbound)) {
            inbound = row.occurred_at
          } else if (row.direction === 'outbound' && (outbound === null || row.occurred_at > outbound)) {
            outbound = row.occurred_at
          }
        }
        setLastInboundAt(inbound)
        setLastOutboundAt(outbound)

        const deals = ((dealsRes.data ?? []) as Array<{
          id: string
          title: string | null
          pipeline_id: string | null
          last_activity_at: string | null
          updated_at: string | null
          pipelines?: { name?: string | null } | { name?: string | null }[] | null
          pipeline_stages?: { name?: string | null } | { name?: string | null }[] | null
        }>).map<OpenDealRef>((d) => {
          const pipeline = Array.isArray(d.pipelines) ? d.pipelines[0] : d.pipelines
          const stage = Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] : d.pipeline_stages
          return {
            id: d.id,
            title: d.title,
            pipelineId: d.pipeline_id,
            pipelineName: pipeline?.name ?? null,
            stageName: stage?.name ?? null,
            lastActivityAt: d.last_activity_at,
            updatedAt: d.updated_at,
          }
        })
        setOpenDeals(deals)
        // 2b.34.10 — surface query-level errors that didn't throw.
        if (activitiesRes.error || dealsRes.error) {
          setLoadError(
            activitiesRes.error?.message ||
              dealsRes.error?.message ||
              'Unable to load suggestion'
          )
        }
      } catch (err) {
        console.error('[next-best-action] load failed', err)
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'load_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [contactId, tenantId])

  const action = useMemo(
    () =>
      computeNextBestAction({
        lastInboundAt,
        lastOutboundAt,
        openDeals,
      }),
    [lastInboundAt, lastOutboundAt, openDeals]
  )

  if (loading) {
    return (
      <Card className="border-2 border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-50 rounded animate-pulse w-3/4" />
          </div>
        </div>
      </Card>
    )
  }

  // 2b.34.10 — explicit error state. Stops the card from falsely
  // claiming "Nothing urgent" when the activity/deals query failed.
  if (loadError) {
    return (
      <Card className="border-2 border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-700 text-sm">Couldn&apos;t load suggestion</h3>
            <p className="text-sm text-gray-500 mt-1">
              The next-best-action couldn't be calculated. Refresh the page to retry.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const Icon = ICON_BY_KIND[action.kind] ?? AlertCircle
  const tone = TONE_BY_PRIORITY[action.priority]

  const handleCta = () => {
    switch (action.cta.kind) {
      case 'send_sms':
        return onSendSms?.()
      case 'send_email':
        return onSendEmail?.()
      case 'send_whatsapp':
        return onSendWhatsapp?.()
      case 'create_deal':
        return onCreateDeal?.()
      case 'view_deal':
        return onViewDeal?.(action.cta.dealId)
      case 'none':
        return
    }
  }

  const ctaLabel = ctaLabelFor(action.cta.kind)

  return (
    <Card className={cn('border-2 p-4', tone.card)}>
      <div className="flex items-start gap-3">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', tone.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn('text-[10px] uppercase tracking-wide px-2 py-0', tone.badge)}>
              {PRIORITY_LABEL[action.priority]}
            </Badge>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
          <p className="text-sm text-gray-700 mt-1">{action.subtitle}</p>
        </div>
        {ctaLabel && action.cta.kind !== 'none' && (
          <Button size="sm" onClick={handleCta} className="flex-shrink-0">
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  )
}

function ctaLabelFor(kind: NextBestAction['cta']['kind']): string | null {
  switch (kind) {
    case 'send_sms':
      return 'Send SMS'
    case 'send_email':
      return 'Send Email'
    case 'send_whatsapp':
      return 'WhatsApp'
    case 'create_deal':
      return 'New Deal'
    case 'view_deal':
      return 'Open Deal'
    case 'none':
      return null
  }
}
