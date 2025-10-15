'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  Target,
  RefreshCw
} from 'lucide-react'
import { generateDashboardInsights, type Insight } from '@/lib/ai-insights'
import Link from 'next/link'

interface AIInsightsWidgetProps {
  tenantId: string
}

export function AIInsightsWidget({ tenantId }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (tenantId) {
      loadInsights()
    }
  }, [tenantId])

  const loadInsights = async () => {
    setLoading(true)
    try {
      const data = await generateDashboardInsights(tenantId)
      setInsights(data)
    } catch (error) {
      console.error('[AIInsights] Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return TrendingUp
      case 'warning': return AlertTriangle
      case 'opportunity': return Target
      default: return Info
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-700'
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-700'
      case 'opportunity': return 'bg-blue-50 border-blue-200 text-blue-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Insights
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Info className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600">
              No insights available yet. Keep adding data to get personalized recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Insights
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh insights"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => {
            const Icon = getInsightIcon(insight.type)
            return (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <Badge 
                        variant={getImpactBadge(insight.impact)} 
                        className="shrink-0 text-xs"
                      >
                        {insight.impact}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{insight.description}</p>
                    {insight.action && (
                      <Link href={insight.action.url}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          {insight.action.label}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

