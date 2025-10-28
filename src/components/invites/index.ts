/**
 * Invite & Onboarding Components
 * 
 * Barrel export for all invite-related components
 */

export { InviteDetectionBanner } from './invite-detection-banner'
export { OrgDecisionModal } from './org-decision-modal'
export { CreateOrgModal } from './create-org-modal'
export { JoinWithCodeModal } from './join-with-code-modal'

// Re-export types for convenience
export type {
  PendingInvite,
  CheckPendingResponse,
  AcceptInviteResponse,
  CreateOrgResponse,
  OrgDecision,
  InviteDetectionBannerProps,
  OrgDecisionModalProps,
  CreateOrgModalProps,
  JoinWithCodeModalProps
} from '@/types/invites'

