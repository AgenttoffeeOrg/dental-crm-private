/**
 * Guard Components & Hooks
 * 
 * Provides organization requirement checking and UI guards
 */

export { OrgRequiredModal } from './org-required-modal'
export type { OrgRequiredModalProps } from './org-required-modal'

export { useOrgGuard } from '@/lib/hooks/use-org-guard'
export type { OrgGuardResult } from '@/lib/hooks/use-org-guard'

