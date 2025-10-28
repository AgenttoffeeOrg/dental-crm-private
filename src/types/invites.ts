/**
 * Shared TypeScript types for the invite and onboarding system
 */

// =====================================================================================================
// INVITE TYPES
// =====================================================================================================

/**
 * Role types for user memberships
 */
export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'

/**
 * Invite status types
 */
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

/**
 * Pending invite from the database
 */
export interface PendingInvite {
  id: string
  invite_code: string
  tenant_id: string
  tenant_name: string
  assigned_role: UserRole
  invited_by_name: string
  personal_message: string | null
  expires_at: string
  created_at: string
}

/**
 * Response from check-pending API
 */
export interface CheckPendingResponse {
  has_invites: boolean
  count: number
  invites: PendingInvite[]
}

/**
 * Response from accept invite API
 */
export interface AcceptInviteResponse {
  success: boolean
  membership: {
    tenant: {
      id: string
      name: string
    }
    role: UserRole
    location: {
      id: string
      name: string
    }
  }
  message: string
}

/**
 * Response from create org API
 */
export interface CreateOrgResponse {
  success: boolean
  organization: {
    tenant: {
      id: string
      name: string
    }
    location: {
      id: string
      name: string
    }
    your_role: 'owner'
  }
  message: string
  warning?: string
}

// =====================================================================================================
// ONBOARDING FLOW TYPES
// =====================================================================================================

/**
 * User's decision on how to proceed with org setup
 */
export type OrgDecision = 'create' | 'join' | 'skip'

/**
 * Onboarding step state
 */
export interface OnboardingStep {
  id: string
  title: string
  description?: string
  completed: boolean
  current: boolean
}

/**
 * Onboarding context state
 */
export interface OnboardingContext {
  hasInvites: boolean
  pendingInvites: PendingInvite[]
  selectedInvite?: PendingInvite
  orgDecision?: OrgDecision
  canSkip: boolean
  currentStep: number
  totalSteps: number
}

// =====================================================================================================
// FORM STATE TYPES
// =====================================================================================================

/**
 * Create organization form data
 */
export interface CreateOrgFormData {
  name: string
  location_name?: string
}

/**
 * Join with code form data
 */
export interface JoinCodeFormData {
  invite_code: string
}

/**
 * Form validation error
 */
export interface FormError {
  field: string
  message: string
}

// =====================================================================================================
// COMPONENT PROPS TYPES
// =====================================================================================================

/**
 * Props for InviteDetectionBanner
 */
export interface InviteDetectionBannerProps {
  userEmail: string
  onInvitesDetected?: (invites: PendingInvite[]) => void
  onAcceptInvite?: (invite: PendingInvite) => void
  className?: string
}

/**
 * Props for OrgDecisionModal
 */
export interface OrgDecisionModalProps {
  isOpen: boolean
  onClose: () => void
  onDecision: (decision: OrgDecision) => void
  hasInvites?: boolean
  canSkip?: boolean
}

/**
 * Props for CreateOrgModal
 */
export interface CreateOrgModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (org: CreateOrgResponse) => void
  onError?: (error: string) => void
}

/**
 * Props for JoinWithCodeModal
 */
export interface JoinWithCodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (membership: AcceptInviteResponse) => void
  onError?: (error: string) => void
}

