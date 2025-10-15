/**
 * API Route: PDF Preview
 * 
 * GET /api/marketing-audit/[id]/pdf-preview
 * 
 * Generate preview of PDF before download.
 * UX: Let users see what they're getting before downloading.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, successResponse, errorResponse } from '../../middleware';
import { FullPDFGenerator } from '@/lib/marketing-audit/pdf/full-pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if ('error' in auth) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status });
  }
  
  const { supabase, appUser } = auth;
  const auditId = params.id;
  
  // Get audit with all data
  const { data: audit, error: auditError } = await supabase
    .from('marketing_audit_runs')
    .select(`
      *,
      practice:practices(*),
      recommendations:marketing_audit_recommendations(*)
    `)
    .eq('id', auditId)
    .eq('tenant_id', appUser.tenant_id)
    .single();
  
  if (auditError || !audit) {
    return NextResponse.json(errorResponse('Audit not found'), { status: 404 });
  }
  
  // Get branding config
  const { data: brandingConfig } = await supabase
    .from('practice_branding')
    .select('*')
    .eq('practice_id', audit.practice.id)
    .single();
  
  const branding = brandingConfig || {
    primary_color: '#8B5CF6',
    secondary_color: '#3B82F6',
    company_name: audit.practice.name,
  };
  
  try {
    // Generate PDF
    const generator = new FullPDFGenerator({
      branding,
      includeEvidence: true,
      includeCompetitors: true,
      includeActionSteps: true,
    });
    
    const pdfBuffer = await generator.generate(
      audit,
      audit.recommendations || [],
      audit.practice
    );
    
    // Return PDF preview info (not the full PDF)
    return NextResponse.json(successResponse({
      size_bytes: pdfBuffer.length,
      estimated_pages: Math.ceil(pdfBuffer.length / 50000), // Rough estimate
      branding: {
        company_name: branding.company_name,
        primary_color: branding.primary_color,
      },
      includes: {
        evidence: true,
        competitors: true,
        action_steps: true,
      },
    }));
  } catch (error: any) {
    console.error('[PDF Preview] Error:', error);
    return NextResponse.json(
      errorResponse('Failed to generate PDF preview', error.message),
      { status: 500 }
    );
  }
}

