/**
 * Feature Flags Hook
 * 
 * Centralized feature flag management for the application.
 * Use this hook to conditionally enable/disable features.
 */

export interface FeatureFlags {
  marketingAudit: {
    enabled: boolean;
    phase: 1 | 2 | 3;
  };
}

export function useFeatureFlags(): FeatureFlags {
  return {
    marketingAudit: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_MARKETING_AUDIT === 'true',
      phase: parseInt(process.env.MARKETING_AUDIT_PHASE || '1', 10) as 1 | 2 | 3,
    },
  };
}

/**
 * Server-side feature flag checker
 * Use this in API routes and server components
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    marketingAudit: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_MARKETING_AUDIT === 'true',
      phase: parseInt(process.env.MARKETING_AUDIT_PHASE || '1', 10) as 1 | 2 | 3,
    },
  };
}

