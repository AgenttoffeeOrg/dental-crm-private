/**
 * Automatic Audit Logging System
 * 
 * Automatically logs ALL actions with before/after states
 * Admin-only visibility for sensitive operations
 */

import { createClient } from '@/lib/supabase-client'

export type AuditActionType = 
  | 'create' | 'update' | 'delete' | 'assign' | 'unassign' 
  | 'move' | 'archive' | 'restore' | 'export' | 'import'

export type AuditCategory = 
  | 'deal' | 'contact' | 'pipeline' | 'stage' | 'task' 
  | 'user' | 'role' | 'permission' | 'setting' | 'integration'

export interface AuditLogParams {
  userId?: string
  tenantId: string
  actionType: AuditActionType
  category: AuditCategory
  entityType: string
  entityId?: string
  entityName?: string
  description?: string
  beforeState?: Record<string, any>
  afterState?: Record<string, any>
  changedFields?: string[]
  adminOnly?: boolean
  sensitive?: boolean
  severity?: 'info' | 'warning' | 'critical'
  tags?: string[]
}

/**
 * Log an action to the audit trail
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createClient()

    // Get context (IP, user agent, etc.)
    let ipAddress: string | undefined
    let userAgent: string | undefined
    
    if (typeof window !== 'undefined') {
      userAgent = navigator.userAgent
      // IP will be captured server-side
    }

    // Determine changed fields if not provided
    let changedFields = params.changedFields
    if (!changedFields && params.beforeState && params.afterState) {
      changedFields = Object.keys(params.afterState).filter(key => {
        const before = params.beforeState![key]
        const after = params.afterState![key]
        return JSON.stringify(before) !== JSON.stringify(after)
      })
    }

    // Build audit entry
    const auditEntry = {
      tenant_id: params.tenantId,
      user_id: params.userId || null,
      action_type: params.actionType,
      action_category: params.category,
      action_description: params.description,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      before_state: params.beforeState || null,
      after_state: params.afterState || null,
      changed_fields: changedFields || [],
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: null, // TODO: Get from auth session
      visible_to_admin_only: params.adminOnly || false,
      sensitive_data: params.sensitive || false,
      tags: params.tags || [],
      severity: params.severity || 'info',
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('audit_trail')
      .insert(auditEntry)

    if (error) {
      console.error('Failed to log audit:', error)
      // Don't throw - audit logging should never break the main flow
    }

  } catch (error) {
    console.error('Error in logAudit:', error)
    // Silent fail - audit logging should never break the app
  }
}

/**
 * Log deal creation
 */
export function logDealCreated(
  userId: string,
  tenantId: string,
  deal: any
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'create',
    category: 'deal',
    entityType: 'deal',
    entityId: deal.id,
    entityName: deal.title,
    description: `Created deal "${deal.title}" (${deal.value_estimate_cents / 100} ${deal.currency})`,
    afterState: deal,
    severity: 'info',
    tags: ['deal', 'creation']
  })
}

/**
 * Log deal update with before/after
 */
export function logDealUpdated(
  userId: string,
  tenantId: string,
  dealId: string,
  dealTitle: string,
  before: any,
  after: any
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'update',
    category: 'deal',
    entityType: 'deal',
    entityId: dealId,
    entityName: dealTitle,
    description: `Updated deal "${dealTitle}"`,
    beforeState: before,
    afterState: after,
    severity: 'info',
    tags: ['deal', 'update']
  })
}

/**
 * Log deal assignment
 */
export function logDealAssigned(
  userId: string,
  tenantId: string,
  dealId: string,
  dealTitle: string,
  assignedToName: string,
  assignedToId: string
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'assign',
    category: 'deal',
    entityType: 'deal',
    entityId: dealId,
    entityName: dealTitle,
    description: `Assigned deal "${dealTitle}" to ${assignedToName}`,
    afterState: { assigned_to: assignedToId },
    severity: 'info',
    tags: ['deal', 'assignment']
  })
}

/**
 * Log deal stage change
 */
export function logDealStageChanged(
  userId: string,
  tenantId: string,
  dealId: string,
  dealTitle: string,
  fromStage: string,
  toStage: string
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'move',
    category: 'deal',
    entityType: 'deal',
    entityId: dealId,
    entityName: dealTitle,
    description: `Moved deal "${dealTitle}" from ${fromStage} to ${toStage}`,
    beforeState: { stage: fromStage },
    afterState: { stage: toStage },
    changedFields: ['stage'],
    severity: 'info',
    tags: ['deal', 'stage_change']
  })
}

/**
 * Log deal deletion
 */
export function logDealDeleted(
  userId: string,
  tenantId: string,
  dealId: string,
  dealTitle: string,
  dealData: any
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'delete',
    category: 'deal',
    entityType: 'deal',
    entityId: dealId,
    entityName: dealTitle,
    description: `Deleted deal "${dealTitle}"`,
    beforeState: dealData,
    severity: 'warning',
    adminOnly: true, // Deletions are admin-only in audit
    tags: ['deal', 'deletion']
  })
}

/**
 * Log pipeline creation
 */
export function logPipelineCreated(
  userId: string,
  tenantId: string,
  pipeline: any
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'create',
    category: 'pipeline',
    entityType: 'pipeline',
    entityId: pipeline.id,
    entityName: pipeline.name,
    description: `Created pipeline "${pipeline.name}"`,
    afterState: pipeline,
    severity: 'info',
    adminOnly: true, // Pipeline changes are admin-only
    tags: ['pipeline', 'creation']
  })
}

/**
 * Log user invitation
 */
export function logUserInvited(
  userId: string,
  tenantId: string,
  inviteeEmail: string,
  role: string
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'create',
    category: 'user',
    entityType: 'invitation',
    entityName: inviteeEmail,
    description: `Invited ${inviteeEmail} as ${role}`,
    afterState: { email: inviteeEmail, role },
    severity: 'info',
    adminOnly: true,
    sensitive: true,
    tags: ['user', 'invitation', 'security']
  })
}

/**
 * Log permission change
 */
export function logPermissionChanged(
  userId: string,
  tenantId: string,
  roleName: string,
  permissionKey: string,
  granted: boolean
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'update',
    category: 'permission',
    entityType: 'role_permission',
    entityName: roleName,
    description: `${granted ? 'Granted' : 'Revoked'} permission "${permissionKey}" for role "${roleName}"`,
    afterState: { permission: permissionKey, granted },
    severity: 'critical',
    adminOnly: true,
    sensitive: true,
    tags: ['security', 'permission', 'critical']
  })
}

/**
 * Log settings change
 */
export function logSettingsChanged(
  userId: string,
  tenantId: string,
  settingType: string,
  before: any,
  after: any
): Promise<void> {
  return logAudit({
    userId,
    tenantId,
    actionType: 'update',
    category: 'setting',
    entityType: settingType,
    description: `Updated ${settingType} settings`,
    beforeState: before,
    afterState: after,
    severity: 'warning',
    adminOnly: true,
    tags: ['settings', 'configuration']
  })
}

