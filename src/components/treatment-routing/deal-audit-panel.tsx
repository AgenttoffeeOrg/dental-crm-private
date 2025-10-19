/**
 * =====================================================
 * DEAL AUDIT COMPONENT
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 14 - Bulk Operations
 * =====================================================
 * 
 * PURPOSE:
 * Intelligent audit system to identify deals that may be in the
 * wrong pipeline based on their treatment tags and current routing rules.
 * 
 * FEATURES:
 * - Scan all deals for routing accuracy
 * - Identify mis-routed deals
 * - Show recommended pipeline for each deal
 * - Calculate confidence scores
 * - Filter by severity
 * - Bulk re-route from audit results
 * - Export audit report
 * - Historical comparison
 * 
 * AUDIT LOGIC:
 * For each deal:
 * 1. Get current pipeline and treatment tags
 * 2. Run routing engine to determine "correct" pipeline
 * 3. Compare current vs. recommended
 * 4. Calculate confidence score
 * 5. Flag if mismatch found
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { routeDealToPipeline } from '@/lib/treatment-routing/routing-engine'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Download,
  Filter,
  Loader2,
  ArrowRight,
  BarChart3
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// =====================================================
// TYPES
// =====================================================

interface Deal {
  id: string
  title: string
  pipeline_id: string
  pipeline: { id: string; name: string }
  stage_id: string
  stage: { id: string; name: string }
  treatment_tags: string[]
  contact_id: string
  value_estimate_cents: number | null
  source: string | null
  created_at: string
}

interface AuditResult {
  dealId: string
  dealTitle: string
  currentPipelineId: string
  currentPipelineName: string
  recommendedPipelineId: string
  recommendedPipelineName: string
  recommendedStageId: string
  recommendedStageName: string
  routingMethod: string
  treatmentTags: string[]
  confidence: number
  isMisrouted: boolean
  severity: 'high' | 'medium' | 'low'
  reason: string
  value: number | null
}

interface AuditSummary {
  totalDeals: number
  audited: number
  misrouted: number
  correct: number
  highSeverity: number
  mediumSeverity: number
  lowSeverity: number
  byCurrentPipeline: Record<string, number>
  byRecommendedPipeline: Record<string, number>
  byRoutingMethod: Record<string, number>
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function DealAuditPanel() {
  const supabase = createClient()

  const [deals, setDeals] = useState<Deal[]>([])
  const [auditResults, setAuditResults] = useState<AuditResult[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [progress, setProgress] = useState(0)
  
  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterMisroutedOnly, setFilterMisroutedOnly] = useState(false)

  // ============================================
  // LOAD DEALS
  // ============================================

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          pipeline_id,
          pipeline:pipelines(id, name),
          stage_id,
          stage:pipeline_stages(id, name),
          treatment_tags,
          contact_id,
          value_estimate_cents,
          source,
          created_at
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1000) // Max 1000 deals for audit

      if (error) throw error
      if (data) setDeals(data as any)
    } catch (error) {
      console.error('Error loading deals:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // RUN AUDIT
  // ============================================

  async function runAudit() {
    if (deals.length === 0) {
      alert('No deals to audit. Please load deals first.')
      return
    }

    setAuditing(true)
    setProgress(0)
    setAuditResults([])

    const results: AuditResult[] = []
    let audited = 0

    try {
      for (const deal of deals) {
        try {
          // Run routing engine to determine recommended pipeline
          const routingResult = await routeDealToPipeline({
            tenantId: deal.pipeline.id.split('-')[0], // Extract tenant ID
            treatmentTags: deal.treatment_tags || [],
            dealTitle: deal.title,
            dealValue: deal.value_estimate_cents || undefined,
            contactId: deal.contact_id,
            source: deal.source || undefined,
            metadata: {
              dealId: deal.id,
              auditMode: true
            }
          })

          // Compare current vs. recommended
          const isMisrouted = routingResult.pipelineId !== deal.pipeline_id

          // Calculate severity
          let severity: 'high' | 'medium' | 'low' = 'low'
          if (isMisrouted) {
            if (routingResult.confidence >= 80 && deal.value_estimate_cents && deal.value_estimate_cents > 500000) {
              severity = 'high'
            } else if (routingResult.confidence >= 70) {
              severity = 'medium'
            } else {
              severity = 'low'
            }
          }

          results.push({
            dealId: deal.id,
            dealTitle: deal.title,
            currentPipelineId: deal.pipeline_id,
            currentPipelineName: deal.pipeline.name,
            recommendedPipelineId: routingResult.pipelineId,
            recommendedPipelineName: routingResult.pipelineName,
            recommendedStageId: routingResult.stageId,
            recommendedStageName: routingResult.stageName,
            routingMethod: routingResult.routingMethod,
            treatmentTags: deal.treatment_tags || [],
            confidence: routingResult.confidence,
            isMisrouted,
            severity,
            reason: routingResult.reason,
            value: deal.value_estimate_cents
          })

          audited++
          setProgress(Math.round((audited / deals.length) * 100))
        } catch (dealError) {
          console.error(`Error auditing deal ${deal.id}:`, dealError)
        }
      }

      setAuditResults(results)
      generateSummary(results)
    } catch (error) {
      console.error('Audit failed:', error)
      alert(`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setAuditing(false)
    }
  }

  // ============================================
  // GENERATE SUMMARY
  // ============================================

  function generateSummary(results: AuditResult[]) {
    const summary: AuditSummary = {
      totalDeals: deals.length,
      audited: results.length,
      misrouted: results.filter(r => r.isMisrouted).length,
      correct: results.filter(r => !r.isMisrouted).length,
      highSeverity: results.filter(r => r.severity === 'high').length,
      mediumSeverity: results.filter(r => r.severity === 'medium').length,
      lowSeverity: results.filter(r => r.severity === 'low').length,
      byCurrentPipeline: {},
      byRecommendedPipeline: {},
      byRoutingMethod: {}
    }

    results.forEach(result => {
      if (result.isMisrouted) {
        summary.byCurrentPipeline[result.currentPipelineName] = 
          (summary.byCurrentPipeline[result.currentPipelineName] || 0) + 1
        summary.byRecommendedPipeline[result.recommendedPipelineName] = 
          (summary.byRecommendedPipeline[result.recommendedPipelineName] || 0) + 1
        summary.byRoutingMethod[result.routingMethod] = 
          (summary.byRoutingMethod[result.routingMethod] || 0) + 1
      }
    })

    setSummary(summary)
  }

  // ============================================
  // EXPORT REPORT
  // ============================================

  function exportReport() {
    if (auditResults.length === 0) return

    const csv = [
      [
        'Deal ID', 
        'Deal Title', 
        'Mis-routed?', 
        'Severity',
        'Current Pipeline', 
        'Recommended Pipeline', 
        'Routing Method', 
        'Confidence', 
        'Treatment Tags',
        'Value',
        'Reason'
      ].join(','),
      ...auditResults.map(r => [
        r.dealId,
        `"${r.dealTitle}"`,
        r.isMisrouted ? 'Yes' : 'No',
        r.severity,
        r.currentPipelineName,
        r.recommendedPipelineName,
        r.routingMethod,
        r.confidence,
        `"${r.treatmentTags.join(', ')}"`,
        r.value ? `$${(r.value / 100).toFixed(2)}` : '',
        `"${r.reason}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deal-audit-report-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ============================================
  // FILTER RESULTS
  // ============================================

  const filteredResults = auditResults.filter(result => {
    if (filterMisroutedOnly && !result.isMisrouted) return false
    if (filterSeverity !== 'all' && result.severity !== filterSeverity) return false
    return true
  })

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Deal Audit</h2>
        <p className="text-gray-600">
          Identify deals that may be in the wrong pipeline based on routing rules
        </p>
      </div>

      {/* Load & Audit Controls */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Audit Controls</h3>
            <p className="text-sm text-gray-600">
              {deals.length} open deal(s) loaded
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadDeals} disabled={loading} variant="outline">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Deals
                </>
              )}
            </Button>
            <Button onClick={runAudit} disabled={auditing || deals.length === 0}>
              {auditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Auditing... {progress}%
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Run Audit
                </>
              )}
            </Button>
          </div>
        </div>

        {auditing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Audit Summary</h3>
            <Button onClick={exportReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.audited}</div>
              <div className="text-sm text-gray-600">Deals Audited</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.misrouted}</div>
              <div className="text-sm text-gray-600">Mis-routed</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.correct}</div>
              <div className="text-sm text-gray-600">Correctly Routed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.misrouted > 0 ? Math.round((summary.correct / summary.audited) * 100) : 100}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>

          {/* Severity Breakdown */}
          {summary.misrouted > 0 && (
            <>
              <h4 className="font-semibold mb-3">Mis-routed Deals by Severity</h4>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border rounded-lg p-3">
                  <div className="text-lg font-bold text-red-600">{summary.highSeverity}</div>
                  <div className="text-sm text-gray-600">High Priority</div>
                  <div className="text-xs text-gray-500 mt-1">
                    High confidence + high value
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-lg font-bold text-yellow-600">{summary.mediumSeverity}</div>
                  <div className="text-sm text-gray-600">Medium Priority</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Medium confidence
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-lg font-bold text-gray-600">{summary.lowSeverity}</div>
                  <div className="text-sm text-gray-600">Low Priority</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Low confidence
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Current Pipeline */}
                {Object.keys(summary.byCurrentPipeline).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Mis-routed by Current Pipeline
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(summary.byCurrentPipeline)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([pipeline, count]) => (
                          <div key={pipeline} className="flex items-center gap-2">
                            <div className="text-sm font-medium w-32 truncate">{pipeline}</div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-600 h-2 rounded-full"
                                style={{ width: `${(count / summary.misrouted) * 100}%` }}
                              />
                            </div>
                            <div className="text-sm font-medium w-8 text-right">{count}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* By Recommended Pipeline */}
                {Object.keys(summary.byRecommendedPipeline).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Should Be In
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(summary.byRecommendedPipeline)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([pipeline, count]) => (
                          <div key={pipeline} className="flex items-center gap-2">
                            <div className="text-sm font-medium w-32 truncate">{pipeline}</div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(count / summary.misrouted) * 100}%` }}
                              />
                            </div>
                            <div className="text-sm font-medium w-8 text-right">{count}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      {auditResults.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High Priority Only</SelectItem>
                    <SelectItem value="medium">Medium Priority Only</SelectItem>
                    <SelectItem value="low">Low Priority Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="misroutedOnly"
                  checked={filterMisroutedOnly}
                  onChange={(e) => setFilterMisroutedOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="misroutedOnly" className="text-sm cursor-pointer">
                  Show mis-routed deals only
                </label>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredResults.length} result(s)
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {filteredResults.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Deal</th>
                  <th className="p-3 text-left">Current Pipeline</th>
                  <th className="p-3 text-left">Recommended</th>
                  <th className="p-3 text-left">Confidence</th>
                  <th className="p-3 text-left">Tags</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map(result => (
                  <tr key={result.dealId} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      {result.isMisrouted ? (
                        <div className="flex items-center gap-2">
                          <AlertTriangle 
                            className={`w-4 h-4 ${
                              result.severity === 'high' ? 'text-red-600' :
                              result.severity === 'medium' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}
                          />
                          <span className={`text-xs font-medium ${
                            result.severity === 'high' ? 'text-red-600' :
                            result.severity === 'medium' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {result.severity.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{result.dealTitle}</div>
                      {result.value && (
                        <div className="text-xs text-gray-600">
                          ${(result.value / 100).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{result.currentPipelineName}</td>
                    <td className="p-3">
                      {result.isMisrouted ? (
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-blue-600" />
                          <span className="font-medium text-blue-600">
                            {result.recommendedPipelineName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              result.confidence >= 80 ? 'bg-green-600' :
                              result.confidence >= 60 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{result.confidence}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {result.treatmentTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {result.treatmentTags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {result.treatmentTags.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{result.treatmentTags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No tags</span>
                      )}
                    </td>
                    <td className="p-3">
                      {result.isMisrouted && (
                        <Button size="sm" variant="outline">
                          Fix
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {auditResults.length === 0 && !auditing && (
        <div className="bg-gray-50 border rounded-lg p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-semibold mb-2">No Audit Results</h4>
          <p className="text-gray-600 mb-4">
            Run an audit to identify deals that may be in the wrong pipeline.
          </p>
          <Button onClick={runAudit} disabled={deals.length === 0}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Run Audit
          </Button>
        </div>
      )}
    </div>
  )
}

