'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, FileText, Layers } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/ui/metric-card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import type { CompetitorInsightsPayload, CompetitorInsightRow } from '@/lib/services/competitor-insights'

function formatCurrency(cents?: number | null) {
  if (typeof cents !== 'number') return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    cents / 100
  )
}

function formatDelta(delta?: number | null) {
  if (typeof delta !== 'number') return '—'
  const formatted = formatCurrency(Math.abs(delta))
  return delta === 0 ? formatted : `${delta > 0 ? '+' : '-'}${formatted}`
}

function deltaColor(delta?: number | null) {
  if (typeof delta !== 'number') return 'text-gray-500'
  if (delta > 0) return 'text-red-600'
  if (delta < 0) return 'text-emerald-600'
  return 'text-gray-600'
}

export function CompetitiveInsightsDashboard({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CompetitorInsightsPayload | null>(null)

  useEffect(() => {
    if (!tenantId) return
    loadData()
  }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics/competitors')
      if (!response.ok) {
        throw new Error('Failed to load competitor insights')
      }
      const payload = await response.json()
      setData(payload.data)
    } catch (err: any) {
      console.error('[Competitive Insights] failed', err)
      setError(err?.message || 'Failed to load competitor insights')
    } finally {
      setLoading(false)
    }
  }

  const topDeltas = useMemo(() => {
    if (!data) return []
    const entries: Array<{ name: string; treatment: string; delta: number }> = []
    data.competitors.forEach((competitor) => {
      competitor.latestPrices.forEach((price) => {
        if (typeof price.deltaCents === 'number') {
          entries.push({
            name: competitor.name,
            treatment: price.treatmentName ?? 'General',
            delta: price.deltaCents,
          })
        }
      })
    })

    return entries
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8)
      .map((entry) => ({
        label: `${entry.name} • ${entry.treatment}`,
        delta: Math.round(entry.delta / 100),
      }))
  }, [data])

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          Select a tenant to view competitive insights.
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <LoadingState message="Loading competitor insights..." size="lg" />
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Failed to load competitor insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" onClick={loadData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          No competitor insights available yet. Ingest data to begin tracking.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Competitors"
          value={data.summary.totalCompetitors.toString()}
          icon={BarChart3}
          trend="neutral"
        />
        <MetricCard
          title="Avg Price Delta"
          value={formatCurrency(data.summary.avgPriceDelta)}
          icon={ArrowUpRight}
          trend={data.summary.avgPriceDelta > 0 ? 'up' : data.summary.avgPriceDelta < 0 ? 'down' : 'neutral'}
          change={
            data.summary.avgPriceDelta !== 0
              ? {
                  value: data.summary.avgPriceDelta > 0 ? 'Competitors trending higher' : 'Competitors trending lower',
                  color: data.summary.avgPriceDelta > 0 ? 'text-red-600' : 'text-emerald-600',
                }
              : undefined
          }
        />
        <MetricCard
          title="Touchpoints (30d)"
          value={data.summary.totalTouchpoints30.toString()}
          icon={Layers}
          trend="neutral"
        />
        <MetricCard
          title="Most Active Competitor"
          value={data.summary.topCompetitor || '—'}
          icon={FileText}
          trend="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Top Price Movements</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {topDeltas.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No price deltas recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDeltas} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={220}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value: number) => `$${value}`} labelFormatter={() => ''} />
                  <Bar dataKey="delta" fill="#6366f1" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Touchpoints by Type (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.touchpointsByType.length === 0 ? (
              <p className="text-sm text-gray-500">No competitor touchpoints logged in the last 30 days.</p>
            ) : (
              data.touchpointsByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 capitalize">{item.type.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Competitor Price Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.competitors.length === 0 ? (
            <p className="text-sm text-gray-500">No competitors tracked yet.</p>
          ) : (
            data.competitors.map((competitor) => (
              <CompetitorRow key={competitor.id} competitor={competitor} />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Ingestion Jobs</CardTitle>
          <Button variant="outline" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentJobs.length === 0 ? (
            <p className="text-sm text-gray-500">No ingestion jobs logged yet.</p>
          ) : (
            data.recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{job.sourceName}</p>
                  <p className="text-xs text-gray-500">Started {formatRelative(job.startedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 md:mt-0 md:items-center">
                  <Badge variant="outline" className="capitalize">
                    {job.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Rows: {job.rows ?? '—'}
                  </span>
                  {typeof job.failures === 'number' && (
                    <span className={job.failures > 0 ? 'text-xs text-red-600' : 'text-xs text-emerald-600'}>
                      {job.failures > 0 ? `${job.failures} failure(s)` : 'No failures'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CompetitorRow({ competitor }: { competitor: CompetitorInsightRow }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{competitor.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {competitor.website && (
              <a href={competitor.website} target="_blank" rel="noreferrer" className="underline">
                {competitor.website}
              </a>
            )}
            {competitor.touchpointsLast30 > 0 && (
              <Badge variant="secondary">{competitor.touchpointsLast30} touchpoints</Badge>
            )}
            {competitor.lastPriceUpdate && (
              <span>Last price update {formatRelative(competitor.lastPriceUpdate)}</span>
            )}
          </div>
        </div>
        {competitor.notes && <p className="max-w-md text-sm text-gray-600">{competitor.notes}</p>}
      </div>

      {competitor.latestPrices.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {competitor.latestPrices.map((price, index) => (
            <div key={index} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-500">{price.treatmentName || 'General'}</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(price.priceCents)}</p>
              {typeof price.deltaCents === 'number' && price.previousPriceCents != null && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {price.deltaCents > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-red-600" />
                  ) : price.deltaCents < 0 ? (
                    <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                  ) : null}
                  <span className={deltaColor(price.deltaCents)}>{formatDelta(price.deltaCents)} vs. last</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">No pricing data recorded yet.</p>
      )}
    </div>
  )
}

function formatRelative(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString()
}
