'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertCircle,
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Brain
} from 'lucide-react'
import type { Activity, AIArtifact } from '@/types/database'

interface DealIntelligenceCardProps {
  dealId: string
  contactId: string
  compact?: boolean // For showing on Kanban cards
}

interface DealIntelligence {
  likelihoodScore: number // 0-100
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'high' | 'medium' | 'low'
  nextBestAction: string
  keyInsights: string[]
  conversationCount: number
  lastContactDays: number
}

export function DealIntelligenceCard({ dealId, contactId, compact = false }: DealIntelligenceCardProps) {
  const [intelligence, setIntelligence] = useState<DealIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    analyzeDeal()
  }, [dealId, contactId])

  const analyzeDeal = async () => {
    try {
      setLoading(true)

      // Fetch ALL activities for this deal
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false })

      if (activitiesError) throw activitiesError

      // Fetch ALL AI artifacts related to these activities
      const activityIds = activities?.map(a => a.id) || []
      let aiInsights: AIArtifact[] = []

      if (activityIds.length > 0) {
        const { data: artifacts } = await supabase
          .from('ai_artifacts')
          .select('*')
          .in('activity_id', activityIds)

        aiInsights = artifacts || []
      }

      // Analyze and calculate scores
      const analysis = calculateDealIntelligence(activities || [], aiInsights)
      setIntelligence(analysis)

    } catch (error) {
      console.error('Error analyzing deal:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDealIntelligence = (activities: Activity[], aiInsights: AIArtifact[]): DealIntelligence => {
    // Calculate days since last contact
    const lastActivity = activities[0]
    const lastContactDays = lastActivity 
      ? Math.floor((Date.now() - new Date(lastActivity.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    // Analyze sentiment from AI artifacts
    const sentiments = aiInsights
      .filter(a => a.kind === 'sentiment')
      .map(a => a.content)

    const positiveSentiments = sentiments.filter(s => s.toLowerCase().includes('positive') || s.toLowerCase().includes('enthusiastic') || s.toLowerCase().includes('interested')).length
    const negativeSentiments = sentiments.filter(s => s.toLowerCase().includes('negative') || s.toLowerCase().includes('hesitant') || s.toLowerCase().includes('concerned')).length

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
    if (positiveSentiments > negativeSentiments) sentiment = 'positive'
    else if (negativeSentiments > positiveSentiments) sentiment = 'negative'

    // Analyze urgency
    const urgencyArtifacts = aiInsights.filter(a => a.kind === 'urgency')
    const hasHighUrgency = urgencyArtifacts.some(a => a.content.toLowerCase().includes('high') || a.content.toLowerCase().includes('urgent'))
    const urgency: 'high' | 'medium' | 'low' = hasHighUrgency ? 'high' : activities.length > 5 ? 'medium' : 'low'

    // Calculate likelihood score (0-100)
    let likelihoodScore = 50 // Base score

    // Positive factors
    if (sentiment === 'positive') likelihoodScore += 20
    if (activities.length > 5) likelihoodScore += 10 // Engaged
    if (lastContactDays < 3) likelihoodScore += 15 // Recent contact
    if (urgency === 'high') likelihoodScore += 10 // Urgent needs

    // Negative factors
    if (sentiment === 'negative') likelihoodScore -= 20
    if (lastContactDays > 14) likelihoodScore -= 20 // Cold lead
    if (activities.length < 2) likelihoodScore -= 10 // Low engagement

    likelihoodScore = Math.max(0, Math.min(100, likelihoodScore)) // Clamp 0-100

    // Determine health status
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'fair'
    if (likelihoodScore >= 80) healthStatus = 'excellent'
    else if (likelihoodScore >= 65) healthStatus = 'good'
    else if (likelihoodScore >= 40) healthStatus = 'fair'
    else if (likelihoodScore >= 20) healthStatus = 'poor'
    else healthStatus = 'critical'

    // Determine next best action
    let nextBestAction = 'Follow up with the patient'
    if (lastContactDays > 14) nextBestAction = '🚨 Urgent: Re-engage immediately (cold for 2+ weeks)'
    else if (lastContactDays > 7) nextBestAction = '📞 Call to check progress and answer questions'
    else if (sentiment === 'negative') nextBestAction = '💬 Address concerns and provide reassurance'
    else if (sentiment === 'positive') nextBestAction = '✅ Send treatment plan and schedule consultation'
    else if (urgency === 'high') nextBestAction = '⚡ Priority: Schedule urgent appointment ASAP'
    else if (activities.length < 3) nextBestAction = '📧 Send educational material and build rapport'

    // Extract key insights from AI
    const conversationAnalyses = aiInsights.filter(a => a.kind === 'conversation_analysis')
    const keyInsights: string[] = []
    
    conversationAnalyses.forEach(artifact => {
      try {
        const analysis = typeof artifact.content === 'string' ? JSON.parse(artifact.content) : artifact.content
        if (analysis.pain_points) keyInsights.push(...analysis.pain_points.slice(0, 2))
        if (analysis.call_purpose) keyInsights.push(`Purpose: ${analysis.call_purpose}`)
      } catch (e) {
        // Skip parsing errors
      }
    })

    return {
      likelihoodScore,
      healthStatus,
      sentiment,
      urgency,
      nextBestAction,
      keyInsights: keyInsights.slice(0, 3), // Top 3 insights
      conversationCount: activities.length,
      lastContactDays
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'fair': return 'text-yellow-600 bg-yellow-50'
      case 'poor': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />
      case 'good': return <TrendingUp className="h-4 w-4" />
      case 'fair': return <Target className="h-4 w-4" />
      case 'poor': return <TrendingDown className="h-4 w-4" />
      case 'critical': return <AlertCircle className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="h-3 w-3 text-green-600" />
      case 'negative': return <ThumbsDown className="h-3 w-3 text-red-600" />
      default: return <Target className="h-3 w-3 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <Card className={compact ? "p-2" : ""}>
        <CardContent className={compact ? "p-2" : "p-4"}>
          <div className="flex items-center justify-center py-4">
            <Brain className="h-4 w-4 animate-pulse text-gray-400" />
            <span className="text-xs text-gray-500 ml-2">Analyzing...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!intelligence) return null

  // COMPACT VERSION (for Kanban cards)
  if (compact) {
    return (
      <div className="p-3 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded-lg border-2 border-blue-200 shadow-sm">
        {/* Title */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Brain className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-xs font-bold text-gray-800">Deal Intelligence</span>
        </div>

        {/* Conversion Probability - Centered Stack */}
        <div className="text-center mb-2">
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Conversion Probability
          </div>
          <Badge className={`${getHealthColor(intelligence.healthStatus)} text-2xl font-black px-4 py-1.5`}>
            {intelligence.likelihoodScore}%
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <Progress value={intelligence.likelihoodScore} className="h-2 mb-2" />
        
        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-blue-200">
          <div className="flex items-center gap-1">
            {getSentimentIcon(intelligence.sentiment)}
            <span className="text-gray-700 capitalize font-medium">{intelligence.sentiment}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{intelligence.conversationCount} talks</span>
          </div>
        </div>
      </div>
    )
  }

  // FULL VERSION (for deal details)
  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Deal Intelligence
          </h3>
          <Badge className={`${getHealthColor(intelligence.healthStatus)} px-3 py-1`}>
            {getHealthIcon(intelligence.healthStatus)}
            <span className="ml-1 capitalize">{intelligence.healthStatus}</span>
          </Badge>
        </div>

        {/* Likelihood Score - Big Number */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900">
              {intelligence.likelihoodScore}%
            </span>
            <span className="text-sm text-gray-600">Likelihood to Close</span>
          </div>
          <Progress value={intelligence.likelihoodScore} className="h-2" />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-md p-2 text-center border">
            <div className="flex items-center justify-center gap-1 mb-1">
              {getSentimentIcon(intelligence.sentiment)}
            </div>
            <div className="text-xs font-medium capitalize">{intelligence.sentiment}</div>
            <div className="text-xs text-gray-500">Sentiment</div>
          </div>
          
          <div className="bg-white rounded-md p-2 text-center border">
            <div className="text-lg font-bold text-gray-900">{intelligence.conversationCount}</div>
            <div className="text-xs text-gray-500">Interactions</div>
          </div>
          
          <div className="bg-white rounded-md p-2 text-center border">
            <div className="text-lg font-bold text-gray-900">{intelligence.lastContactDays}d</div>
            <div className="text-xs text-gray-500">Last Contact</div>
          </div>
        </div>

        {/* Next Best Action */}
        <div className="bg-white rounded-md p-3 border-l-4 border-blue-500 mb-3">
          <div className="text-xs font-semibold text-blue-900 mb-1">Next Best Action</div>
          <p className="text-sm text-gray-900">{intelligence.nextBestAction}</p>
        </div>

        {/* Key Insights */}
        {intelligence.keyInsights.length > 0 && (
          <div className="bg-white rounded-md p-3 border">
            <div className="text-xs font-semibold text-gray-900 mb-2">Key Insights</div>
            <ul className="space-y-1">
              {intelligence.keyInsights.map((insight, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Urgency Badge */}
        {intelligence.urgency === 'high' && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
            <AlertCircle className="h-3 w-3" />
            <span className="font-medium">High urgency - requires immediate attention</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

