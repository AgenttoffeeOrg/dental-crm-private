/**
 * API ENDPOINT: Marketing Form Submission
 * Creates/updates CRM contacts, optionally creates deals
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { processFormSubmission, type FormSubmission, type DealCreationRules } from '@/lib/marketing/form-processor';
import { withMarketingCheck } from '@/lib/marketing/api-middleware';

export async function POST(req: NextRequest) {
  // Check Marketing enabled
  const allowed = await withMarketingCheck(req);
  if (allowed instanceof NextResponse) return allowed;

  try {
    const body = await req.json();
    const { formId, formName, payload, sourceUrl, dealRules } = body;

    // Get tenant ID from session
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const submission: FormSubmission = {
      formId,
      formName,
      payload,
      sourceUrl,
      tenantId: appUser.tenant_id,
    };

    // Process submission
    const result = await processFormSubmission(submission, dealRules as DealCreationRules);

    return NextResponse.json({
      success: true,
      contactId: result.contactId,
      dealId: result.dealId,
      message: result.dealId 
        ? 'Contact and deal created successfully' 
        : 'Contact created successfully',
    });
  } catch (error) {
    console.error('[Marketing API] Form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process form submission' },
      { status: 500 }
    );
  }
}

