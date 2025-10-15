/**
 * Marketing Audit API - Run Audit Endpoint
 * 
 * POST /api/marketing-audit/run
 * 
 * Triggers a new marketing audit for the current practice.
 * Runs asynchronously and returns immediately with audit_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AuditOrchestrator } from '@/lib/marketing-audit/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's app_user record to get tenant_id
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get practice for this tenant
    const { data: practice, error: practiceError } = await supabase
      .from('practices')
      .select('*')
      .eq('tenant_id', appUser.tenant_id)
      .single();
    
    if (practiceError || !practice) {
      return NextResponse.json(
        { error: 'Practice not found. Please set up your practice first.' },
        { status: 404 }
      );
    }
    
    if (!practice.domain) {
      return NextResponse.json(
        { error: 'Practice domain not configured. Please add your website URL in Settings.' },
        { status: 400 }
      );
    }
    
    // Create audit run record
    const { data: auditRun, error: createError } = await supabase
      .from('marketing_audit_runs')
      .insert({
        practice_id: practice.id,
        domain: practice.domain,
        status: 'pending',
        run_type: 'manual',
        phase: 1, // Phase 1 for MVP
        created_by: user.id,
        tenant_id: appUser.tenant_id,
        api_calls: {},
        api_costs_usd: 0,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('[Audit API] Failed to create audit run:', createError);
      return NextResponse.json(
        { error: 'Failed to create audit run' },
        { status: 500 }
      );
    }
    
    console.log(`[Audit API] Created audit run ${auditRun.id} for practice ${practice.name}`);
    
    // Run audit asynchronously (don't await - return immediately)
    const orchestrator = new AuditOrchestrator(supabase);
    
    // Fire and forget
    orchestrator.runAudit(auditRun.id, {
      ...practice,
      google_access_token: null, // TODO: Fetch from api_credentials table
    }).catch(async (error) => {
      console.error('[Audit API] Audit execution failed:', error);
      
      // Update audit status to failed
      await supabase
        .from('marketing_audit_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_details: { stack: error.stack },
        })
        .eq('id', auditRun.id);
    });
    
    return NextResponse.json({
      success: true,
      audit_id: auditRun.id,
      status: 'running',
      message: 'Audit started. This will take 2-3 minutes to complete.',
      estimated_completion: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    });
    
  } catch (error) {
    console.error('[Audit API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

