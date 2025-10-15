'use client'

/**
 * Goal Tracking Dashboard
 * 
 * Set and track progress toward business goals
 * 
 * Features:
 * - Set goals for any KPI (revenue, deals, conversion rate, etc.)
 * - Visual progress bars
 * - Target vs actual comparison
 * - Alert when off-track
 * - Monthly/quarterly/annual goals
 * - Historical goal achievement
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Target, TrendingUp, TrendingDown, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface Goal {
  id: string
  name: string
  metric: string
  target: number
  current: number
  period: 'month' | 'quarter' | 'year'
  startDate: string
  endDate: string
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved'
}

export function GoalTrackingDashboard({ tenantId }: { tenantId?: string }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  useEffect(() => {
    if (tenantId) {
      loadGoals()
    }
  }, [tenantId])
  
  const loadGoals = async () => {
    // Simulated data - in production, load from database
    setGoals([
      {
        id: '1',
        name: 'Monthly Revenue',
        metric: 'revenue',
        target: 150000,
        current: 127500,
        period: 'month',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'on_track',
      },
      {
        id: '2',
        name: 'New Patients',
        metric: 'contacts',
        target: 50,
        current: 42,
        period: 'month',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'on_track',
      },
      {
        id: '3',
        name: 'Conversion Rate',
        metric: 'conversion_rate',
        target: 5,
        current: 3.8,
        period: 'month',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'at_risk',
      },
      {
        id: '4',
        name: 'Marketing ROI',
        metric: 'marketing_roi',
        target: 400,
        current: 325,
        period: 'quarter',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        status: 'behind',
      },
    ])
    setLoading(false)
  }
  
  const getProgressPercentage = (goal: Goal) => {
    return Math.min((goal.current / goal.target) * 100, 100)
  }
  
  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'on_track':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'behind':
        return 'bg-red-100 text-red-800 border-red-300'
    }
  }
  
  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'achieved':
      case 'on_track':
        return <TrendingUp className="h-4 w-4" />
      case 'at_risk':
        return <AlertCircle className="h-4 w-4" />
      case 'behind':
        return <TrendingDown className="h-4 w-4" />
    }
  }
  
  const formatValue = (metric: string, value: number) => {
    if (metric === 'revenue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value)
    }
    if (metric.includes('rate') || metric.includes('roi')) {
      return `${value.toFixed(1)}%`
    }
    return value.toString()
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Goal Tracking</h2>
          <p className="text-sm text-gray-600">Monitor progress toward your targets</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>
      
      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = getProgressPercentage(goal)
          
          return (
            <Card key={goal.id} className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                    <p className="text-xs text-gray-600 capitalize">{goal.period}ly Goal</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStatusColor(goal.status)}`}>
                    {getStatusIcon(goal.status)}
                    <span className="ml-1 capitalize">{goal.status.replace('_', ' ')}</span>
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current</span>
                  <span className="font-bold text-lg">{formatValue(goal.metric, goal.current)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Target</span>
                  <span className="font-semibold">{formatValue(goal.metric, goal.target)}</span>
                </div>
              </div>
              
              {/* Remaining */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Remaining</span>
                  <span className={`font-semibold ${
                    goal.current >= goal.target ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {goal.current >= goal.target 
                      ? '🎉 Goal Achieved!' 
                      : formatValue(goal.metric, goal.target - goal.current)
                    }
                  </span>
                </div>
              </div>
              
              {/* Alert */}
              {goal.status === 'behind' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800">
                    <strong>Action needed:</strong> You're {progress.toFixed(0)}% to goal with limited time remaining.
                  </p>
                </div>
              )}
              
              {goal.status === 'at_risk' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Watch closely:</strong> Progress is slower than expected for this period.
                  </p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      
      {goals.length === 0 && (
        <Card className="p-12 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Goals Set</h3>
          <p className="text-sm text-gray-600 mb-4">
            Start tracking your progress by creating your first goal
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Goal
          </Button>
        </Card>
      )}
    </div>
  )
}

