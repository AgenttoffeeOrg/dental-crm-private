/**
 * Phase 2b.1.b.2 — shared role gate for Google Ads Settings routes.
 *
 * Every route under `/api/integrations/google-ads/` (except the OAuth callback,
 * which Google calls without session cookies) requires the caller to be in one
 * of the management roles: owner, super_admin, admin.
 *
 * TODO(rbac): F02 §13 Phase B — replace this string-based role check with the
 * permission-aware `user_has_permission(user_id, tenant_id, 'settings.integrations.manage')`
 * RPC once the cross-app RBAC migration lands. Today we match the role-based
 * pattern used by the rest of the settings routes (per F02 §3) so the gate is
 * consistent across the surface area.
 */

const ALLOWED_ROLES = new Set(['owner', 'super_admin', 'admin'])

export function isManagementRole(role: string | undefined | null): boolean {
  if (!role) return false
  return ALLOWED_ROLES.has(role)
}

export const MANAGEMENT_ROLE_LIST: readonly string[] = ['owner', 'super_admin', 'admin']
