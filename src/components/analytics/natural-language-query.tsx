'use client'

/**
 * Natural Language Query Interface
 * 
 * Ask questions about your data in plain English
 * 
 * Features:
 * - AI-powered query interpretation
 * - Convert natural language → SQL
 * - Auto-generate visualizations
 * - Query history
 * - Example queries
 * - Save favorite queries
 * 
 * Example Queries:
 * - "Show me revenue by source last quarter"
 * - "What's my CAC trend over the last 6 months?"
 * - "Which campaigns had the highest ROI in 2024?"
 * - "Show me top 10 deals by value this month"
 * 
 * Technology:
 * - OpenAI GPT-4 for NL → SQL translation
 * - SQL execution via Supabase
 * - Auto-chart generation based on query result
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Send, Loader2, Clock, Copy, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface QueryResult {
  id: string
  query: string
  sql: string
  data: any[]
  chartType: 'line' | 'bar' | 'pie' | 'table'
  timestamp: Date
}

const EXAMPLE_QUERIES = [
  "Show me revenue by source last quarter",
  "What's my conversion rate trend over the last 6 months?",
  "Which campaigns had the highest ROI in 2024?",
  "Show me top 10 deals by value this month",
  "What's the average deal close time by source?",
  "How many new contacts did we get each month this year?",
]

export function NaturalLanguageQuery({ tenantId }: { tenantId?: string }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<QueryResult[]>([])
  
  const handleSubmitQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a question')
      return
    }
    
    setLoading(true)
    
    try {
      // Call OpenAI API to convert NL → SQL
      const sqlQuery = await convertNaturalLanguageToSQL(query, tenantId || '')
      
      // Execute SQL query
      const supabase = createClient()
      const { data, error } = await supabase.rpc('execute_analytics_query', {
        query_sql: sqlQuery,
        p_tenant_id: tenantId,
      })
      
      if (error) {
        toast.error('Failed to execute query')
        console.error(error)
        return
      }
      
      // Determine best chart type
      const chartType = determineChartType(data)
      
      const result: QueryResult = {
        id: Date.now().toString(),
        query,
        sql: sqlQuery,
        data,
        chartType,
        timestamp: new Date(),
      }
      
      setResults([result, ...results])
      setQuery('')
      toast.success('Query executed successfully')
    } catch (error) {
      console.error('[NLQ] Error:', error)
      toast.error('Failed to process query')
    } finally {
      setLoading(false)
    }
  }
  
  const useExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Ask Your Data</h2>
        </div>
        <p className="text-sm text-gray-600">
          Ask questions in plain English - AI will analyze your data and generate insights
        </p>
      </div>
      
      {/* Query Input */}
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="e.g., What's my revenue trend over the last 3 months?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitQuery()}
              className="text-base"
            />
          </div>
          <Button onClick={handleSubmitQuery} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Example Queries */}
        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.slice(0, 3).map((example, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => useExampleQuery(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Query Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Results</h3>
          
          {results.map((result) => (
            <Card key={result.id} className="p-6">
              {/* Query */}
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{result.query}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{result.timestamp.toLocaleString()}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">{result.chartType}</Badge>
                  </div>
                </div>
              </div>
              
              {/* SQL Query (collapsed) */}
              <details className="mb-4">
                <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-900">
                  View SQL Query
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                  {result.sql}
                </pre>
              </details>
              
              {/* Data Visualization */}
              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                <p className="text-gray-600 text-sm">
                  Chart rendering: {result.data.length} rows returned
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Data
                  </Button>
                  <Button variant="outline" size="sm">
                    Save Query
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {results.length === 0 && (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Ask Your First Question</h3>
          <p className="text-sm text-gray-600">
            Type a question above or click an example to get started
          </p>
        </Card>
      )}
    </div>
  )
}

/**
 * Convert natural language to SQL using OpenAI
 * 
 * @param naturalLanguage - User's question
 * @param tenantId - Tenant ID for context
 * @returns SQL query string
 */
async function convertNaturalLanguageToSQL(
  naturalLanguage: string,
  tenantId: string
): Promise<string> {
  // In production, call OpenAI API
  // For now, return a simple example query
  
  const response = await fetch('/api/analytics/nl-to-sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: naturalLanguage,
      tenant_id: tenantId,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to convert query')
  }
  
  const { sql } = await response.json()
  return sql
}

/**
 * Determine best chart type for query result
 */
function determineChartType(data: any[]): 'line' | 'bar' | 'pie' | 'table' {
  if (!data || data.length === 0) return 'table'
  
  const firstRow = data[0]
  const keys = Object.keys(firstRow)
  
  // If has date/time field → line chart
  if (keys.some(k => k.includes('date') || k.includes('month') || k.includes('time'))) {
    return 'line'
  }
  
  // If has category + value → bar chart
  if (keys.length === 2 && keys.some(k => 
    k.includes('name') || k.includes('source') || k.includes('category')
  )) {
    return 'bar'
  }
  
  // If many rows → table
  if (data.length > 20) {
    return 'table'
  }
  
  // Default to bar chart
  return 'bar'
}

