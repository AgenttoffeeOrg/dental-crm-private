'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp, Mail, CheckSquare, DollarSign, Sparkles } from 'lucide-react'

export function AIAnalyticsTab({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [stats, setStats] = useState({
    totalQueries: 0,
    totalDrafts: 0,
    draftsSent: 0,
    draftsEdited: 0,
    tasksCreated: 0,
    avgResponseTime: 0,
    totalTokensUsed: 0,
    estimatedCost: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch usage analytics
      const { data: usage } = await supabase
        .from('ai_usage_analytics')
        .select('*')
        .eq('tenant_id', tenantId)

      // Fetch email drafts
      const { data: drafts } = await supabase
        .from('ai_email_drafts')
        .select('*')
        .eq('tenant_id', tenantId)

      const totalQueries = usage?.length || 0
      const totalTokensUsed = usage?.reduce((sum, u) => sum + (u.tokens_used || 0), 0) || 0
      const avgResponseTime = usage && usage.length > 0
        ? usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / usage.length
        : 0

      const totalDrafts = drafts?.length || 0
      const draftsSent = drafts?.filter(d => d.status === 'sent').length || 0
      const draftsEdited = drafts?.filter(d => d.status === 'edited').length || 0

      // Estimate cost (GPT-4 Turbo: ~$0.01 per 1k input tokens, $0.03 per 1k output tokens)
      // Rough estimate: $0.02 per 1k tokens average
      const estimatedCost = (totalTokensUsed / 1000) * 0.02

      setStats({
        totalQueries,
        totalDrafts,
        draftsSent,
        draftsEdited,
        tasksCreated: 0, // TODO: Track from ai_usage_analytics
        avgResponseTime,
        totalTokensUsed,
        estimatedCost
      })

    } catch (error) {
      console.error('Error loading AI analytics:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Assistant Analytics
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Track AI usage, performance, and value delivered
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-600">Questions Asked</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-600">Drafts Generated</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalDrafts}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.draftsSent} sent, {stats.draftsEdited} edited
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-gray-600">Avg Response</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgResponseTime > 0 ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-gray-600">Estimated Cost</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              £{stats.estimatedCost.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(stats.totalTokensUsed / 1000).toFixed(1)}k tokens
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Performance Metrics</CardTitle>
          <CardDescription>How your AI assistant is performing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Draft Acceptance Rate</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalDrafts > 0 
                  ? `${((stats.draftsSent / stats.totalDrafts) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {stats.draftsSent} drafts sent without changes
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-900 mb-1">Time Saved</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.floor(stats.totalDrafts * 10 / 60)}h {(stats.totalDrafts * 10) % 60}m
              </div>
              <div className="text-xs text-green-700 mt-1">
                Est. ~10 min saved per draft
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-900">ROI Estimate</span>
              <Badge className="bg-purple-600">High Value</Badge>
            </div>
            <p className="text-xs text-purple-800">
              If AI helps close just ONE additional £10,000 deal per month, it pays for itself 50x over!
            </p>
            <div className="mt-3 text-sm text-purple-900">
              <strong>Current Value Delivered:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• {stats.totalDrafts} email drafts (saved ~{Math.floor(stats.totalDrafts * 10 / 60)} hours)</li>
                <li>• {stats.totalQueries} questions answered instantly</li>
                <li>• Continuous deal monitoring & prioritization</li>
                <li>• Smart insights from {stats.totalTokensUsed > 0 ? `${(stats.totalTokensUsed / 1000).toFixed(0)}k` : '0'} tokens analyzed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Transparency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>GPT-4 Turbo Rate:</span>
              <span className="font-medium">~£0.02 per 1k tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Total Tokens Used:</span>
              <span className="font-medium">{(stats.totalTokensUsed / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between">
              <span>Average per Query:</span>
              <span className="font-medium">
                {stats.totalQueries > 0 
                  ? `${(stats.totalTokensUsed / stats.totalQueries / 1000).toFixed(1)}k tokens`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="border-t border-orange-200 pt-2 mt-2 flex justify-between text-base font-semibold">
              <span>Estimated Total Cost:</span>
              <span className="text-orange-700">£{stats.estimatedCost.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-orange-800 mt-4">
            💡 This is a small investment for the value delivered. Most practices see 3-5x ROI from improved conversion rates alone!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

