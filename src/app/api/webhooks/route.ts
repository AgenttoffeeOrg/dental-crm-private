/**
 * API Route: Webhook Management
 * 
 * GET    /api/webhooks - List webhooks
 * POST   /api/webhooks - Create webhook
 * PATCH  /api/webhooks/[id] - Update webhook
 * DELETE /api/webhooks/[id] - Delete webhook
 * 
 * Architecture: Webhook CRUD with signature verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, successResponse, errorResponse } from '../marketing-audit/middleware';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if ('error' in auth) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status });
  }
  
  const { supabase, appUser } = auth;
  
  const { data: webhooks, error } = await supabase
    .from('marketing_audit_webhooks')
    .select('*')
    .eq('tenant_id', appUser.tenant_id)
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch webhooks'), { status: 500 });
  }
  
  return NextResponse.json(successResponse(webhooks || []));
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if ('error' in auth) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status });
  }
  
  const { supabase, appUser } = auth;
  const body = await request.json();
  
  // Validate required fields
  if (!body.url || !body.events || !Array.isArray(body.events)) {
    return NextResponse.json(
      errorResponse('Missing required fields: url, events'),
      { status: 400 }
    );
  }
  
  // Generate secret for signature verification
  const secret = randomBytes(32).toString('hex');
  
  // Create webhook
  const { data: webhook, error } = await supabase
    .from('marketing_audit_webhooks')
    .insert({
      tenant_id: appUser.tenant_id,
      url: body.url,
      events: body.events,
      secret,
      active: true,
      created_by: appUser.id,
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json(
      errorResponse('Failed to create webhook'),
      { status: 500 }
    );
  }
  
  return NextResponse.json(successResponse(webhook), { status: 201 });
}

