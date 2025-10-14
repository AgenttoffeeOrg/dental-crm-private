/**
 * API ENDPOINT: Track Marketing Link Click
 * Detects high-intent clicks and auto-creates tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { handleHighIntentClick, isHighIntentClick } from '@/lib/marketing/intent-detector';
import { addTouchpoint, type MarketingTouchpoint } from '@/lib/marketing/attribution';
import { withMarketingCheck } from '@/lib/marketing/api-middleware';

export async function POST(req: NextRequest) {
  // Check Marketing enabled
  const allowed = await withMarketingCheck(req);
  if (allowed instanceof NextResponse) return allowed;

  try {
    const body = await req.json();
    const { contactId, dealId, clickedUrl, campaignId, campaignName } = body;

    // Get tenant ID
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tenantId = appUser.tenant_id;

    // Log the click activity
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      deal_id: dealId,
      activity_type: 'link_click',
      activity_timestamp: new Date().toISOString(),
      notes: `Clicked: ${clickedUrl}`,
      marketing_campaign_id: campaignId,
      marketing_event_type: 'link_clicked',
    });

    // Add touchpoint for attribution
    const touchpoint: MarketingTouchpoint = {
      campaignId,
      campaignName,
      type: 'link_clicked',
      timestamp: new Date().toISOString(),
    };
    await addTouchpoint(contactId, touchpoint);

    // Check if high-intent click
    const isHighIntent = isHighIntentClick(clickedUrl);
    
    if (isHighIntent) {
      // Auto-create urgent task, add hot_lead tag, notify owner
      await handleHighIntentClick(contactId, dealId, clickedUrl, campaignId, tenantId);
      
      return NextResponse.json({
        success: true,
        highIntent: true,
        message: 'High-intent click detected - urgent task created',
      });
    }

    return NextResponse.json({
      success: true,
      highIntent: false,
      message: 'Click tracked successfully',
    });
  } catch (error) {
    console.error('[Marketing API] Click tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}



