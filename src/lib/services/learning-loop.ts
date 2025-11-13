import { endOfDay, formatISO, startOfDay, subDays } from 'date-fns';
import { createServiceClient } from '@/lib/supabase-server';

type LearningLoopRunOptions = {
  tenantId: string;
  targetDate?: Date;
};

type ScriptMetricAccumulator = {
  scriptVersionId: string;
  scriptId?: string;
  usages: number;
  impressions: number;
  helpful: number;
  outcomes: number;
  revenueCents: number;
};

export async function runLearningLoop(options: LearningLoopRunOptions) {
  const supabase = createServiceClient();
  const targetDate = options.targetDate ? new Date(options.targetDate) : subDays(new Date(), 1);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const metricDate = formatISO(dayStart, { representation: 'date' });

  const { data: scriptUsages, error: usageError } = await supabase
    .from('sales_script_usages')
    .select('id, script_id, script_version_id, helpful, metadata')
    .eq('tenant_id', options.tenantId)
    .gte('used_at', dayStart.toISOString())
    .lt('used_at', dayEnd.toISOString());

  if (usageError) {
    throw usageError;
  }

  const accumulator = new Map<string, ScriptMetricAccumulator>();
  const usageById = new Map<string, { scriptVersionId: string; scriptId?: string }>();

  for (const usage of scriptUsages ?? []) {
    if (!usage.script_version_id) {
      continue;
    }

    const existing = accumulator.get(usage.script_version_id) ?? {
      scriptVersionId: usage.script_version_id,
      scriptId: usage.script_id ?? undefined,
      usages: 0,
      impressions: 0,
      helpful: 0,
      outcomes: 0,
      revenueCents: 0,
    };

    existing.usages += 1;
    const impressions =
      typeof usage.metadata?.impressions === 'number'
        ? usage.metadata.impressions
        : existing.impressions + 1;
    existing.impressions = impressions;

    if (usage.helpful) {
      existing.helpful += 1;
    }

    accumulator.set(usage.script_version_id, existing);
    usageById.set(usage.id, {
      scriptVersionId: usage.script_version_id,
      scriptId: usage.script_id ?? undefined,
    });
  }

  const { data: outcomes, error: outcomeError } = await supabase
    .from('conversation_outcomes')
    .select(
      `
        usage_id,
        outcome_type,
        revenue_cents,
        occurred_at
      `
    )
    .eq('tenant_id', options.tenantId)
    .gte('occurred_at', dayStart.toISOString())
    .lt('occurred_at', dayEnd.toISOString());

  if (outcomeError) {
    throw outcomeError;
  }

  for (const outcome of outcomes ?? []) {
    if (!outcome.usage_id) {
      continue;
    }

    const linkage = usageById.get(outcome.usage_id);
    if (!linkage) {
      continue;
    }

    const metrics = accumulator.get(linkage.scriptVersionId);
    if (!metrics) {
      continue;
    }

    if (outcome.outcome_type === 'deal_won' || outcome.outcome_type === 'appointment_booked') {
      metrics.outcomes += 1;
    }
    metrics.revenueCents += outcome.revenue_cents ?? 0;
    accumulator.set(linkage.scriptVersionId, metrics);
  }

  const rows = Array.from(accumulator.values()).map((metrics) => ({
    tenant_id: options.tenantId,
    script_id: metrics.scriptId ?? null,
    script_version_id: metrics.scriptVersionId,
    metric_date: metricDate,
    impressions: metrics.impressions,
    usages: metrics.usages,
    successful_outcomes: metrics.outcomes,
    total_revenue_cents: metrics.revenueCents,
    average_handle_seconds: null,
    sentiment_shift: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('sales_script_metrics')
      .upsert(rows, { onConflict: 'tenant_id,script_version_id,metric_date' });

    if (upsertError) {
      throw upsertError;
    }
  }

  return {
    tenantId: options.tenantId,
    metricDate,
    processedScripts: rows.length,
  };
}
