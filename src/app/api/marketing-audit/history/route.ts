/**
 * Marketing Audit API - Audit History Endpoint
 * 
 * GET /api/marketing-audit/history?limit=10&offset=0
 * 
 * Returns paginated audit history for the current practice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
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
    
    // Get audit history
    const { data: audits, error, count } = await supabase
      .from('marketing_audit_runs')
      .select('*', { count: 'exact' })
      .eq('practice_id', practice.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[History API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
    
    return NextResponse.json({
      audits: audits || [],
      total: count || 0,
      limit,
      offset,
    });
    
  } catch (error) {
    console.error('[History API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

