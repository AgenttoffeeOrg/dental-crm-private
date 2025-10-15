/**
 * Marketing Audit API - Get Latest Audit
 * 
 * GET /api/marketing-audit/latest
 * 
 * Returns the most recent completed audit for the current practice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's tenant_id
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get practice
    const { data: practice } = await supabase
      .from('practices')
      .select('id')
      .eq('tenant_id', appUser.tenant_id)
      .single();
    
    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }
    
    // Get latest completed audit
    const { data: audit, error } = await supabase
      .from('marketing_audit_runs')
      .select('*')
      .eq('practice_id', practice.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[Latest Audit API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit' },
        { status: 500 }
      );
    }
    
    if (!audit) {
      return NextResponse.json(
        { audit: null, message: 'No completed audits yet' },
        { status: 200 }
      );
    }
    
    // Fetch related data
    const [recommendations, competitors, alerts, metrics] = await Promise.all([
      supabase
        .from('audit_recommendations')
        .select('*')
        .eq('run_id', audit.id)
        .order('priority_score', { ascending: false }),
      
      supabase
        .from('audit_competitors')
        .select('*')
        .eq('run_id', audit.id)
        .order('rank', { ascending: true }),
      
      supabase
        .from('audit_alerts')
        .select('*')
        .eq('run_id', audit.id)
        .eq('acknowledged', false)
        .order('triggered_at', { ascending: false }),
      
      supabase
        .from('audit_metrics')
        .select('*')
        .eq('run_id', audit.id),
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
    console.error('[Latest Audit API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

