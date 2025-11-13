import { useEffect, useState } from 'react';
import { formatISO, subDays } from 'date-fns';
import { Activity, Bot, Lightbulb, Target, TrendingUp } from 'lucide-react';

import { createClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from '@/lib/formatting';

type ScriptInsight = {
  title: string;
  successRate: number;
  usages: number;
  revenueCents: number;
};

type DashboardIntelligenceState = {
  topPerformer?: ScriptInsight;
  adoptionLeader?: ScriptInsight;
  revenueLeader?: ScriptInsight;
  leadingPersonaTag?: string | null;
  updatedAt?: string | null;
};

interface DashboardIntelligencePanelProps {
  tenantId?: string | null;
  onOpenCoaching: () => void;
}

export function DashboardIntelligencePanel({
  tenantId,
  onOpenCoaching,
}: DashboardIntelligencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<DashboardIntelligenceState | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadInsights(tenantId);
  }, [tenantId]);

  const loadInsights = async (tenantId: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const since = subDays(new Date(), 30);

      const [metricsRes, personaRes] = await Promise.all([
        supabase
          .from('sales_script_metrics')
          .select(
            `
              script_version_id,
              metric_date,
              usages,
              successful_outcomes,
              total_revenue_cents,
              sales_script_versions!inner(title)
            `
          )
          .eq('tenant_id', tenantId)
          .gte('metric_date', formatISO(since, { representation: 'date' })),
        supabase
          .from('contact_psych_profiles')
          .select('snapshot')
          .eq('tenant_id', tenantId)
          .limit(400),
      ]);

      const metricsData = metricsRes.data ?? [];
      const personaData = personaRes.data ?? [];

      let lastMetric: string | null = null;
      const aggregate = new Map<
        string,
        {
          title: string;
          usages: number;
          outcomes: number;
          revenueCents: number;
        }
      >();

      metricsData.forEach((row: any) => {
        if (!row.script_version_id) return;
        const existing = aggregate.get(row.script_version_id) ?? {
          title: row.sales_script_versions?.title ?? 'Untitled Script',
          usages: 0,
          outcomes: 0,
          revenueCents: 0,
        };

        existing.usages += row.usages ?? 0;
        existing.outcomes += row.successful_outcomes ?? 0;
        existing.revenueCents += row.total_revenue_cents ?? 0;
        aggregate.set(row.script_version_id, existing);

        if (row.metric_date) {
          if (!lastMetric || new Date(row.metric_date) > new Date(lastMetric)) {
            lastMetric = row.metric_date;
          }
        }
      });

      const scripts = Array.from(aggregate.values()).map<ScriptInsight>((value) => ({
        title: value.title,
        usages: value.usages,
        successRate: value.usages > 0 ? (value.outcomes / value.usages) * 100 : 0,
        revenueCents: value.revenueCents,
      }));

      const topPerformer = scripts
        .filter((item) => item.usages >= 5)
        .sort((a, b) => b.successRate - a.successRate)[0];
      const adoptionLeader = scripts.sort((a, b) => b.usages - a.usages)[0];
      const revenueLeader = scripts.sort((a, b) => b.revenueCents - a.revenueCents)[0];

      const personaCounts = new Map<string, number>();
      personaData.forEach((row: any) => {
        const tags: string[] = Array.isArray(row.snapshot?.persona_tags)
          ? row.snapshot.persona_tags
          : [];
        tags.forEach((tag) => {
          const normalized = tag.toLowerCase();
          personaCounts.set(normalized, (personaCounts.get(normalized) ?? 0) + 1);
        });
      });

      let leadingPersonaTag: string | null = null;
      if (personaCounts.size > 0) {
        leadingPersonaTag = Array.from(personaCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
      }

      setInsights({
        topPerformer,
        adoptionLeader,
        revenueLeader,
        leadingPersonaTag,
        updatedAt: lastMetric,
      });
    } catch (error) {
      console.error('[DashboardIntelligencePanel] Failed to load', error);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId) {
    return null;
  }

  return (
    <Card className="border border-blue-100 shadow-sm">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Intelligence Signals
          </CardTitle>
          <p className="text-sm text-slate-500">Where coaching time delivers the most impact.</p>
        </div>
        <div className="flex items-center gap-2">
          {insights?.updatedAt && (
            <Badge
              variant="secondary"
              className="text-[11px] bg-blue-50 text-blue-700 border-blue-200"
            >
              Updated {insights.updatedAt}
            </Badge>
          )}
          <Button size="sm" className="gap-1" variant="outline" onClick={onOpenCoaching}>
            <Bot className="h-4 w-4" />
            Launch Coaching
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <InsightCard
          icon={<Target className="h-5 w-5 text-emerald-600" />}
          title="Top performer"
          primary={loading ? 'Loading…' : insights?.topPerformer?.title || 'Need more data'}
          helper={
            insights?.topPerformer
              ? `${format.percent(insights.topPerformer.successRate / 100)} win rate · ${format.number(insights.topPerformer.usages)} uses`
              : 'Log new call outcomes to unlock conversion insights'
          }
        />
        <InsightCard
          icon={<Activity className="h-5 w-5 text-orange-600" />}
          title="Most adopted"
          primary={loading ? 'Loading…' : insights?.adoptionLeader?.title || 'Need more data'}
          helper={
            insights?.adoptionLeader
              ? `${format.number(insights.adoptionLeader.usages)} interactions past 30 days`
              : 'Coach teams to record their conversations consistently'
          }
        />
        <InsightCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          title="Revenue driver"
          primary={loading ? 'Loading…' : insights?.revenueLeader?.title || 'Need more data'}
          helper={
            insights?.revenueLeader
              ? `${format.currency(insights.revenueLeader.revenueCents / 100)} influenced`
              : 'Outcome tracking enables revenue visibility'
          }
        />
        <InsightCard
          icon={<Lightbulb className="h-5 w-5 text-purple-600" />}
          title="Dominant persona"
          primary={
            loading
              ? 'Loading…'
              : insights?.leadingPersonaTag
                ? insights.leadingPersonaTag.replace(/_/g, ' ')
                : 'Needs more AI runs'
          }
          helper={
            insights?.leadingPersonaTag
              ? 'Align scripts and objections to this mindset'
              : 'Refresh persona insights to guide tone and pacing'
          }
        />
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  primary: string;
  helper: string;
}

function InsightCard({ icon, title, primary, helper }: InsightCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{primary}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500 leading-relaxed">{helper}</p>
    </div>
  );
}
