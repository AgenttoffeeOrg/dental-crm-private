/**
 * Marketing Audit API - Get Metrics
 * 
 * GET /api/marketing-audit/[id]/metrics?category=technical
 * 
 * Returns detailed metrics for a specific audit run.
 * Optionally filter by category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const auditId = params.id;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Build query
    let query = supabase
      .from('audit_metrics')
      .select('*')
      .eq('run_id', auditId);
    
    // Filter by category if specified
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: metrics, error } = await query.order('collected_at', { ascending: false });
    
    if (error) {
      console.error('[Metrics API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
    
    // Group by category
    const grouped = (metrics || []).reduce((acc, metric) => {
      const cat = metric.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(metric);
      return acc;
    }, {} as Record<string, any[]>);
    
    return NextResponse.json({
      metrics: metrics || [],
      grouped,
      total: metrics?.length || 0,
    });
    
  } catch (error) {
    console.error('[Metrics API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

