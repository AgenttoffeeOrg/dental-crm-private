/**
 * Marketing Audit API - Dismiss Recommendation
 * 
 * PATCH /api/marketing-audit/[id]/recommendations/[recId]/dismiss
 * 
 * Marks a recommendation as dismissed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; recId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { recId } = params;
    const body = await request.json();
    const { reason } = body;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Update recommendation
    const { data, error } = await supabase
      .from('audit_recommendations')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_reason: reason || 'No reason provided',
      })
      .eq('id', recId)
      .select()
      .single();
    
    if (error) {
      console.error('[Dismiss Recommendation API] Error:', error);
      return NextResponse.json({ error: 'Failed to dismiss recommendation' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      recommendation: data,
    });
    
  } catch (error) {
    console.error('[Dismiss Recommendation API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

