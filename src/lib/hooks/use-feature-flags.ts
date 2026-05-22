/**
 * Feature Flags Hook (env-driven, pre-launch)
 *
 * Lightweight, synchronous flag bag used by /automations, the new
 * wizard, and the marketing audit. Pre-launch policy: everything is
 * unlocked — gating happens via tenant_entitlements + tenant_feature_flags
 * at the DB layer (see src/hooks/use-feature-flags.ts).
 *
 * The return shape intentionally satisfies BOTH consumer patterns:
 *   const flags = useFeatureFlags()
 *   const { featureFlags } = useFeatureFlags()
 * because both are used in the wild (dashboard-layout uses the first,
 * the Automations pages use the second). Fixing them all in one go is
 * a separate cleanup pass.
 */

export interface FeatureFlags {
  marketing: { enabled: boolean }
  marketingAudit: { enabled: boolean; phase: 1 | 2 | 3 }
}

const ALL_UNLOCKED: FeatureFlags = {
  marketing: { enabled: true },
  marketingAudit: { enabled: true, phase: 3 },
}

export function useFeatureFlags() {
  return Object.assign({}, ALL_UNLOCKED, { featureFlags: ALL_UNLOCKED })
}

/**
 * Server-side feature flag checker. Same policy as the hook above.
 */
export function getFeatureFlags(): FeatureFlags {
  return ALL_UNLOCKED
}
