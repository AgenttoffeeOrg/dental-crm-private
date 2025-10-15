/**
 * Marketing Audit API - Get Specific Audit Endpoint
 * 
 * GET /api/marketing-audit/[id]
 * DELETE /api/marketing-audit/[id]
 * 
 * Get or delete a specific audit by ID.
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get audit (RLS will ensure user can only see their tenant's data)
    const { data: audit, error } = await supabase
      .from('marketing_audit_runs')
      .select('*')
      .eq('id', auditId)
      .single();
    
    if (error || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }
    
    // Fetch related data
    const [recommendations, competitors, alerts, metrics] = await Promise.all([
      supabase
        .from('audit_recommendations')
        .select('*')
        .eq('run_id', auditId)
        .order('priority_score', { ascending: false }),
      
      supabase
        .from('audit_competitors')
        .select('*')
        .eq('run_id', auditId)
        .order('rank', { ascending: true }),
      
      supabase
        .from('audit_alerts')
        .select('*')
        .eq('run_id', auditId),
      
      supabase
        .from('audit_metrics')
        .select('*')
        .eq('run_id', auditId),
    ]);
    
    return NextResponse.json({
      audit: {
        ...audit,
        recommendations: recommendations.data || [],
        competitors: competitors.data || [],
        alerts: alerts.data || [],
        metrics: metrics.data || [],
      },
    });
    
  } catch (error) {
    console.error('[Get Audit API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const auditId = params.id;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete audit (cascade will delete related records)
    const { error } = await supabase
      .from('marketing_audit_runs')
      .delete()
      .eq('id', auditId);
    
    if (error) {
      console.error('[Delete Audit API] Error:', error);
      return NextResponse.json({ error: 'Failed to delete audit' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Delete Audit API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

