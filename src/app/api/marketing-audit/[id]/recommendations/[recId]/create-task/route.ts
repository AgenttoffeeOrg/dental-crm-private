/**
 * Marketing Audit API - Create Task from Recommendation
 * 
 * POST /api/marketing-audit/[id]/recommendations/[recId]/create-task
 * 
 * Creates a CRM task from an audit recommendation.
 * Pre-fills task with recommendation details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; recId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: auditId, recId } = params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's app_user and tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get the recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('audit_recommendations')
      .select('*')
      .eq('id', recId)
      .eq('run_id', auditId)
      .single();
    
    if (recError || !recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }
    
    // Create task in CRM
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: recommendation.title,
        description: recommendation.description + '\n\nAction Steps:\n' + (recommendation.action_steps || []).map((step: string, i: number) => `${i + 1}. ${step}`).join('\n'),
        priority: recommendation.impact === 'high' ? 'high' : recommendation.impact === 'medium' ? 'medium' : 'low',
        status: 'pending',
        estimated_hours: recommendation.estimated_hours,
        tenant_id: appUser.tenant_id,
        created_by: appUser.id,
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('[Create Task API] Error creating task:', taskError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
    
    // Link task to recommendation
    await supabase
      .from('audit_recommendations')
      .update({
        task_id: task.id,
        status: 'in_progress',
      })
      .eq('id', recId);
    
    return NextResponse.json({
      success: true,
      task,
      message: 'Task created successfully',
    });
    
  } catch (error) {
    console.error('[Create Task API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

