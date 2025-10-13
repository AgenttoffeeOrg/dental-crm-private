/**
 * ========================================
 * MARKETING FEATURE FLAGS SYSTEM
 * ========================================
 * 
 * Controls when Marketing features are visible/active
 * 
 * Philosophy:
 * - Marketing DISABLED by default
 * - CRM works identically when disabled
 * - Features conditionally render
 * - Zero performance impact when disabled
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

// ========================================
// TYPES
// ========================================

export interface MarketingSettings {
  enabled: boolean;
  plan: 'none' | 'starter' | 'pro' | 'enterprise';
  enabledAt: string | null;
  tenantId: string;
}

export interface MarketingFlags {
  enabled: boolean;
  hasJourneys: boolean;
  hasAB: boolean;
  hasSMS: boolean;
  hasLandingPages: boolean;
}

// ========================================
// SERVER-SIDE FUNCTIONS (Safe for Server Components)
// ========================================

/**
 * Check if Marketing is enabled for a tenant
 * @param tenantId - The tenant UUID
 * @returns Promise<boolean>
 */
export async function isMarketingEnabledServer(tenantId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .select('marketing_enabled')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      console.error('[Marketing] Error checking flag:', error);
      return false;
    }

    return data.marketing_enabled ?? false;
  } catch (error) {
    console.error('[Marketing] Exception checking flag:', error);
    return false;
  }
}

/**
 * Get full Marketing settings for a tenant
 * @param tenantId - The tenant UUID
 * @returns Promise<MarketingSettings | null>
 */
export async function getMarketingSettingsServer(
  tenantId: string
): Promise<MarketingSettings | null> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .select('marketing_enabled, marketing_plan, marketing_enabled_at')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      console.error('[Marketing] Error fetching settings:', error);
      return null;
    }

    return {
      enabled: data.marketing_enabled ?? false,
      plan: data.marketing_plan ?? 'none',
      enabledAt: data.marketing_enabled_at,
      tenantId,
    };
  } catch (error) {
    console.error('[Marketing] Exception fetching settings:', error);
    return null;
  }
}

/**
 * Get granular feature flags based on plan
 * @param tenantId - The tenant UUID
 * @returns Promise<MarketingFlags>
 */
export async function getMarketingFlagsServer(tenantId: string): Promise<MarketingFlags> {
  const settings = await getMarketingSettingsServer(tenantId);
  
  if (!settings || !settings.enabled) {
    return {
      enabled: false,
      hasJourneys: false,
      hasAB: false,
      hasSMS: false,
      hasLandingPages: false,
    };
  }

  // Feature availability by plan
  const planFeatures = {
    none: { journeys: false, ab: false, sms: false, landingPages: false },
    starter: { journeys: false, ab: false, sms: false, landingPages: true },
    pro: { journeys: true, ab: true, sms: true, landingPages: true },
    enterprise: { journeys: true, ab: true, sms: true, landingPages: true },
  };

  const features = planFeatures[settings.plan];

  return {
    enabled: true,
    hasJourneys: features.journeys,
    hasAB: features.ab,
    hasSMS: features.sms,
    hasLandingPages: features.landingPages,
  };
}

/**
 * Enable Marketing for a tenant
 * @param tenantId - The tenant UUID
 * @param plan - The marketing plan tier
 * @returns Promise<boolean> success
 */
export async function enableMarketing(
  tenantId: string,
  plan: 'starter' | 'pro' | 'enterprise' = 'starter'
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('tenants')
      .update({
        marketing_enabled: true,
        marketing_plan: plan,
        marketing_enabled_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      console.error('[Marketing] Error enabling:', error);
      return false;
    }

    console.log(`[Marketing] ✅ Enabled for tenant ${tenantId} (${plan})`);
    return true;
  } catch (error) {
    console.error('[Marketing] Exception enabling:', error);
    return false;
  }
}

/**
 * Disable Marketing for a tenant (data preserved)
 * @param tenantId - The tenant UUID
 * @returns Promise<boolean> success
 */
export async function disableMarketing(tenantId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('tenants')
      .update({
        marketing_enabled: false,
        marketing_plan: 'none',
      })
      .eq('id', tenantId);

    if (error) {
      console.error('[Marketing] Error disabling:', error);
      return false;
    }

    console.log(`[Marketing] ⚠️  Disabled for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('[Marketing] Exception disabling:', error);
    return false;
  }
}

// ========================================
// CLIENT-SIDE HOOKS (For Client Components)
// ========================================

/**
 * React Hook: Check if Marketing is enabled
 * @param tenantId - The tenant UUID
 * @returns { enabled: boolean, loading: boolean }
 */
export function useMarketingEnabled(tenantId: string | null) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!tenantId) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    async function checkFlag() {
      const isEnabled = await isMarketingEnabledServer(tenantId);
      setEnabled(isEnabled);
      setLoading(false);
    }

    checkFlag();
  }, [tenantId]);

  return { enabled, loading };
}

/**
 * React Hook: Get full Marketing settings
 * @param tenantId - The tenant UUID
 * @returns { settings: MarketingSettings | null, loading: boolean }
 */
export function useMarketingSettings(tenantId: string | null) {
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!tenantId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    async function fetchSettings() {
      const data = await getMarketingSettingsServer(tenantId);
      setSettings(data);
      setLoading(false);
    }

    fetchSettings();
  }, [tenantId]);

  return { settings, loading };
}

/**
 * React Hook: Get granular feature flags
 * @param tenantId - The tenant UUID
 * @returns { flags: MarketingFlags, loading: boolean }
 */
export function useMarketingFlags(tenantId: string | null) {
  const [flags, setFlags] = useState<MarketingFlags>({
    enabled: false,
    hasJourneys: false,
    hasAB: false,
    hasSMS: false,
    hasLandingPages: false,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!tenantId) {
      setFlags({
        enabled: false,
        hasJourneys: false,
        hasAB: false,
        hasSMS: false,
        hasLandingPages: false,
      });
      setLoading(false);
      return;
    }

    async function fetchFlags() {
      const data = await getMarketingFlagsServer(tenantId);
      setFlags(data);
      setLoading(false);
    }

    fetchFlags();
  }, [tenantId]);

  return { flags, loading };
}

// ========================================
// HELPER: Get Tenant ID from Session
// ========================================

/**
 * Get current tenant ID from Supabase session
 * (Placeholder - adapt to your auth system)
 */
export async function getCurrentTenantId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Get tenant from app_users table
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    return appUser?.tenant_id ?? null;
  } catch (error) {
    console.error('[Marketing] Error getting tenant ID:', error);
    return null;
  }
}

// ========================================
// DEBUGGING
// ========================================

/**
 * Debug: Log current Marketing status
 */
export async function debugMarketingStatus(tenantId: string) {
  console.log('========================================');
  console.log('MARKETING STATUS DEBUG');
  console.log('========================================');
  
  const settings = await getMarketingSettingsServer(tenantId);
  const flags = await getMarketingFlagsServer(tenantId);
  
  console.log('Settings:', JSON.stringify(settings, null, 2));
  console.log('Flags:', JSON.stringify(flags, null, 2));
  console.log('========================================');
}

