/**
 * Marketing Audit API - Get Competitors
 * 
 * GET /api/marketing-audit/competitors?auditId=xxx
 * 
 * Returns competitors for a specific audit run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    let auditId = searchParams.get('auditId');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!auditId) {
      // Get latest audit's competitors
      const { data: latestAudit } = await supabase
        .from('marketing_audit_runs')
        .select('id')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!latestAudit) {
        return NextResponse.json({ competitors: [] });
      }
      
      auditId = latestAudit.id;
    }
    
    // Get competitors
    const { data: competitors, error } = await supabase
      .from('audit_competitors')
      .select('*')
      .eq('run_id', auditId)
      .order('rank', { ascending: true });
    
    if (error) {
      console.error('[Competitors API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
    }
    
    return NextResponse.json({
      competitors: competitors || [],
      total: competitors?.length || 0,
    });
    
  } catch (error) {
    console.error('[Competitors API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

