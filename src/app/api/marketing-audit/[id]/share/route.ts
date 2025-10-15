/**
 * API Route: Create Shareable Link for Audit
 * 
 * POST /api/marketing-audit/[id]/share
 * 
 * Architecture: Generate secure, expiring share links.
 * UX: Share audit results with team members or clients.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, successResponse, errorResponse } from '../../middleware';
import { randomBytes } from 'crypto';

export async function POST(
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
  
  // Parse request body
  const body = await request.json();
  const { expires_in_days = 7, password_protected = false } = body;
  
  // Get audit
  const { data: audit, error: auditError } = await supabase
    .from('marketing_audit_runs')
    .select('id')
    .eq('id', auditId)
    .eq('tenant_id', appUser.tenant_id)
    .single();
  
  if (auditError || !audit) {
    return NextResponse.json(errorResponse('Audit not found'), { status: 404 });
  }
  
  try {
    // Generate share token
    const shareToken = randomBytes(32).toString('hex');
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);
    
    // Insert share record
    const { data: share, error: shareError } = await supabase
      .from('marketing_audit_shares')
      .insert({
        audit_id: auditId,
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        password_protected,
        created_by: appUser.id,
      })
      .select()
      .single();
    
    if (shareError) {
      throw shareError;
    }
    
    // Build share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/marketing-audit/shared/${shareToken}`;
    
    return NextResponse.json(successResponse({
      share_url: shareUrl,
      expires_at: expiresAt.toISOString(),
      share_id: share.id,
    }));
  } catch (error: any) {
    console.error('[Share] Error:', error);
    return NextResponse.json(
      errorResponse('Failed to create share link', error.message),
      { status: 500 }
    );
  }
}

/**
 * DELETE: Revoke share link
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if ('error' in auth) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status });
  }
  
  const { supabase, appUser } = auth;
  const auditId = params.id;
  
  // Delete all shares for this audit
  const { error: deleteError } = await supabase
    .from('marketing_audit_shares')
    .delete()
    .eq('audit_id', auditId)
    .eq('created_by', appUser.id);
  
  if (deleteError) {
    return NextResponse.json(
      errorResponse('Failed to revoke share links'),
      { status: 500 }
    );
  }
  
  return NextResponse.json(successResponse({
    message: 'Share links revoked successfully',
  }));
}

