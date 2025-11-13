'use client';

import { useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Target, TrendingUp, Users } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';

type ScriptMetricRow = {
  script_version_id: string;
  script_id?: string | null;
  title?: string;
  trigger_type?: string | null;
  usages: number;
  successful_outcomes: number;
  total_revenue_cents: number;
};

type PersonaAggregate = {
  tag: string;
  count: number;
};

type StageMetric = {
  pipeline_name: string;
  stage_name: string;
  current_deals: number;
  total_value_cents: number;
  avg_time_in_stage_days: number;
};

type Summary = {
  totalDeals: number;
  dealsWon: number;
  conversionRate: number;
  pipelineValueCents: number;
  avgDealSizeCents: number;
};

export function ConversionIntelligenceDashboard({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [scripts, setScripts] = useState<ScriptMetricRow[]>([]);
  const [personaTags, setPersonaTags] = useState<PersonaAggregate[]>([]);
  const [stageMetrics, setStageMetrics] = useState<StageMetric[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      await Promise.all([
        loadSummary(tenantId),
        loadScriptMetrics(tenantId),
        loadPersonaSignals(tenantId),
        loadStageMetrics(tenantId),
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[Conversion Intelligence] Failed to load', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (tenantId: string) => {
    const supabase = createClient();
    const start = subDays(new Date(), 30).toISOString();
    const { data } = await supabase
      .from('deals')
      .select('id, value_estimate_cents, status, stage:pipeline_stages(name), created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', start);

    if (!data) {
      setSummary(null);
      return;
    }

    let totalDeals = 0;
    let dealsWon = 0;
    let pipelineValue = 0;
    let wonValue = 0;

    data.forEach((deal: any) => {
      totalDeals += 1;
      pipelineValue += deal.value_estimate_cents || 0;
      const stageName = deal.stage?.name?.toLowerCase() ?? '';
      const isWon =
        deal.status === 'won' || stageName.includes('won') || stageName.includes('closed');
      if (isWon) {
        dealsWon += 1;
        wonValue += deal.value_estimate_cents || 0;
      }
    });

    const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
    const avgDealSize = dealsWon > 0 ? wonValue / dealsWon : 0;

    setSummary({
      totalDeals,
      dealsWon,
      conversionRate,
      pipelineValueCents: pipelineValue,
      avgDealSizeCents: avgDealSize,
    });
  };

  const loadScriptMetrics = async (tenantId: string) => {
    const supabase = createClient();
    const startDate = subDays(new Date(), 30);
    const { data } = await supabase
      .from('sales_script_metrics')
      .select(
        `
          script_version_id,
          script_id,
          metric_date,
          usages,
          successful_outcomes,
          total_revenue_cents,
          sales_script_versions!inner(
            title,
            trigger_type
          )
        `
      )
      .eq('tenant_id', tenantId)
      .gte('metric_date', formatISO(startDate, { representation: 'date' }));

    if (!data) {
      setScripts([]);
      return;
    }

    const aggregate = new Map<string, ScriptMetricRow>();

    data.forEach((row: any) => {
      const key = row.script_version_id;
      if (!key) return;

      const existing = aggregate.get(key) ?? {
        script_version_id: key,
        script_id: row.script_id ?? null,
        title: row.sales_script_versions?.title ?? 'Untitled Script',
        trigger_type: row.sales_script_versions?.trigger_type ?? null,
        usages: 0,
        successful_outcomes: 0,
        total_revenue_cents: 0,
      };

      existing.usages += row.usages ?? 0;
      existing.successful_outcomes += row.successful_outcomes ?? 0;
      existing.total_revenue_cents += row.total_revenue_cents ?? 0;
      aggregate.set(key, existing);
    });

    setScripts(
      Array.from(aggregate.values()).sort((a, b) => {
        const aRate = a.usages > 0 ? a.successful_outcomes / a.usages : 0;
        const bRate = b.usages > 0 ? b.successful_outcomes / b.usages : 0;
        return bRate - aRate;
      })
    );
  };

  const loadPersonaSignals = async (tenantId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('contact_psych_profiles')
      .select('snapshot')
      .eq('tenant_id', tenantId)
      .limit(500);

    if (!data) {
      setPersonaTags([]);
      return;
    }

    const tagCounts = new Map<string, number>();
    data.forEach((row: any) => {
      const tags: string[] = Array.isArray(row.snapshot?.persona_tags)
        ? row.snapshot.persona_tags
        : [];
      tags.forEach((tag) => {
        const normalized = tag.toLowerCase();
        tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
      });
    });

    const aggregates = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    setPersonaTags(aggregates);
  };

  const loadStageMetrics = async (tenantId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('crm_pipeline_stage_analytics')
      .select('pipeline_name, stage_name, current_deals, total_value_cents, avg_days_in_stage')
      .eq('tenant_id', tenantId)
      .order('avg_days_in_stage', { ascending: false })
      .limit(12);

    if (!data) {
      setStageMetrics([]);
      return;
    }

    setStageMetrics(
      data.map((row: any) => ({
        pipeline_name: row.pipeline_name ?? 'Pipeline',
        stage_name: row.stage_name ?? 'Stage',
        current_deals: row.current_deals ?? 0,
        total_value_cents: row.total_value_cents ?? 0,
        avg_time_in_stage_days: Math.round(row.avg_days_in_stage ?? 0),
      }))
    );
  };

  const bestScript = useMemo(() => {
    if (scripts.length === 0) return null;
    const [top] = scripts;
    const successRate = top.usages > 0 ? (top.successful_outcomes / top.usages) * 100 : 0;
    return {
      title: top.title ?? 'Untitled Script',
      trigger: top.trigger_type ?? 'universal',
      successRate,
      wins: top.successful_outcomes,
    };
  }, [scripts]);

  const totalScriptRevenue = useMemo(
    () => scripts.reduce((sum, script) => sum + script.total_revenue_cents, 0),
    [scripts]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading conversion intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Sales Performance & Conversion Intelligence
          </h2>
          <p className="text-sm text-gray-600">
            Insight into win rates, script performance, and persona signals across the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ExportButton
            data={scripts}
            filename="conversion-intelligence"
            title="Conversion Intelligence Metrics"
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Pipeline Value"
            value={formatCurrency(summary.pipelineValueCents)}
            icon={TrendingUp}
            iconColor="text-indigo-600"
            context={`${summary.totalDeals} active deals`}
          />
          <MetricCard
            title="Win Rate"
            value={`${summary.conversionRate.toFixed(1)}%`}
            icon={Target}
            iconColor="text-blue-600"
            context={`${summary.dealsWon} deals won`}
          />
          <MetricCard
            title="Avg Closed Deal"
            value={formatCurrency(summary.avgDealSizeCents)}
            icon={Users}
            iconColor="text-green-600"
            context="Average revenue per won deal"
          />
          <MetricCard
            title="Script-Driven Revenue"
            value={formatCurrency(totalScriptRevenue)}
            icon={Download}
            iconColor="text-purple-600"
            context="Revenue attributed to tracked scripts"
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            {scripts.length === 0 ? (
              <p className="text-sm text-gray-600">No script usage recorded in the last 30 days.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={scripts.slice(0, 6).map((script) => ({
                    name: script.title?.slice(0, 28) ?? 'Script',
                    successRate:
                      script.usages > 0 ? (script.successful_outcomes / script.usages) * 100 : 0,
                    wins: script.successful_outcomes,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successRate" fill="#6366f1" name="Success Rate (%)" />
                  <Bar dataKey="wins" fill="#34d399" name="Wins" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Velocity & Value</CardTitle>
          </CardHeader>
          <CardContent>
            {stageMetrics.length === 0 ? (
              <p className="text-sm text-gray-600">No pipeline data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={stageMetrics.slice(0, 10).map((stage) => ({
                    name: `${stage.pipeline_name} • ${stage.stage_name}`.slice(0, 36),
                    value: stage.total_value_cents / 100,
                    velocity: stage.avg_time_in_stage_days,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    stroke="#818cf8"
                    name="Value (£)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="velocity"
                    stroke="#f97316"
                    name="Days in Stage"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Persona Signals</CardTitle>
          </CardHeader>
          <CardContent>
            {personaTags.length === 0 ? (
              <p className="text-sm text-gray-600">No persona data captured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {personaTags.map((persona) => (
                  <Badge key={persona.tag} variant="secondary" className="text-xs">
                    #{persona.tag} · {persona.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Top Script Insight</CardTitle>
            {bestScript && (
              <Badge variant="outline" className="capitalize">
                {bestScript.trigger.replace(/_/g, ' ')}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {bestScript ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{bestScript.title}</h4>
                  <p className="text-sm text-gray-600">
                    Success rate {bestScript.successRate.toFixed(1)}% · {bestScript.wins} wins
                    recorded
                  </p>
                </div>
                <p className="text-sm text-gray-700">
                  Continue reinforcing this playbook with similar personas and monitor revenue
                  impact via the script metrics panel.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Generate script usage to unlock insights.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 text-right">
          Last refreshed {lastUpdated.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
