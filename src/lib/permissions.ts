/**
 * Role-Based Permissions System
 * 
 * Defines what each role can do in the system
 */

export type UserRole = 'owner' | 'manager' | 'staff' | 'viewer'

export interface PermissionCheck {
  userId: string
  userRole: UserRole
  resourceOwnerId?: string
  tenantId: string
}

/**
 * Permission matrix defining what each role can do
 */
export const PERMISSIONS = {
  // Deal permissions
  deals: {
    viewAll: ['owner', 'manager'],
    viewOwn: ['owner', 'manager', 'staff', 'viewer'],
    create: ['owner', 'manager', 'staff'],
    editAll: ['owner', 'manager'],
    editOwn: ['owner', 'manager', 'staff'],
    deleteAll: ['owner', 'manager'],
    deleteOwn: ['owner', 'manager', 'staff'],
    assignToOthers: ['owner', 'manager'],
    assignToSelf: ['owner', 'manager', 'staff'],
  },

  // Contact permissions
  contacts: {
    viewAll: ['owner', 'manager', 'staff', 'viewer'],
    create: ['owner', 'manager', 'staff'],
    edit: ['owner', 'manager', 'staff'],
    delete: ['owner', 'manager'],
  },

  // Pipeline permissions
  pipelines: {
    view: ['owner', 'manager', 'staff', 'viewer'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    manageStages: ['owner', 'manager'],
  },

  // Task permissions
  tasks: {
    viewAll: ['owner', 'manager'],
    viewOwn: ['owner', 'manager', 'staff', 'viewer'],
    create: ['owner', 'manager', 'staff'],
    editAll: ['owner', 'manager'],
    editOwn: ['owner', 'manager', 'staff'],
    deleteAll: ['owner', 'manager'],
    deleteOwn: ['owner', 'manager', 'staff'],
  },

  // User/Team permissions
  users: {
    invite: ['owner', 'manager'],
    viewAll: ['owner', 'manager'],
    editRoles: ['owner'],
    remove: ['owner'],
  },

  // Settings permissions
  settings: {
    viewAll: ['owner', 'manager', 'staff', 'viewer'],
    editTeam: ['owner'],
    editPipelines: ['owner', 'manager'],
    editIntegrations: ['owner', 'manager'],
    editTreatments: ['owner', 'manager', 'staff'],
  },

  // Analytics permissions
  analytics: {
    viewOwn: ['owner', 'manager', 'staff', 'viewer'],
    viewTeam: ['owner', 'manager'],
    viewAll: ['owner'],
  },
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  category: keyof typeof PERMISSIONS,
  action: string,
  userRole: UserRole
): boolean {
  const categoryPerms = PERMISSIONS[category] as Record<string, UserRole[]>
  const allowedRoles = categoryPerms[action]
  
  if (!allowedRoles) {
    console.warn(`Unknown permission: ${String(category)}.${action}`)
    return false
  }
  
  return allowedRoles.includes(userRole)
}

/**
 * Check if user can view a specific deal
 */
export function canViewDeal(check: PermissionCheck): boolean {
  // Owners and managers can view all deals
  if (hasPermission('deals', 'viewAll', check.userRole)) {
    return true
  }
  
  // Staff and viewers can view their own deals
  if (check.resourceOwnerId === check.userId && hasPermission('deals', 'viewOwn', check.userRole)) {
    return true
  }
  
  // Staff can view unassigned deals (to claim them)
  if (!check.resourceOwnerId && check.userRole === 'staff') {
    return true
  }
  
  return false
}

/**
 * Check if user can edit a specific deal
 */
export function canEditDeal(check: PermissionCheck): boolean {
  // Owners and managers can edit all deals
  if (hasPermission('deals', 'editAll', check.userRole)) {
    return true
  }
  
  // Staff can edit their own deals
  if (check.resourceOwnerId === check.userId && hasPermission('deals', 'editOwn', check.userRole)) {
    return true
  }
  
  return false
}

/**
 * Check if user can delete a specific deal
 */
export function canDeleteDeal(check: PermissionCheck): boolean {
  // Owners and managers can delete all deals
  if (hasPermission('deals', 'deleteAll', check.userRole)) {
    return true
  }
  
  // Staff can delete their own deals
  if (check.resourceOwnerId === check.userId && hasPermission('deals', 'deleteOwn', check.userRole)) {
    return true
  }
  
  return false
}

/**
 * Check if user can assign a deal to another user
 */
export function canAssignDeal(check: PermissionCheck): boolean {
  return hasPermission('deals', 'assignToOthers', check.userRole)
}

/**
 * Get user-friendly permission error message
 */
export function getPermissionError(action: string, userRole: UserRole): string {
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
  
  return `You don't have permission to ${action}. ${roleLabel}s cannot perform this action. Please contact your practice owner.`
}

/**
 * Filter deals based on user permissions
 */
export function filterDealsByPermission(
  deals: any[],
  check: PermissionCheck
): any[] {
  // Owners and managers see all deals
  if (hasPermission('deals', 'viewAll', check.userRole)) {
    return deals
  }
  
  // Staff and viewers only see their own deals + unassigned
  return deals.filter(deal => 
    deal.owner_user_id === check.userId || !deal.owner_user_id
  )
}

