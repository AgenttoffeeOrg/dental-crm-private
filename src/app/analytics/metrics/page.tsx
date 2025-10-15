/**
 * Metric Dictionary Page
 * 
 * Comprehensive reference for all KPIs and metrics
 * 
 * Features:
 * - Metric definitions
 * - SQL formulas
 * - Data sources
 * - Update frequency
 * - Benchmarks
 * - Search and filter
 * - Category grouping
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Database, Clock, Target, TrendingUp, Code } from 'lucide-react'

interface Metric {
  id: string
  name: string
  category: 'crm' | 'marketing' | 'financial' | 'operational' | 'predictive'
  definition: string
  formula: string
  sqlQuery?: string
  dataSources: string[]
  updateFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly'
  benchmark?: string
  goodValue?: string
  interpretation: string
}

const METRICS: Metric[] = [
  // CRM Metrics
  {
    id: 'conversion_rate',
    name: 'Conversion Rate',
    category: 'crm',
    definition: 'Percentage of contacts that become paying customers',
    formula: '(Deals Won / Total Contacts) × 100',
    sqlQuery: `SELECT 
  (COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%')::DECIMAL / 
   COUNT(DISTINCT c.id)::DECIMAL) * 100 as conversion_rate
FROM contacts c
LEFT JOIN deals d ON c.id = d.contact_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id`,
    dataSources: ['contacts', 'deals', 'pipeline_stages'],
    updateFrequency: 'real-time',
    benchmark: '2-5% (dental practices)',
    goodValue: '> 3%',
    interpretation: 'Higher is better. Measures sales effectiveness.',
  },
  {
    id: 'deal_win_rate',
    name: 'Deal Win Rate',
    category: 'crm',
    definition: 'Percentage of deals that are successfully closed',
    formula: '(Deals Won / Total Deals) × 100',
    sqlQuery: `SELECT 
  (COUNT(*) FILTER (WHERE ps.name ILIKE '%won%')::DECIMAL / 
   COUNT(*)::DECIMAL) * 100 as win_rate
FROM deals d
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id`,
    dataSources: ['deals', 'pipeline_stages'],
    updateFrequency: 'real-time',
    benchmark: '20-40% (B2C), 10-25% (B2B)',
    goodValue: '> 25%',
    interpretation: 'Higher is better. Indicates deal quality and sales skill.',
  },
  {
    id: 'pipeline_velocity',
    name: 'Pipeline Velocity',
    category: 'crm',
    definition: 'Average number of days to close a deal',
    formula: 'AVG(Deal Close Date - Deal Created Date)',
    sqlQuery: `SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) as avg_days
FROM deals
WHERE closed_at IS NOT NULL`,
    dataSources: ['deals'],
    updateFrequency: 'real-time',
    benchmark: '30-90 days (dental)',
    goodValue: '< 45 days',
    interpretation: 'Lower is better. Faster = more efficient sales process.',
  },
  
  // Marketing Metrics
  {
    id: 'cac',
    name: 'Customer Acquisition Cost (CAC)',
    category: 'marketing',
    definition: 'Total cost to acquire one new customer',
    formula: 'Total Marketing Spend / Number of Customers Acquired',
    sqlQuery: `SELECT 
  SUM(campaign_cost_cents)::DECIMAL / 
  COUNT(DISTINCT deal_id) FILTER (WHERE deal_won = TRUE)::DECIMAL / 100 as cac
FROM marketing_attribution`,
    dataSources: ['marketing_attribution', 'marketing_campaigns'],
    updateFrequency: 'daily',
    benchmark: '$200-$500 (dental)',
    goodValue: '< $300',
    interpretation: 'Lower is better. Measures marketing efficiency.',
  },
  {
    id: 'ltv',
    name: 'Lifetime Value (LTV)',
    category: 'financial',
    definition: 'Total revenue expected from a customer over their lifetime',
    formula: 'Average Deal Value × Average # of Repeat Visits',
    sqlQuery: `SELECT 
  AVG(value_estimate_cents) / 100 as avg_ltv
FROM deals
WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name ILIKE '%won%')`,
    dataSources: ['deals', 'pipeline_stages'],
    updateFrequency: 'daily',
    benchmark: '$1,000-$3,000 (dental)',
    goodValue: '> $1,500',
    interpretation: 'Higher is better. Long-term customer value.',
  },
  {
    id: 'ltv_cac_ratio',
    name: 'LTV:CAC Ratio',
    category: 'financial',
    definition: 'Ratio of customer lifetime value to acquisition cost',
    formula: 'LTV / CAC',
    dataSources: ['deals', 'marketing_attribution'],
    updateFrequency: 'daily',
    benchmark: '3:1 (healthy)',
    goodValue: '> 3:1',
    interpretation: '3:1 = Excellent, 2:1 = Acceptable, <2:1 = Unprofitable',
  },
  {
    id: 'marketing_roi',
    name: 'Marketing ROI',
    category: 'marketing',
    definition: 'Return on investment for marketing spend',
    formula: '(Revenue Generated - Marketing Spend) / Marketing Spend × 100',
    sqlQuery: `SELECT 
  ((SUM(deal_value_cents) FILTER (WHERE deal_won = TRUE) - SUM(campaign_cost_cents))::DECIMAL / 
   SUM(campaign_cost_cents)::DECIMAL) * 100 as roi_percent
FROM marketing_attribution`,
    dataSources: ['marketing_attribution'],
    updateFrequency: 'daily',
    benchmark: '300-500% (dental)',
    goodValue: '> 400%',
    interpretation: 'Higher is better. Every $1 spent returns $X.',
  },
  {
    id: 'open_rate',
    name: 'Email Open Rate',
    category: 'marketing',
    definition: 'Percentage of sent emails that are opened',
    formula: '(Total Opens / Total Sent) × 100',
    dataSources: ['marketing_campaigns'],
    updateFrequency: 'real-time',
    benchmark: '15-25% (healthcare)',
    goodValue: '> 20%',
    interpretation: 'Higher is better. Measures email engagement.',
  },
  {
    id: 'click_rate',
    name: 'Email Click Rate',
    category: 'marketing',
    definition: 'Percentage of sent emails where recipient clicked a link',
    formula: '(Total Clicks / Total Sent) × 100',
    dataSources: ['marketing_campaigns'],
    updateFrequency: 'real-time',
    benchmark: '2-5% (healthcare)',
    goodValue: '> 3%',
    interpretation: 'Higher is better. Measures content effectiveness.',
  },
  
  // Operational Metrics
  {
    id: 'lead_response_time',
    name: 'Lead Response Time',
    category: 'operational',
    definition: 'Average time to first contact after lead submission',
    formula: 'AVG(First Contact Time - Lead Submission Time)',
    dataSources: ['contacts', 'activities'],
    updateFrequency: 'real-time',
    benchmark: '< 5 minutes (ideal)',
    goodValue: '< 15 minutes',
    interpretation: 'Lower is better. Speed matters for conversion.',
  },
  {
    id: 'task_completion_rate',
    name: 'Task Completion Rate',
    category: 'operational',
    definition: 'Percentage of tasks completed on time',
    formula: '(Tasks Completed On Time / Total Tasks) × 100',
    dataSources: ['tasks'],
    updateFrequency: 'real-time',
    benchmark: '> 80%',
    goodValue: '> 85%',
    interpretation: 'Higher is better. Measures team productivity.',
  },
  
  // Predictive Metrics
  {
    id: 'deal_close_probability',
    name: 'Deal Close Probability',
    category: 'predictive',
    definition: 'AI-calculated likelihood of deal closure',
    formula: 'Multi-factor model based on: stage, value, age, activities, source',
    dataSources: ['deals', 'activities', 'contacts', 'historical_win_rates'],
    updateFrequency: 'hourly',
    goodValue: '> 60% = Likely to close',
    interpretation: 'Helps prioritize sales efforts on high-probability deals.',
  },
  {
    id: 'revenue_forecast',
    name: 'Revenue Forecast',
    category: 'predictive',
    definition: 'Predicted revenue for next month/quarter',
    formula: 'Linear regression on historical revenue + current pipeline',
    dataSources: ['crm_revenue_by_month', 'deals', 'pipeline_stages'],
    updateFrequency: 'daily',
    interpretation: 'Based on historical trends and current pipeline.',
  },
  {
    id: 'churn_risk',
    name: 'Churn Risk',
    category: 'predictive',
    definition: 'Likelihood of customer not returning',
    formula: 'Based on: last visit date, deal value, engagement level',
    dataSources: ['contacts', 'deals', 'activities'],
    updateFrequency: 'daily',
    goodValue: '< 20% = Low risk',
    interpretation: 'Identifies at-risk customers for retention campaigns.',
  },
]

export default function MetricDictionaryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const filteredMetrics = METRICS.filter(metric => {
    const matchesSearch = 
      metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.definition.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = 
      selectedCategory === 'all' || metric.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })
  
  const categories = {
    all: 'All Metrics',
    crm: 'CRM & Sales',
    marketing: 'Marketing',
    financial: 'Financial',
    operational: 'Operational',
    predictive: 'Predictive AI',
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Metric Dictionary</h1>
        <p className="text-gray-600 mt-2">
          Complete reference for all KPIs, formulas, and benchmarks
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search metrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categories).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Badge variant="outline" className="text-xs">
          {filteredMetrics.length} metrics
        </Badge>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid gap-4">
        {filteredMetrics.map((metric) => (
          <Card key={metric.id} className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{metric.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{metric.definition}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {metric.category}
                </Badge>
              </div>
              
              {/* Formula */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Formula</span>
                </div>
                <code className="text-sm text-blue-800">{metric.formula}</code>
              </div>
              
              {/* SQL Query */}
              {metric.sqlQuery && (
                <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Database className="h-4 w-4 text-gray-600" />
                    SQL Implementation
                  </summary>
                  <pre className="mt-3 text-xs text-gray-700 overflow-x-auto">
                    {metric.sqlQuery}
                  </pre>
                </details>
              )}
              
              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Clock className="h-3 w-3" />
                    Update Frequency
                  </div>
                  <span className="font-medium capitalize">{metric.updateFrequency}</span>
                </div>
                
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Database className="h-3 w-3" />
                    Data Sources
                  </div>
                  <span className="font-medium">{metric.dataSources.length} tables</span>
                </div>
                
                {metric.benchmark && (
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <Target className="h-3 w-3" />
                      Benchmark
                    </div>
                    <span className="font-medium">{metric.benchmark}</span>
                  </div>
                )}
                
                {metric.goodValue && (
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Good Value
                    </div>
                    <span className="font-medium text-green-600">{metric.goodValue}</span>
                  </div>
                )}
              </div>
              
              {/* Interpretation */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-900">
                  <span className="font-medium">Interpretation:</span> {metric.interpretation}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {filteredMetrics.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No metrics found matching your search.</p>
        </Card>
      )}
    </div>
  )
}

