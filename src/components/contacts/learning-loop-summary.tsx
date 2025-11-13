import { useEffect, useState } from 'react';
import { formatISO, subDays } from 'date-fns';
import { Activity, Flame, TrendingUp, Trophy } from 'lucide-react';

import { createClient } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from '@/lib/formatting';

type ScriptSummary = {
  title: string;
  successRate: number;
  usages: number;
  revenueCents: number;
};

type LearningLoopSummary = {
  topPerformer?: ScriptSummary;
  adoptionLeader?: ScriptSummary;
  revenueLeader?: ScriptSummary;
  lastMetricDate?: string | null;
};

interface LearningLoopSummaryProps {
  tenantId?: string | null;
  onOpenCoaching: () => void;
}

export function LearningLoopSummary({ tenantId, onOpenCoaching }: LearningLoopSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<LearningLoopSummary | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadSummary(tenantId);
  }, [tenantId]);

  const loadSummary = async (tenantId: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const since = subDays(new Date(), 30);

      const { data, error } = await supabase
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
        .gte('metric_date', formatISO(since, { representation: 'date' }));

      if (error) throw error;
      if (!data?.length) {
        setSummary(null);
        return;
      }

      const aggregate = new Map<
        string,
        {
          title: string;
          usages: number;
          outcomes: number;
          revenueCents: number;
        }
      >();
      let lastMetric: string | null = null;

      data.forEach((row: any) => {
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

      const summaries = Array.from(aggregate.values()).map<ScriptSummary>((value) => ({
        title: value.title,
        usages: value.usages,
        successRate: value.usages > 0 ? (value.outcomes / value.usages) * 100 : 0,
        revenueCents: value.revenueCents,
      }));

      const topPerformer = summaries
        .filter((item) => item.usages >= 3)
        .sort((a, b) => b.successRate - a.successRate)[0];

      const adoptionLeader = summaries.sort((a, b) => b.usages - a.usages)[0];
      const revenueLeader = summaries.sort((a, b) => b.revenueCents - a.revenueCents)[0];

      setSummary({
        topPerformer,
        adoptionLeader,
        revenueLeader,
        lastMetricDate: lastMetric,
      });
    } catch (error) {
      console.error('[LearningLoopSummary] Failed to load summary', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId) {
    return null;
  }

  return (
    <Card className="border-blue-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Learning Loop Signals
          </p>
          <h3 className="text-sm font-semibold text-slate-900">
            What&apos;s working across your team
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {summary?.lastMetricDate && (
            <Badge
              variant="secondary"
              className="text-[11px] bg-blue-50 text-blue-700 border-blue-200"
            >
              Updated {summary.lastMetricDate}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={onOpenCoaching}
          >
            <Activity className="h-3.5 w-3.5" />
            Open Coaching
          </Button>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
        <LearningChip
          icon={<Trophy className="h-4 w-4 text-emerald-600" />}
          label="Top conversion script"
          primary={summary?.topPerformer?.title || 'Need more data'}
          helper={
            summary?.topPerformer
              ? `${format.percent(summary.topPerformer.successRate / 100)} win rate`
              : 'Log recent calls to see performance'
          }
          loading={loading}
        />
        <LearningChip
          icon={<Flame className="h-4 w-4 text-orange-600" />}
          label="Most adopted"
          primary={summary?.adoptionLeader?.title || 'Need more data'}
          helper={
            summary?.adoptionLeader
              ? `${format.number(summary.adoptionLeader.usages)} uses past 30 days`
              : 'Coach teams to record their work'
          }
          loading={loading}
        />
        <LearningChip
          icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
          label="Revenue driver"
          primary={summary?.revenueLeader?.title || 'Need more data'}
          helper={
            summary?.revenueLeader
              ? format.currency(summary.revenueLeader.revenueCents / 100)
              : 'Outcome logging will unlock revenue intel'
          }
          loading={loading}
        />
      </div>
    </Card>
  );
}

interface LearningChipProps {
  icon: React.ReactNode;
  label: string;
  primary: string;
  helper: string;
  loading: boolean;
}

function LearningChip({ icon, label, primary, helper, loading }: LearningChipProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase tracking-wide">
        <span>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{loading ? 'Loading…' : primary}</p>
      <p className="text-xs text-slate-500 mt-1">{loading ? 'Just a moment' : helper}</p>
    </div>
  );
}
