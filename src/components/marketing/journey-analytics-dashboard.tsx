'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface JourneyAnalytics {
  journeyId: string
  journeyName: string
  totalEntered: number
  currentlyActive: number
  totalCompleted: number
  totalFailed: number
  goalsAchieved: number
  completionRate: number
  goalConversionRate: number
  avgCompletionTimeHours: number
  stepAnalytics: {
    stepIndex: number
    stepType: string
    stepName: string
    totalExecutions: number
    successRate: number
    avgExecutionTimeMs: number
  }[]
}

export function JourneyAnalyticsDashboard({ journeyId }: { journeyId: string }) {
  const [analytics, setAnalytics] = useState<JourneyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [journeyId])

  const loadAnalytics = async () => {
    try {
      const supabase = createClient()

      // Get journey analytics from view
      const { data: journeyData } = await supabase
        .from('journey_analytics')
        .select('*')
        .eq('journey_id', journeyId)
        .single()

      // Get step analytics
      const { data: stepData } = await supabase
        .from('journey_step_analytics')
        .select('*')
        .eq('journey_id', journeyId)
        .order('step_index', { ascending: true })

      if (journeyData) {
        setAnalytics({
          journeyId: journeyData.journey_id,
          journeyName: journeyData.journey_name,
          totalEntered: journeyData.total_entered || 0,
          currentlyActive: journeyData.currently_active || 0,
          totalCompleted: journeyData.total_completed || 0,
          totalFailed: journeyData.total_failed || 0,
          goalsAchieved: journeyData.goals_achieved || 0,
          completionRate: journeyData.completion_rate || 0,
          goalConversionRate: journeyData.goal_conversion_rate || 0,
          avgCompletionTimeHours: journeyData.avg_completion_time_hours || 0,
          stepAnalytics: stepData || []
        })
      }
    } catch (error) {
      console.error('[JOURNEY] Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p>No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Entered</p>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalEntered.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Contacts started journey</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Currently Active</p>
              <Zap className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{analytics.currentlyActive.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">In progress now</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Completed</p>
              <CheckCircle2 className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-green-600">{analytics.totalCompleted.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">{analytics.completionRate.toFixed(1)}% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Goals Achieved</p>
              <Target className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{analytics.goalsAchieved.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">{analytics.goalConversionRate.toFixed(1)}% conversion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journey Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.stepAnalytics.map((step, index) => {
              const dropoffRate = index > 0 
                ? ((analytics.stepAnalytics[index - 1].totalExecutions - step.totalExecutions) / analytics.stepAnalytics[index - 1].totalExecutions) * 100
                : 0

              return (
                <div key={step.stepIndex} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{step.stepIndex + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{step.stepName || step.stepType}</p>
                        <p className="text-xs text-gray-600">{step.totalExecutions.toLocaleString()} contacts</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {step.successRate.toFixed(1)}% success
                      </Badge>
                      {dropoffRate > 0 && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {dropoffRate.toFixed(1)}% drop-off
                        </p>
                      )}
                    </div>
                  </div>
                  <Progress value={(step.totalExecutions / analytics.totalEntered) * 100} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Average Time to Complete</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.avgCompletionTimeHours < 1 
                ? `${(analytics.avgCompletionTimeHours * 60).toFixed(0)} min`
                : analytics.avgCompletionTimeHours < 24
                ? `${analytics.avgCompletionTimeHours.toFixed(1)} hrs`
                : `${(analytics.avgCompletionTimeHours / 24).toFixed(1)} days`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Success Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.totalEntered > 0 
                ? ((analytics.totalCompleted / analytics.totalEntered) * 100).toFixed(1)
                : 0}%
            </p>
            <div className="flex items-center gap-1 mt-2">
              {analytics.completionRate > 70 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">Excellent performance</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs text-yellow-600">Room for improvement</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

