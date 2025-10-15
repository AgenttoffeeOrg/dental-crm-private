/**
 * Marketing Audit API - Alerts Endpoint
 * 
 * GET /api/marketing-audit/alerts?acknowledged=false
 * 
 * Returns alerts for the current practice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const acknowledgedParam = searchParams.get('acknowledged');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get practice
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const { data: practice } = await supabase
      .from('practices')
      .select('id')
      .eq('tenant_id', appUser.tenant_id)
      .single();
    
    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }
    
    // Build query
    let query = supabase
      .from('audit_alerts')
      .select('*')
      .eq('practice_id', practice.id)
      .order('triggered_at', { ascending: false });
    
    // Filter by acknowledged status if specified
    if (acknowledgedParam !== null) {
      query = query.eq('acknowledged', acknowledgedParam === 'true');
    }
    
    const { data: alerts, error } = await query;
    
    if (error) {
      console.error('[Alerts API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
    
    return NextResponse.json({
      alerts: alerts || [],
      total: alerts?.length || 0,
    });
    
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

