/**
 * API Route: Export Audit as PDF
 * 
 * GET /api/marketing-audit/[id]/export/pdf
 * 
 * Architecture: Server-side PDF generation, streaming response.
 * UX: Clean, professional PDF reports for client presentations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, successResponse, errorResponse } from '../../../middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if ('error' in auth) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status });
  }
  
  const { supabase, appUser } = auth;
  const auditId = params.id;
  
  // Get audit
  const { data: audit, error: auditError } = await supabase
    .from('marketing_audit_runs')
    .select('*, practice:practices(*)')
    .eq('id', auditId)
    .eq('tenant_id', appUser.tenant_id)
    .single();
  
  if (auditError || !audit) {
    return NextResponse.json(errorResponse('Audit not found'), { status: 404 });
  }
  
  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const includeEvidence = searchParams.get('evidence') !== 'false';
  const includeCompetitors = searchParams.get('competitors') !== 'false';
  const includeActionSteps = searchParams.get('actionSteps') !== 'false';
  const branding = searchParams.get('branding') || 'crm';
  
  try {
    // TODO: Phase 3 - Implement PDF generation
    // For now, return a placeholder response
    
    return NextResponse.json(successResponse({
      message: 'PDF generation coming in Phase 3',
      audit_id: auditId,
      options: {
        includeEvidence,
        includeCompetitors,
        includeActionSteps,
        branding,
      },
    }));
  } catch (error: any) {
    console.error('[PDF Export] Error:', error);
    return NextResponse.json(
      errorResponse('Failed to generate PDF', error.message),
      { status: 500 }
    );
  }
}

