/**
 * =====================================================
 * BULK OPERATIONS UI COMPONENT
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 14 - Bulk Operations
 * =====================================================
 * 
 * PURPOSE:
 * Enterprise-grade UI for bulk deal re-routing operations.
 * 
 * FEATURES:
 * - Select deals by multiple criteria
 * - Preview changes before applying
 * - Dry-run mode for testing
 * - Real-time progress tracking
 * - Detailed result reporting
 * - Export results to CSV
 * - Audit trail
 * 
 * LOCATION:
 * Settings → Treatment Routing → Bulk Operations
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  RefreshCw, 
  Play, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Filter,
  BarChart3
} from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

interface Deal {
  id: string
  title: string
  pipeline: { id: string; name: string }
  stage: { id: string; name: string }
  treatment_tags: string[]
  owner_user_id: string | null
  value_estimate_cents: number | null
  created_at: string
}

interface Pipeline {
  id: string
  name: string
}

interface RerouteResult {
  dealId: string
  dealTitle: string
  success: boolean
  previousPipelineName: string
  newPipelineName: string
  routingMethod: string
  changed: boolean
  reason?: string
  error?: string
}

interface BulkRerouteResponse {
  success: boolean
  dryRun: boolean
  totalDeals: number
  successful: number
  failed: number
  unchanged: number
  results: RerouteResult[]
  errors: string[]
  durationMs: number
  summary: {
    byPipeline: Record<string, number>
    byRoutingMethod: Record<string, number>
  }
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function BulkOperationsPanel() {
  const supabase = createClient()

  // State
  const [deals, setDeals] = useState<Deal[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<BulkRerouteResponse | null>(null)

  // Filters
  const [filterPipeline, setFilterPipeline] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('')
  const [filterCreatedAfter, setFilterCreatedAfter] = useState<string>('')
  const [filterCreatedBefore, setFilterCreatedBefore] = useState<string>('')

  // Options
  const [dryRun, setDryRun] = useState(true)
  const [updateTags, setUpdateTags] = useState(false)
  const [notifyOwners, setNotifyOwners] = useState(false)
  const [preserveManual, setPreserveManual] = useState(true)

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadPipelines()
    loadDeals()
  }, [])

  async function loadPipelines() {
    const { data } = await supabase
      .from('pipelines')
      .select('id, name')
      .order('name')
    
    if (data) setPipelines(data)
  }

  async function loadDeals() {
    setLoading(true)
    try {
      let query = supabase
        .from('deals')
        .select(`
          id,
          title,
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name),
          treatment_tags,
          owner_user_id,
          value_estimate_cents,
          created_at
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(500) // Max 500 deals for UI

      if (filterPipeline !== 'all') {
        query = query.eq('pipeline_id', filterPipeline)
      }

      if (filterTag) {
        query = query.contains('treatment_tags', [filterTag])
      }

      if (filterCreatedAfter) {
        query = query.gte('created_at', new Date(filterCreatedAfter).toISOString())
      }

      if (filterCreatedBefore) {
        query = query.lte('created_at', new Date(filterCreatedBefore).toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      if (data) setDeals(data as any)
    } catch (error) {
      console.error('Error loading deals:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  function toggleDeal(dealId: string) {
    const newSelected = new Set(selectedDealIds)
    if (newSelected.has(dealId)) {
      newSelected.delete(dealId)
    } else {
      newSelected.add(dealId)
    }
    setSelectedDealIds(newSelected)
  }

  function selectAll() {
    setSelectedDealIds(new Set(deals.map(d => d.id)))
  }

  function selectNone() {
    setSelectedDealIds(new Set())
  }

  function selectFiltered() {
    const filteredIds = deals
      .filter(d => {
        if (filterPipeline !== 'all' && d.pipeline.id !== filterPipeline) return false
        if (filterTag && !d.treatment_tags?.includes(filterTag)) return false
        return true
      })
      .map(d => d.id)
    setSelectedDealIds(new Set(filteredIds))
  }

  // ============================================
  // BULK RE-ROUTE
  // ============================================

  async function executeBulkReroute() {
    if (selectedDealIds.size === 0) {
      alert('Please select at least one deal')
      return
    }

    if (!dryRun) {
      const confirmed = window.confirm(
        `⚠️ WARNING: You are about to re-route ${selectedDealIds.size} deals in LIVE mode.\n\n` +
        `This will:\n` +
        `• Change pipeline assignments\n` +
        `• Update deal stages\n` +
        `${updateTags ? '• Re-extract treatment tags\n' : ''}` +
        `${notifyOwners ? '• Notify deal owners\n' : ''}` +
        `\nAre you sure you want to continue?`
      )
      if (!confirmed) return
    }

    setProcessing(true)
    setResults(null)

    try {
      const response = await fetch('/api/treatment-routing/bulk-reroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealIds: Array.from(selectedDealIds),
          dryRun,
          updateTags,
          notifyOwners,
          preserveCustomPipeline: preserveManual,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to execute bulk re-route')
      }

      const data: BulkRerouteResponse = await response.json()
      setResults(data)

      // Reload deals if not dry run
      if (!dryRun) {
        await loadDeals()
      }
    } catch (error) {
      console.error('Error executing bulk re-route:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setProcessing(false)
    }
  }

  // ============================================
  // EXPORT RESULTS
  // ============================================

  function exportResults() {
    if (!results) return

    const csv = [
      ['Deal ID', 'Deal Title', 'Success', 'Previous Pipeline', 'New Pipeline', 'Routing Method', 'Changed', 'Reason/Error'].join(','),
      ...results.results.map(r => [
        r.dealId,
        `"${r.dealTitle}"`,
        r.success ? 'Yes' : 'No',
        r.previousPipelineName,
        r.newPipelineName,
        r.routingMethod,
        r.changed ? 'Yes' : 'No',
        `"${r.reason || r.error || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-reroute-results-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Bulk Operations</h2>
        <p className="text-gray-600">
          Re-route multiple deals at once using updated routing rules
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Pipeline</Label>
            <Select value={filterPipeline} onValueChange={setFilterPipeline}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pipelines</SelectItem>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Treatment Tag</Label>
            <Input
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              placeholder="e.g., dental_implant"
            />
          </div>

          <div>
            <Label>Created After</Label>
            <Input
              type="date"
              value={filterCreatedAfter}
              onChange={(e) => setFilterCreatedAfter(e.target.value)}
            />
          </div>

          <div>
            <Label>Created Before</Label>
            <Input
              type="date"
              value={filterCreatedBefore}
              onChange={(e) => setFilterCreatedBefore(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={loadDeals} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Apply Filters
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Options */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Re-routing Options</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dryRun"
              checked={dryRun}
              onCheckedChange={(checked) => setDryRun(checked as boolean)}
            />
            <Label htmlFor="dryRun" className="cursor-pointer">
              <span className="font-medium">Dry Run Mode</span>
              <span className="text-sm text-gray-600 block">
                Preview changes without applying them (recommended for first run)
              </span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="updateTags"
              checked={updateTags}
              onCheckedChange={(checked) => setUpdateTags(checked as boolean)}
            />
            <Label htmlFor="updateTags" className="cursor-pointer">
              <span className="font-medium">Re-extract Treatment Tags</span>
              <span className="text-sm text-gray-600 block">
                Use AI to re-analyze deal text and update tags before routing
              </span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="notifyOwners"
              checked={notifyOwners}
              onCheckedChange={(checked) => setNotifyOwners(checked as boolean)}
            />
            <Label htmlFor="notifyOwners" className="cursor-pointer">
              <span className="font-medium">Notify Deal Owners</span>
              <span className="text-sm text-gray-600 block">
                Send notification to deal owners about pipeline changes
              </span>
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="preserveManual"
              checked={preserveManual}
              onCheckedChange={(checked) => setPreserveManual(checked as boolean)}
            />
            <Label htmlFor="preserveManual" className="cursor-pointer">
              <span className="font-medium">Preserve Manual Pipelines</span>
              <span className="text-sm text-gray-600 block">
                Don't re-route deals that were manually assigned to a pipeline
              </span>
            </Label>
          </div>
        </div>
      </div>

      {/* Deal Selection */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              Select Deals ({selectedDealIds.size} of {deals.length} selected)
            </h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={selectFiltered}>
              Select Filtered
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Clear
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto border rounded">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 text-left w-12">
                  <Checkbox
                    checked={selectedDealIds.size === deals.length && deals.length > 0}
                    onCheckedChange={(checked) => checked ? selectAll() : selectNone()}
                  />
                </th>
                <th className="p-2 text-left">Deal Title</th>
                <th className="p-2 text-left">Pipeline</th>
                <th className="p-2 text-left">Tags</th>
                <th className="p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No deals found. Adjust filters or create some deals.
                  </td>
                </tr>
              ) : (
                deals.map(deal => (
                  <tr key={deal.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedDealIds.has(deal.id)}
                        onCheckedChange={() => toggleDeal(deal.id)}
                      />
                    </td>
                    <td className="p-2 font-medium">{deal.title}</td>
                    <td className="p-2">{deal.pipeline.name}</td>
                    <td className="p-2">
                      {deal.treatment_tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {deal.treatment_tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {deal.treatment_tags.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{deal.treatment_tags.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No tags</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex gap-4">
        <Button
          onClick={executeBulkReroute}
          disabled={processing || selectedDealIds.size === 0}
          size="lg"
          className={dryRun ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              {dryRun ? 'Preview Changes (Dry Run)' : '⚠️ Execute Re-Route (LIVE)'}
            </>
          )}
        </Button>

        {selectedDealIds.size > 0 && (
          <div className="text-sm text-gray-600 flex items-center">
            {selectedDealIds.size} deal{selectedDealIds.size !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">
                {results.dryRun ? '🔍 Dry Run Results' : '✅ Re-routing Complete'}
              </h3>
              <p className="text-sm text-gray-600">
                Completed in {(results.durationMs / 1000).toFixed(2)}s
              </p>
            </div>
            <Button onClick={exportResults} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.totalDeals}</div>
              <div className="text-sm text-gray-600">Total Processed</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.successful}</div>
              <div className="text-sm text-gray-600">Successfully Re-routed</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{results.unchanged}</div>
              <div className="text-sm text-gray-600">Already Correct</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {/* Summary Charts */}
          {(Object.keys(results.summary.byPipeline).length > 0 || Object.keys(results.summary.byRoutingMethod).length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* By Pipeline */}
              {Object.keys(results.summary.byPipeline).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Deals by New Pipeline
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(results.summary.byPipeline).map(([pipeline, count]) => (
                      <div key={pipeline} className="flex items-center gap-2">
                        <div className="text-sm font-medium w-32 truncate">{pipeline}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(count / results.successful) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm font-medium w-8 text-right">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Routing Method */}
              {Object.keys(results.summary.byRoutingMethod).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Deals by Routing Method
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(results.summary.byRoutingMethod).map(([method, count]) => (
                      <div key={method} className="flex items-center gap-2">
                        <div className="text-sm font-medium w-32 truncate">{method.replace('_', ' ')}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(count / results.successful) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm font-medium w-8 text-right">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-900">Errors ({results.errors.length})</h4>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.errors.map((error, i) => (
                  <div key={i} className="text-sm text-red-800">{error}</div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results */}
          <div>
            <h4 className="font-semibold mb-3">Detailed Results</h4>
            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Deal</th>
                    <th className="p-2 text-left">Previous Pipeline</th>
                    <th className="p-2 text-left">New Pipeline</th>
                    <th className="p-2 text-left">Method</th>
                    <th className="p-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((result) => (
                    <tr key={result.dealId} className="border-t">
                      <td className="p-2">
                        {result.success ? (
                          result.changed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 text-gray-400">-</div>
                          )
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </td>
                      <td className="p-2 font-medium">{result.dealTitle}</td>
                      <td className="p-2">{result.previousPipelineName}</td>
                      <td className="p-2">
                        {result.changed ? (
                          <span className="font-medium text-blue-600">{result.newPipelineName}</span>
                        ) : (
                          result.newPipelineName
                        )}
                      </td>
                      <td className="p-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {result.routingMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600">
                        {result.reason || result.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dry Run Warning */}
          {results.dryRun && results.successful > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">This was a Dry Run</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    No changes have been made to your deals. The results above show what <em>would</em> happen if you run this in live mode.
                  </p>
                  <Button
                    onClick={() => {
                      setDryRun(false)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-100"
                  >
                    Switch to Live Mode
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

