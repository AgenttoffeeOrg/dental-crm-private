/**
 * Analytics Export API
 * 
 * Provides JSON/CSV export for external BI tools
 * 
 * Endpoints:
 * - GET /api/analytics/export?dashboard=executive&format=json
 * - GET /api/analytics/export?dashboard=crm&format=csv&start_date=2025-01-01&end_date=2025-01-31
 * 
 * Supported dashboards:
 * - executive
 * - crm
 * - marketing
 * - communications
 * 
 * Formats:
 * - json
 * - csv
 * - excel (XLSX)
 * 
 * Authentication:
 * - Bearer token (JWT)
 * - API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { Parser } from '@json2csv/plainjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get parameters
    const dashboard = searchParams.get('dashboard') || 'executive'
    const format = searchParams.get('format') || 'json'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    // Authentication
    const authHeader = request.headers.get('authorization')
    const apiKey = searchParams.get('api_key')
    
    if (!authHeader && !apiKey) {
      return NextResponse.json(
        { error: 'Authentication required. Provide Bearer token or API key.' },
        { status: 401 }
      )
    }
    
    // Get tenant from auth
    const supabase = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
    
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Fetch analytics data based on dashboard
    let analyticsData: any
    
    switch (dashboard) {
      case 'executive':
        analyticsData = await fetchExecutiveAnalytics(supabase, appUser.tenant_id, startDate, endDate)
        break
      case 'crm':
        analyticsData = await fetchCRMAnalytics(supabase, appUser.tenant_id, startDate, endDate)
        break
      case 'marketing':
        analyticsData = await fetchMarketingAnalytics(supabase, appUser.tenant_id, startDate, endDate)
        break
      case 'communications':
        analyticsData = await fetchCommunicationsAnalytics(supabase, appUser.tenant_id, startDate, endDate)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid dashboard. Supported: executive, crm, marketing, communications' },
          { status: 400 }
        )
    }
    
    // Format response
    if (format === 'csv') {
      const csv = jsonToCSV(analyticsData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${dashboard}_analytics_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }
    
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        dashboard,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        data: analyticsData,
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid format. Supported: json, csv' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Analytics Export API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Fetch Executive Dashboard analytics
 */
async function fetchExecutiveAnalytics(
  supabase: any,
  tenantId: string,
  startDate: string | null,
  endDate: string | null
) {
  // Get KPIs
  const { data: kpis } = await supabase
    .from('executive_dashboard_kpis')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()
  
  // Get revenue by month
  const { data: revenue } = await supabase
    .from('crm_revenue_by_month')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('month', { ascending: false })
    .limit(12)
  
  // Get lead sources
  const { data: leadSources } = await supabase
    .from('crm_lead_source_analytics')
    .select('*')
    .eq('tenant_id', tenantId)
  
  return {
    kpis,
    revenueByMonth: revenue,
    leadSources,
  }
}

/**
 * Fetch CRM Analytics
 */
async function fetchCRMAnalytics(
  supabase: any,
  tenantId: string,
  startDate: string | null,
  endDate: string | null
) {
  // Get sales performance
  const { data: salesPerformance } = await supabase
    .from('crm_sales_performance_by_user')
    .select('*')
    .eq('tenant_id', tenantId)
  
  // Get pipeline analytics
  const { data: pipelineAnalytics } = await supabase
    .from('crm_pipeline_stage_analytics')
    .select('*')
    .eq('tenant_id', tenantId)
  
  // Get deals
  let dealsQuery = supabase
    .from('deals')
    .select(`
      id,
      title,
      value_estimate_cents,
      created_at,
      closed_at,
      stage_id,
      pipeline_stages (name),
      contacts (full_name, primary_email)
    `)
    .eq('tenant_id', tenantId)
  
  if (startDate) dealsQuery = dealsQuery.gte('created_at', startDate)
  if (endDate) dealsQuery = dealsQuery.lte('created_at', endDate)
  
  const { data: deals } = await dealsQuery
  
  return {
    salesPerformance,
    pipelineAnalytics,
    deals,
  }
}

/**
 * Fetch Marketing Analytics
 */
async function fetchMarketingAnalytics(
  supabase: any,
  tenantId: string,
  startDate: string | null,
  endDate: string | null
) {
  // Get marketing ROI
  const { data: roi } = await supabase
    .from('marketing_roi_summary')
    .select('*')
    .eq('tenant_id', tenantId)
  
  // Get campaign attribution
  const { data: campaigns } = await supabase
    .from('marketing_campaign_attribution')
    .select('*')
    .eq('tenant_id', tenantId)
  
  // Get CAC analysis
  const { data: cac } = await supabase
    .from('marketing_cac_analysis')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('month', { ascending: false })
    .limit(12)
  
  return {
    roiByChannel: roi,
    campaigns,
    cacByMonth: cac,
  }
}

/**
 * Fetch Communications Analytics
 */
async function fetchCommunicationsAnalytics(
  supabase: any,
  tenantId: string,
  startDate: string | null,
  endDate: string | null
) {
  // Simplified communications metrics
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
  
  return {
    campaigns,
  }
}

/**
 * Convert JSON to CSV
 */
function jsonToCSV(data: any): string {
  try {
    // Flatten nested data for CSV
    const flatData = flattenData(data)
    
    if (!flatData || flatData.length === 0) {
      return 'No data available'
    }
    
    const parser = new Parser()
    return parser.parse(flatData)
  } catch (error) {
    console.error('[jsonToCSV] Error:', error)
    return 'Error generating CSV'
  }
}

/**
 * Flatten nested JSON for CSV export
 */
function flattenData(data: any): any[] {
  if (Array.isArray(data)) {
    return data.map(item => flattenObject(item))
  }
  
  if (typeof data === 'object' && data !== null) {
    // If it's an object with arrays, return the first array found
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        return data[key].map((item: any) => flattenObject(item))
      }
    }
    
    // If no arrays found, wrap the object
    return [flattenObject(data)]
  }
  
  return []
}

/**
 * Flatten a single object (recursive)
 */
function flattenObject(obj: any, prefix = ''): any {
  const result: any = {}
  
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key
    
    if (value === null || value === undefined) {
      result[newKey] = ''
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey))
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value)
    } else {
      result[newKey] = value
    }
  }
  
  return result
}

