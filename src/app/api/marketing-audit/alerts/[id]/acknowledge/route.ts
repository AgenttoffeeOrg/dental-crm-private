/**
 * Marketing Audit API - Acknowledge Alert
 * 
 * PATCH /api/marketing-audit/alerts/[id]/acknowledge
 * 
 * Marks an alert as acknowledged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const alertId = params.id;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Update alert
    const { data, error } = await supabase
      .from('audit_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) {
      console.error('[Acknowledge Alert API] Error:', error);
      return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      alert: data,
    });
    
  } catch (error) {
    console.error('[Acknowledge Alert API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

