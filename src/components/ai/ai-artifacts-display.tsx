'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles, Brain, Target, Stethoscope, CheckSquare, FileText,
  ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Users,
  DollarSign, Clock, MessageSquare, Lightbulb, Star,
  User, Phone, Calendar, ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface AIArtifactsDisplayProps {
  activityId: string
  tenantId?: string
}

interface AIArtifact {
  id: string
  kind: string
  data: any
  confidence: number
  created_at: string
}

interface ComprehensiveArtifacts {
  transcript?: AIArtifact
  summary?: AIArtifact      // Contains executive_summary, patient_profile, conversation data
  treatments?: AIArtifact   // Contains treatments_discussed, opportunity_assessment
  intent?: AIArtifact       // Contains strategic insights, conversion data
  actions?: AIArtifact      // Contains immediate_actions
}

export function AIArtifactsDisplay({ 
  activityId, 
  tenantId
}: AIArtifactsDisplayProps) {
  const [artifacts, setArtifacts] = useState<ComprehensiveArtifacts>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)

  useEffect(() => {
    async function fetchArtifacts() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('ai_artifacts')
          .select('*')
          .eq('activity_id', activityId)
          .eq('tenant_id', tenantId)

        if (error) {
          console.error('Error fetching artifacts:', error)
          setError('Failed to load AI insights')
          return
        }

        // Organize artifacts by kind
        const organized: ComprehensiveArtifacts = {}
        data?.forEach((artifact) => {
          organized[artifact.kind as keyof ComprehensiveArtifacts] = artifact
        })

        setArtifacts(organized)
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load AI insights')
      } finally {
        setLoading(false)
      }
    }

    fetchArtifacts()
  }, [activityId, tenantId])

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100)
    const variant = percentage >= 90 ? 'default' : percentage >= 70 ? 'secondary' : 'outline'
    return (
      <Badge variant={variant} className="text-xs">
        {percentage}% confident
      </Badge>
    )
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      case 'mixed': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 animate-spin" />
            <span className="text-purple-800">Loading AI insights...</span>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </Card>
    )
  }

  if (!artifacts.summary && !artifacts.transcript) {
    return null
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-purple-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Comprehensive AI Analysis
            {artifacts.summary && getConfidenceBadge(artifacts.summary.confidence)}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="text-purple-600 hover:bg-purple-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Collapse' : 'Expand Full Analysis'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Executive Summary - Always Visible */}
        {artifacts.summary?.data?.executive_summary && (
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-800">Executive Summary</span>
              <Badge variant="outline" className="text-xs">
                {artifacts.summary.data.call_purpose || 'General Inquiry'}
              </Badge>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {artifacts.summary.data.executive_summary}
            </p>
          </div>
        )}

        {/* Key Insights Cards - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Treatment Interest */}
          {artifacts.treatments?.data?.treatments_discussed && (
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Treatments</span>
              </div>
              <div className="space-y-1">
                {artifacts.treatments.data.treatments_discussed.slice(0, 2).map((treatment: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm">{treatment.name}</span>
                    <Badge variant={treatment.interest_level === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {treatment.interest_level}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Sentiment */}
          {artifacts.summary?.data?.patient_sentiment && (
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Patient Sentiment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(artifacts.summary.data.patient_sentiment?.overall)}`}>
                  {artifacts.summary.data.patient_sentiment?.overall || 'neutral'}
                </div>
                <div className="text-xs text-gray-500">
                  Quality: {artifacts.summary.data.conversation_quality?.score || 'N/A'}/10
                </div>
              </div>
            </div>
          )}

          {/* Conversion Probability */}
          {artifacts.intent?.data?.conversion_probability && (
            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Conversion</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Probability</span>
                  <span className="text-sm font-medium">
                    {Math.round((artifacts.intent.data.conversion_probability?.score || 0) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(artifacts.intent.data.conversion_probability?.score || 0) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Immediate Actions - Always Visible */}
        {artifacts.actions?.data?.immediate_actions?.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-gray-800">Immediate Actions Required</span>
            </div>
            <div className="space-y-2">
              {artifacts.actions.data.immediate_actions.slice(0, 3).map((action: any, index: number) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getPriorityColor(action.priority)}`}>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.title}</div>
                    {action.reasoning && (
                      <div className="text-xs opacity-75 mt-1">{action.reasoning}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    {action.due_hours}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Transcript */}
        {artifacts.transcript && (
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setTranscriptExpanded(!transcriptExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-800">Full Transcript</span>
                <Badge variant="outline" className="text-xs">
                  {artifacts.transcript.data.text?.length || 0} characters
                </Badge>
              </div>
              {transcriptExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {transcriptExpanded && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {artifacts.transcript.data.text}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expanded Analysis */}
        {expanded && (
          <div className="space-y-6 pt-4 border-t border-purple-100">
            {/* Patient Profile */}
            {artifacts.summary?.data?.patient_profile && (
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">Patient Profile Analysis</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Communication Style:</span>
                    <div className="mt-1">{artifacts.summary.data.patient_profile.communication_style || 'Not assessed'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Decision Pattern:</span>
                    <div className="mt-1">{artifacts.summary.data.patient_profile.decision_making_pattern || 'Not assessed'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Financial Indicators:</span>
                    <div className="mt-1">{artifacts.summary.data.patient_profile.financial_indicators || 'Not assessed'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Education Level:</span>
                    <div className="mt-1">{artifacts.summary.data.patient_profile.education_level || 'Not assessed'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Treatment Analysis */}
            {artifacts.treatments?.data?.treatments_discussed && (
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-gray-800">Treatment Analysis</span>
                </div>
                <div className="space-y-4">
                  {artifacts.treatments.data.treatments_discussed.map((treatment: any, idx: number) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{treatment.name}</span>
                        <Badge variant={treatment.interest_level === 'high' ? 'default' : 'secondary'}>
                          {treatment.interest_level} interest
                        </Badge>
                      </div>
                      {treatment.concerns?.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-600">Concerns:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {treatment.concerns.map((concern: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{concern}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {treatment.education_needed?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-600">Education Needed:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {treatment.education_needed.map((item: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Insights */}
            {artifacts.intent?.data && (
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-gray-800">Strategic Insights</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Estimated Value:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>{artifacts.intent.data.estimated_value}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Urgency Score:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg font-bold">{artifacts.intent.data.urgency_score}/10</span>
                      <Progress value={artifacts.intent.data.urgency_score * 10} className="flex-1 h-2" />
                    </div>
                  </div>
                </div>

                {artifacts.intent.data.risk_factors?.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-red-600">Risk Factors:</span>
                    <ul className="mt-1 space-y-1">
                      {artifacts.intent.data.risk_factors.map((risk: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {artifacts.intent.data.internal_notes?.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-gray-600">Internal Notes:</span>
                    <ul className="mt-1 space-y-1">
                      {artifacts.intent.data.internal_notes.map((note: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Analysis */}
            {artifacts.summary?.data && (
              <div className="bg-white rounded-lg p-4 border border-yellow-100">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-gray-800">Conversation Analysis</span>
                </div>
                <div className="space-y-4">
                  {artifacts.summary.data.conversation_quality && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Call Quality</span>
                        <span className="text-lg font-bold">{artifacts.summary.data.conversation_quality.score}/10</span>
                      </div>
                      <p className="text-sm text-gray-600">{artifacts.summary.data.conversation_quality.reasoning}</p>
                    </div>
                  )}

                  {artifacts.summary.data.pain_points?.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Pain Points Identified:</span>
                      <ul className="mt-1 space-y-1">
                        {artifacts.summary.data.pain_points.map((point: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700">• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {artifacts.summary.data.communication_gaps?.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Communication Gaps:</span>
                      <ul className="mt-1 space-y-1">
                        {artifacts.summary.data.communication_gaps.map((gap: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700">• {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}