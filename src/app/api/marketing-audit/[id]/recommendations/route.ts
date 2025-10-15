/**
 * Marketing Audit API - Get Recommendations
 * 
 * GET /api/marketing-audit/[id]/recommendations?status=pending&category=technical_seo
 * 
 * Returns recommendations for a specific audit run.
 * Supports filtering by status and category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const auditId = params.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Build query
    let query = supabase
      .from('audit_recommendations')
      .select('*')
      .eq('run_id', auditId);
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: recommendations, error } = await query.order('priority_score', { ascending: false });
    
    if (error) {
      console.error('[Recommendations API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }
    
    // Calculate summary stats
    const stats = {
      total: recommendations?.length || 0,
      by_impact: {
        high: recommendations?.filter(r => r.impact === 'high').length || 0,
        medium: recommendations?.filter(r => r.impact === 'medium').length || 0,
        low: recommendations?.filter(r => r.impact === 'low').length || 0,
      },
      by_status: {
        pending: recommendations?.filter(r => r.status === 'pending').length || 0,
        in_progress: recommendations?.filter(r => r.status === 'in_progress').length || 0,
        completed: recommendations?.filter(r => r.status === 'completed').length || 0,
        dismissed: recommendations?.filter(r => r.status === 'dismissed').length || 0,
      },
      total_estimated_hours: recommendations?.reduce((sum, r) => sum + (r.estimated_hours || 0), 0) || 0,
    };
    
    return NextResponse.json({
      recommendations: recommendations || [],
      stats,
    });
    
  } catch (error) {
    console.error('[Recommendations API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

