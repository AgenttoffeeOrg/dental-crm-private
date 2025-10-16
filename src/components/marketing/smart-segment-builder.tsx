'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  X, 
  Users, 
  TrendingUp, 
  Filter,
  Sparkles,
  Save,
  Play,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { toast } from 'sonner'

interface FilterRule {
  id: string
  field: string
  operator: string
  value: string
}

interface SegmentBuilderProps {
  onSave?: (segment: any) => void
  onCancel?: () => void
  existingSegment?: any
}

const FILTER_FIELDS = [
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Social Media', 'Direct'] },
  { value: 'status', label: 'Status', type: 'select', options: ['New', 'Active', 'Inactive'] },
  { value: 'tags', label: 'Tags', type: 'text' },
  { value: 'marketing_engagement_score', label: 'Engagement Score', type: 'number' },
  { value: 'last_contact_date', label: 'Last Contact', type: 'date' },
  { value: 'deal_count', label: 'Deal Count', type: 'number' },
  { value: 'total_value', label: 'Total Value', type: 'number' },
]

const OPERATORS = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'between', label: 'between' },
  ],
  date: [
    { value: 'on', label: 'on' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'in_last', label: 'in the last' },
    { value: 'in_next', label: 'in the next' },
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
}

export function SmartSegmentBuilder({ onSave, onCancel, existingSegment }: SegmentBuilderProps) {
  const [segmentName, setSegmentName] = useState(existingSegment?.name || '')
  const [segmentDescription, setSegmentDescription] = useState(existingSegment?.description || '')
  const [filterRules, setFilterRules] = useState<FilterRule[]>(
    existingSegment?.filters || [{ id: '1', field: 'email', operator: 'contains', value: '' }]
  )
  const [matchType, setMatchType] = useState<'all' | 'any'>(existingSegment?.match_type || 'all')
  const [estimatedCount, setEstimatedCount] = useState(0)
  const [calculating, setCalculating] = useState(false)
  const [autoSuggestions, setAutoSuggestions] = useState<any[]>([])

  useEffect(() => {
    calculateEstimatedCount()
  }, [filterRules, matchType])

  useEffect(() => {
    loadAutoSuggestions()
  }, [])

  const loadAutoSuggestions = async () => {
    try {
      const supabase = createClient()
      const tenantId

      // Get segment suggestions based on common patterns
      const { data: contacts } = await supabase
        .from('contacts')
        .select('source, status, marketing_engagement_score')
        .eq('tenant_id', tenantId)
        .limit(1000)

      if (contacts) {
        // Analyze patterns
        const sources = contacts.map(c => c.source).filter(Boolean)
        const sourceCounts: Record<string, number> = {}
        sources.forEach(s => sourceCounts[s] = (sourceCounts[s] || 0) + 1)

        const topSources = Object.entries(sourceCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([source, count]) => ({
            name: `${source} Contacts`,
            description: `All contacts from ${source}`,
            filters: [{ field: 'source', operator: 'equals', value: source }],
            estimatedCount: count
          }))

        // High engagement segment
        const highEngagement = contacts.filter(c => (c.marketing_engagement_score || 0) > 70).length
        if (highEngagement > 0) {
          topSources.push({
            name: 'High Engagement Contacts',
            description: 'Contacts with engagement score > 70',
            filters: [{ field: 'marketing_engagement_score', operator: 'greater_than', value: '70' }],
            estimatedCount: highEngagement
          })
        }

        setAutoSuggestions(topSources)
      }
    } catch (error) {
      console.error('[SEGMENT] Error loading suggestions:', error)
    }
  }

  const calculateEstimatedCount = async () => {
    if (filterRules.length === 0 || !filterRules[0].value) {
      setEstimatedCount(0)
      return
    }

    setCalculating(true)
    try {
      const supabase = createClient()
      const tenantId

      // Build query based on filter rules
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      // Apply filters (simplified for demo - in production, build dynamic query)
      filterRules.forEach(rule => {
        if (rule.value) {
          switch (rule.operator) {
            case 'equals':
              query = query.eq(rule.field, rule.value)
              break
            case 'contains':
              query = query.ilike(rule.field, `%${rule.value}%`)
              break
            case 'greater_than':
              query = query.gt(rule.field, parseInt(rule.value))
              break
            case 'less_than':
              query = query.lt(rule.field, parseInt(rule.value))
              break
          }
        }
      })

      const { count } = await query
      setEstimatedCount(count || 0)
    } catch (error) {
      console.error('[SEGMENT] Error calculating count:', error)
      setEstimatedCount(0)
    } finally {
      setCalculating(false)
    }
  }

  const addFilterRule = () => {
    setFilterRules([
      ...filterRules,
      { id: Date.now().toString(), field: 'email', operator: 'contains', value: '' }
    ])
  }

  const removeFilterRule = (id: string) => {
    setFilterRules(filterRules.filter(rule => rule.id !== id))
  }

  const updateFilterRule = (id: string, updates: Partial<FilterRule>) => {
    setFilterRules(filterRules.map(rule =>
      rule.id === id ? { ...rule, ...updates } : rule
    ))
  }

  const applySuggestion = (suggestion: any) => {
    setSegmentName(suggestion.name)
    setSegmentDescription(suggestion.description)
    setFilterRules(suggestion.filters.map((f: any, i: number) => ({
      id: (i + 1).toString(),
      ...f
    })))
  }

  const handleSave = async () => {
    if (!segmentName) {
      toast.error('Please enter a segment name')
      return
    }

    try {
      const supabase = createClient()
      const tenantId

      const segmentData = {
        tenant_id: tenantId,
        name: segmentName,
        description: segmentDescription,
        filters_json: filterRules,
        match_type: matchType,
        total_contacts: estimatedCount,
        is_dynamic: true,
        updated_at: new Date().toISOString()
      }

      if (existingSegment) {
        const { error } = await supabase
          .from('marketing_segments')
          .update(segmentData)
          .eq('id', existingSegment.id)

        if (error) throw error
        toast.success('Segment updated!')
      } else {
        const { data, error } = await supabase
          .from('marketing_segments')
          .insert(segmentData)
          .select()
          .single()

        if (error) throw error
        toast.success('Segment created!')
        if (onSave) onSave(data)
      }
    } catch (error) {
      console.error('[SEGMENT] Error saving:', error)
      toast.error('Failed to save segment')
    }
  }

  const getFieldType = (fieldValue: string) => {
    const field = FILTER_FIELDS.find(f => f.value === fieldValue)
    return field?.type || 'text'
  }

  const getOperators = (fieldValue: string) => {
    const fieldType = getFieldType(fieldValue)
    return OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text
  }

  return (
    <div className="space-y-6">
      {/* Smart Suggestions */}
      {autoSuggestions.length > 0 && !existingSegment && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {autoSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion(suggestion)}
                  className="p-4 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all text-left"
                >
                  <p className="font-semibold text-gray-900 text-sm mb-1">{suggestion.name}</p>
                  <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                  <Badge variant="outline" className="text-xs">
                    ~{suggestion.estimatedCount} contacts
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Segment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Segment Name</Label>
            <Input
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              placeholder="e.g., Active Patients"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={segmentDescription}
              onChange={(e) => setSegmentDescription(e.target.value)}
              placeholder="Describe this segment..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Rules
            </CardTitle>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Match ALL conditions</SelectItem>
                <SelectItem value="any">Match ANY condition</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filterRules.map((rule, index) => (
            <div key={rule.id} className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg">
              {index > 0 && (
                <Badge variant="outline" className="self-center mb-2">
                  {matchType === 'all' ? 'AND' : 'OR'}
                </Badge>
              )}

              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Field</Label>
                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateFilterRule(rule.id, { 
                      field: value,
                      operator: getOperators(value)[0].value
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_FIELDS.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateFilterRule(rule.id, { operator: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperators(rule.field).map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Value</Label>
                  {getFieldType(rule.field) === 'select' ? (
                    <Select
                      value={rule.value}
                      onValueChange={(value) => updateFilterRule(rule.id, { value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_FIELDS.find(f => f.value === rule.field)?.options?.map(opt => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={getFieldType(rule.field) === 'number' ? 'number' : 'text'}
                      value={rule.value}
                      onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}
                      placeholder="Enter value..."
                      className="mt-1"
                    />
                  )}
                </div>
              </div>

              {filterRules.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilterRule(rule.id)}
                  className="mb-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addFilterRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter Rule
          </Button>
        </CardContent>
      </Card>

      {/* Estimated Results */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Reach</p>
              <p className="text-4xl font-bold text-gray-900">
                {calculating ? (
                  <span className="text-2xl">Calculating...</span>
                ) : (
                  estimatedCount.toLocaleString()
                )}
              </p>
              <p className="text-sm text-gray-600 mt-1">contacts match your filters</p>
            </div>
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              {calculating ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              ) : estimatedCount > 0 ? (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              ) : (
                <AlertCircle className="h-10 w-10 text-gray-400" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={!segmentName || estimatedCount === 0}>
          <Save className="h-4 w-4 mr-2" />
          {existingSegment ? 'Update Segment' : 'Create Segment'}
        </Button>
      </div>
    </div>
  )
}



