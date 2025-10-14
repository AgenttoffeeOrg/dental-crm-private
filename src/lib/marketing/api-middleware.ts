/**
 * ========================================
 * MARKETING API MIDDLEWARE
 * ========================================
 * 
 * Protects Marketing API routes
 * Returns 403 if Marketing disabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { isMarketingEnabledServer, getCurrentTenantId } from './feature-flags';

/**
 * Middleware: Check if Marketing is enabled before proceeding
 * Usage in API routes:
 * 
 * export async function POST(req: NextRequest) {
 *   const allowed = await withMarketingCheck(req);
 *   if (allowed instanceof NextResponse) return allowed;
 *   
 *   // Your API logic here...
 * }
 */
export async function withMarketingCheck(
  request: NextRequest
): Promise<NextResponse | true> {
  try {
    // Get tenant ID from session
    const tenantId = await getCurrentTenantId();
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized - no tenant' },
        { status: 401 }
      );
    }

    // Check if Marketing is enabled
    const isEnabled = await isMarketingEnabledServer(tenantId);

    if (!isEnabled) {
      return NextResponse.json(
        { 
          error: 'Marketing module is not enabled', 
          code: 'MARKETING_DISABLED',
          message: 'Please enable Marketing in Settings to use this feature.'
        },
        { status: 403 }
      );
    }

    // All good, proceed with request
    return true;
  } catch (error) {
    console.error('[Marketing Middleware] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Optional: Middleware for checking specific features
 */
export async function withMarketingFeatureCheck(
  request: NextRequest,
  feature: 'journeys' | 'ab' | 'sms' | 'landingPages'
): Promise<NextResponse | true> {
  const baseCheck = await withMarketingCheck(request);
  if (baseCheck instanceof NextResponse) return baseCheck;

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Import getMarketingFlagsServer
    const { getMarketingFlagsServer } = await import('./feature-flags');
    const flags = await getMarketingFlagsServer(tenantId);

    const featureMap = {
      journeys: flags.hasJourneys,
      ab: flags.hasAB,
      sms: flags.hasSMS,
      landingPages: flags.hasLandingPages,
    };

    if (!featureMap[feature]) {
      return NextResponse.json(
        {
          error: `${feature} feature is not available in your plan`,
          code: 'FEATURE_NOT_AVAILABLE',
        },
        { status: 403 }
      );
    }

    return true;
  } catch (error) {
    console.error('[Marketing Feature Middleware] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




