import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FeatureFlagAssignment,
  FeatureFlagAuditLog,
  FeatureFlagRegistry,
} from '@/types/database'
import { createServiceClient } from '@/lib/supabase-server'

export interface NormalizedFeatureFlag {
  key: string
  name: string
  description?: string | null
  category: string
  rolloutType: string
  defaultEnabled: boolean
  allowTenantOverride: boolean
  effectiveEnabled: boolean
  variant?: string | null
  source: 'default' | 'global' | 'tenant'
  reason?: string | null
  updatedAt?: string | null
  lastAudit?: FeatureFlagAuditLog | null
  metadata?: Record<string, any>
}

function coerceBoolean(value: any, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (value === null || value === undefined) return fallback
  return Boolean(value)
}

function mapAssignments(assignments: FeatureFlagAssignment[] = []) {
  const byFlag = new Map<string, FeatureFlagAssignment>()
  for (const assignment of assignments) {
    byFlag.set(assignment.flag_id, assignment)
  }
  return byFlag
}

export async function loadFeatureFlagsForTenant(
  tenantId: string,
  options?: { supabase?: SupabaseClient<any, 'public', any>; environment?: string }
): Promise<NormalizedFeatureFlag[]> {
  const supabase = options?.supabase ?? createServiceClient()
  const environment = options?.environment ?? 'production'

  const [{ data: registry }, { data: globalAssignments }, { data: tenantAssignments }, { data: auditLog }] =
    await Promise.all([
      supabase
        .from('feature_flag_registry')
        .select('*')
        .order('name', { ascending: true }),
      supabase
        .from('feature_flag_assignments')
        .select('*')
        .is('tenant_id', null)
        .eq('environment', environment),
      supabase
        .from('feature_flag_assignments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('environment', environment),
      supabase
        .from('feature_flag_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('environment', environment)
        .order('performed_at', { ascending: false }),
    ])

  const globalMap = mapAssignments((globalAssignments as FeatureFlagAssignment[]) || [])
  const tenantMap = mapAssignments((tenantAssignments as FeatureFlagAssignment[]) || [])

  const auditByFlag = new Map<string, FeatureFlagAuditLog>()
  if (auditLog) {
    for (const entry of auditLog as FeatureFlagAuditLog[]) {
      if (!auditByFlag.has(entry.flag_id ?? '')) {
        auditByFlag.set(entry.flag_id ?? '', entry)
      }
    }
  }

  const flags: NormalizedFeatureFlag[] = []

  for (const record of (registry as FeatureFlagRegistry[]) || []) {
    const globalAssignment = globalMap.get(record.id)
    const tenantAssignment = tenantMap.get(record.id)

    let effectiveEnabled = record.default_enabled
    let source: NormalizedFeatureFlag['source'] = 'default'
    let variant: string | null = null
    let reason: string | null = null
    let updatedAt: string | null = record.updated_at

    if (globalAssignment) {
      effectiveEnabled = coerceBoolean(globalAssignment.enabled, effectiveEnabled)
      variant = globalAssignment.variant ?? null
      reason = globalAssignment.reason ?? null
      updatedAt = globalAssignment.updated_at ?? updatedAt
      source = 'global'
    }

    if (tenantAssignment) {
      effectiveEnabled = coerceBoolean(tenantAssignment.enabled, effectiveEnabled)
      variant = tenantAssignment.variant ?? variant
      reason = tenantAssignment.reason ?? reason
      updatedAt = tenantAssignment.updated_at ?? updatedAt
      source = 'tenant'
    }

    flags.push({
      key: record.flag_key,
      name: record.name,
      description: record.description,
      category: record.category,
      rolloutType: record.rollout_type,
      defaultEnabled: record.default_enabled,
      allowTenantOverride: record.allow_tenant_override,
      effectiveEnabled,
      variant,
      source,
      reason,
      updatedAt,
      metadata: record.metadata,
      lastAudit: auditByFlag.get(record.id) ?? null,
    })
  }

  return flags
}

export async function getFeatureFlagRegistry(
  options?: { supabase?: SupabaseClient<any, 'public', any> }
): Promise<FeatureFlagRegistry[]> {
  const supabase = options?.supabase ?? createServiceClient()
  const { data } = await supabase.from('feature_flag_registry').select('*').order('name', { ascending: true })
  return (data as FeatureFlagRegistry[]) || []
}



