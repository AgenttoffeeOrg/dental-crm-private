# Metrics and Analytics

## Philosophy
Analytics are embedded into daily workflows so receptionists measure conversion health, spot anomalies, and understand where to focus without leaving the CRM.

## Core Dashboard Metrics
Revenue, deal counts, contact totals, and task loads refresh in real time via Supabase queries.

```125:170:src/lib/dashboard-analytics.ts
const { data: deals } = await supabase
  .from('deals')
  .select('value_estimate_cents, created_at')
  .eq('tenant_id', tenantId)
const totalRevenue = deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
const thisMonth = new Date()
thisMonth.setDate(1)
const dealsThisMonth = deals.filter(d => new Date(d.created_at) >= thisMonth)
const revenueThisMonth = dealsThisMonth.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
setStats({
  totalRevenue,
  totalContacts: contactsRes.count || 0,
  totalDeals: deals.length,
  activeTasks: tasksRes.count || 0,
  revenueThisMonth,
  revenueLastMonth
})
```

```142:179:src/lib/dashboard-analytics.ts
const { count: totalDeals } = await supabase
  .from('deals')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
const { count: wonDeals } = await supabase
  .from('deals')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('stage_id', wonStageIds)
const rate = (wonDeals / totalDeals) * 100
return Math.round(rate * 10) / 10
```

## Calendar and Capacity Analytics
Appointment dashboards expose provider utilisation, no-show rates, and chair availability.

```39:189:src/components/calendar/calendar-analytics-dashboard.tsx
setStats({
  totalAppointments: total,
  completedAppointments: completed,
  cancelledAppointments: cancelled,
  noShowRate: total > 0 ? (noShows / total) * 100 : 0,
  providerUtilization: Array.from(providerMap.values()),
  operatoryUtilization: Array.from(operatoryMap.values()),
  appointmentsByDay: Array.from(dayMap.entries()).map(([name, value]) => ({
    name,
    appointments: value
  })),
  appointmentsByHour: Array.from(hourMap.entries()).map(([hour, count]) => ({
    hour: format(new Date().setHours(hour), 'ha'),
    appointments: count
  })),
})
```

## AI Insight Generation
Local analytics synthesise conversion, revenue, and lead activity into narrative recommendations.

```29:170:src/lib/ai-insights.ts
if (growth > 20) {
  insights.push({
    id: 'revenue-surge',
    type: 'success',
    title: '🚀 Revenue Surge Detected',
    description: `Revenue is up ${growth.toFixed(1)}% this month! You're on track for a record month.`,
    impact: 'high',
    category: 'revenue',
    confidence: 95
  })
}
if (growth < -20) {
  insights.push({
    id: 'revenue-decline',
    type: 'warning',
    title: '⚠️ Revenue Decline Alert',
    description: `Revenue is down ${Math.abs(growth).toFixed(1)}% this month. Review pipeline and follow up with stalled deals.`,
    action: { label: 'View Pipeline', url: '/pipeline' },
    impact: 'high',
    category: 'revenue',
    confidence: 95
  })
}
```

## Lead Activity & Engagement Scoring
Engagement is scored from activity frequency and recency to prioritise follow-ups.

```178:320:src/lib/conversation-analyzer.ts
const { score: engagementScore, daysSinceLastActivity } = calculateEngagementScore(activities)
const valueDiscussed = allKeywords.value.length > 0
const budgetConcerns = allKeywords.negative.some(k =>
  ['expensive', 'too much', "can't afford", 'budget'].includes(k)
)
let dealHealthScore = 50
dealHealthScore += sentimentScore * 20
dealHealthScore += engagementScore * 0.3
if (urgencyScore > 50) dealHealthScore += 10
if (budgetConcerns) dealHealthScore -= 15
```

## Threshold Alerts and Anomaly Detection
Practices can configure KPI alerts, while anomaly detection uses multiple statistical methods to flag spikes or dips.

```117:147:APPLY_ALL_MIGRATIONS.sql
CREATE TABLE IF NOT EXISTS analytics_threshold_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL,
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('above', 'below', 'between')),
  threshold_value DECIMAL(15, 2) NOT NULL,
  threshold_value_2 DECIMAL(15, 2),
  notification_channels TEXT[] DEFAULT ARRAY['email', 'in_app'],
  recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  slack_webhook_url TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE
);
```

```44:195:src/lib/analytics/anomaly-detection.ts
export function detectAnomaliesZScore(data: DataPoint[]): Anomaly[] {
  if (absZScore > 1.5) {
    anomalies.push({
      date: point.date,
      value: point.value,
      expectedValue: mean,
      deviationPercentage,
      severity,
      method: 'z_score',
      explanation: zScore > 0
        ? `Value is ${absZScore.toFixed(1)} standard deviations ABOVE average (${severity} anomaly)`
        : `Value is ${absZScore.toFixed(1)} standard deviations BELOW average (${severity} anomaly)`
    })
  }
}

export function detectRateOfChangeAnomalies(data: DataPoint[]): Anomaly[] {
  if (Math.abs(changePercentage) > 50 || changePercentage < -30) {
    anomalies.push({
      date: current.date,
      value: current.value,
      expectedValue: previous.value,
      deviationPercentage: changePercentage,
      severity,
      method: 'rate_of_change',
      explanation: changePercentage > 0
        ? `Sudden ${changePercentage.toFixed(1)}% INCREASE from previous period`
        : `Sudden ${Math.abs(changePercentage).toFixed(1)}% DROP from previous period`
    })
  }
}
```

## Automation Telemetry
Automation runs and AI suggestions are logged so teams can tie conversions back to triggered journeys.

```135:175:supabase/migrations/20250116_automations_standalone_tables.sql
CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('running', 'waiting', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
    nodes_completed TEXT[] DEFAULT '{}',
    waiting_until TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_execution_time_ms INTEGER
);
```

## Summary
Embedded dashboards, AI insights, anomaly detectors, and automation telemetry give practices a full feedback loop—from marketing campaigns to chair utilisation. This measurement framework keeps the sales excellence mission accountable, helping teams spot wins, rescue at-risk cases, and iterate on playbooks with data.
