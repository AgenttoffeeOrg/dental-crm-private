'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'

/**
 * useOrgGuard Hook
 * 
 * Provides organization requirement checking and modal management
 * for actions that require an active organization.
 * 
 * Features:
 * - Checks if user has active_tenant_id
 * - Manages OrgRequiredModal state
 * - Guards action buttons
 * - Provides helper functions
 * 
 * Usage:
 * ```tsx
 * const { hasOrg, requireOrg, showOrgModal, setShowOrgModal } = useOrgGuard()
 * 
 * <Button onClick={requireOrg(() => createContact())}>
 *   Create Contact
 * </Button>
 * 
 * <OrgRequiredModal 
 *   isOpen={showOrgModal}
 *   onClose={() => setShowOrgModal(false)}
 * />
 * ```
 */

export interface OrgGuardResult {
  /**
   * Whether user has an active organization
   */
  hasOrg: boolean
  
  /**
   * Whether user is currently loading
   */
  loading: boolean
  
  /**
   * Show/hide state for OrgRequiredModal
   */
  showOrgModal: boolean
  
  /**
   * Set showOrgModal state
   */
  setShowOrgModal: (show: boolean) => void
  
  /**
   * Guard a function - only executes if user has org
   * If no org, shows OrgRequiredModal instead
   * 
   * @param fn Function to execute if user has org
   * @returns Guarded function
   * 
   * @example
   * const handleCreate = requireOrg(() => {
   *   console.log('Creating contact...')
   *   createContact()
   * })
   */
  requireOrg: <T extends (...args: any[]) => any>(fn: T) => T
  
  /**
   * Check if action should be allowed
   * If not allowed, shows modal and returns false
   * 
   * @returns true if user has org, false otherwise
   * 
   * @example
   * if (checkOrgRequired()) {
   *   createContact()
   * }
   */
  checkOrgRequired: () => boolean
  
  /**
   * Active tenant ID (if exists)
   */
  activeTenantId: string | null
  
  /**
   * Active location ID (if exists)
   */
  activeLocationId: string | null
}

export function useOrgGuard(): OrgGuardResult {
  const { appUser, loading } = useAuth()
  const [showOrgModal, setShowOrgModal] = useState(false)
  
  const hasOrg = Boolean(appUser?.active_tenant_id)
  const activeTenantId = appUser?.active_tenant_id || null
  const activeLocationId = appUser?.active_location_id || null
  
  /**
   * Check if org is required and show modal if not
   */
  const checkOrgRequired = (): boolean => {
    if (!hasOrg) {
      setShowOrgModal(true)
      return false
    }
    return true
  }
  
  /**
   * Wrap a function with org requirement check
   */
  const requireOrg = <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: any[]) => {
      if (checkOrgRequired()) {
        return fn(...args)
      }
      return undefined
    }) as T
  }
  
  return {
    hasOrg,
    loading,
    showOrgModal,
    setShowOrgModal,
    requireOrg,
    checkOrgRequired,
    activeTenantId,
    activeLocationId
  }
}

