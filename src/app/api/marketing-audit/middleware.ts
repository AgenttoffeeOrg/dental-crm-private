/**
 * Marketing Audit API - Middleware
 * 
 * Reusable middleware for:
 * - Authentication verification
 * - Rate limiting
 * - Request validation
 * - Response standardization
 */

import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Verify user authentication and return user + practice data
 */
export async function verifyAuth(request: NextRequest) {
  const supabase = createServerClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  // Get app_user and tenant_id
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, tenant_id')
    .eq('id', user.id)
    .single();
  
  if (!appUser) {
    return { error: 'User not found', status: 404 };
  }
  
  // Get practice
  const { data: practice } = await supabase
    .from('practices')
    .select('*')
    .eq('tenant_id', appUser.tenant_id)
    .single();
  
  if (!practice) {
    return { error: 'Practice not found', status: 404 };
  }
  
  return {
    user,
    appUser,
    practice,
    supabase,
  };
}

/**
 * Standardize API success responses
 */
export function successResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardize API error responses
 */
export function errorResponse(error: string, details?: any) {
  return {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate request body against schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: any
): Promise<{ data?: T; error?: string }> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { data: validated };
  } catch (error) {
    return { error: 'Invalid request body' };
  }
}

