/**
 * Natural Language to SQL API
 * 
 * Converts natural language questions to SQL queries using OpenAI
 * 
 * POST /api/analytics/nl-to-sql
 * {
 *   "question": "Show me revenue by source last quarter",
 *   "tenant_id": "uuid"
 * }
 * 
 * Returns:
 * {
 *   "sql": "SELECT source, SUM(revenue_cents) as revenue...",
 *   "explanation": "This query aggregates revenue by lead source for Q4 2024"
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase-server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Schema context for OpenAI
const SCHEMA_CONTEXT = `
Database Schema:

**contacts table:**
- id, tenant_id, full_name, primary_email, primary_phone, source, created_at

**deals table:**
- id, tenant_id, title, value_estimate_cents, stage_id, contact_id, owner_user_id, created_at, closed_at

**pipeline_stages table:**
- id, name, pipeline_id

**marketing_campaigns table:**
- id, tenant_id, name, type, status, total_sends, total_opens, total_clicks, created_at

**marketing_attribution table:**
- id, tenant_id, contact_id, deal_id, first_touch_campaign_id, last_touch_campaign_id, deal_won, deal_value_cents, campaign_cost_cents

**Analytics Views:**
- crm_lead_source_analytics (source, total_contacts, deals_won, revenue_generated_cents, conversion_rate)
- crm_sales_performance_by_user (user_name, total_deals, deals_won, win_rate, revenue_generated_cents)
- marketing_roi_summary (channel, total_campaigns, leads_generated, deals_won, revenue_generated_cents)
- crm_revenue_by_month (month, deals_won, revenue_cents)
`

export async function POST(request: NextRequest) {
  try {
    const { question, tenant_id } = await request.json()
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }
    
    // Authenticate
    const supabase = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Call OpenAI to convert NL → SQL
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert SQL query generator for a dental CRM analytics system.

${SCHEMA_CONTEXT}

Convert the user's natural language question into a PostgreSQL query.

Rules:
1. Always include WHERE tenant_id = '${tenant_id}' for tenant isolation
2. Use cents for currency (divide by 100 to display dollars)
3. Use appropriate date functions for time ranges
4. Return ONLY the SQL query, no explanation
5. Use views when available for better performance
6. Limit results to 100 rows max for performance

Examples:

Q: "Show me revenue by source last quarter"
A: SELECT source, SUM(revenue_generated_cents)/100 as revenue FROM crm_lead_source_analytics WHERE tenant_id = '${tenant_id}' GROUP BY source ORDER BY revenue DESC LIMIT 100

Q: "What's my conversion rate trend for last 6 months?"
A: SELECT month, (deals_won::DECIMAL / deals_created::DECIMAL) * 100 as conversion_rate FROM crm_revenue_by_month WHERE tenant_id = '${tenant_id}' AND month >= NOW() - INTERVAL '6 months' ORDER BY month

Q: "Top 10 deals this month"
A: SELECT title, value_estimate_cents/100 as value, created_at FROM deals WHERE tenant_id = '${tenant_id}' AND created_at >= DATE_TRUNC('month', NOW()) ORDER BY value_estimate_cents DESC LIMIT 10`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.1, // Low temperature for consistent SQL generation
    })
    
    const sqlQuery = completion.choices[0].message.content?.trim() || ''
    
    // Validate SQL (basic safety check)
    const lowerSQL = sqlQuery.toLowerCase()
    if (lowerSQL.includes('drop') || lowerSQL.includes('delete') || lowerSQL.includes('update') || lowerSQL.includes('insert')) {
      return NextResponse.json(
        { error: 'Invalid query: Only SELECT queries are allowed' },
        { status: 400 }
      )
    }
    
    // Generate explanation
    const explanationCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Explain this SQL query in simple business terms (one sentence).',
        },
        {
          role: 'user',
          content: sqlQuery,
        },
      ],
      temperature: 0.3,
    })
    
    const explanation = explanationCompletion.choices[0].message.content?.trim() || ''
    
    return NextResponse.json({
      success: true,
      sql: sqlQuery,
      explanation,
    })
  } catch (error) {
    console.error('[NL-to-SQL] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to convert query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

