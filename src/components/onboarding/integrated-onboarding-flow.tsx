'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import {
  InviteDetectionBanner,
  OrgDecisionModal,
  CreateOrgModal,
  JoinWithCodeModal,
  type PendingInvite,
  type AcceptInviteResponse,
  type CreateOrgResponse,
  type OrgDecision
} from '@/components/invites'
import { EnhancedOnboardingWizard } from './enhanced-onboarding-wizard'
import { Loader2 } from 'lucide-react'

/**
 * IntegratedOnboardingFlow Component
 * 
 * Orchestrates the complete onboarding journey with invite detection:
 * 
 * FLOW:
 * 1. Email Verification (handled by wizard)
 * 2. **INVITE DETECTION** (new) - Shows pending invites
 * 3. **ORG DECISION** (new) - Create vs Join vs Skip (if no invites accepted)
 * 4. Profile completion (wizard continues based on decision)
 * 5. Organization setup (if creating new org)
 * 6. Redirect to dashboard
 * 
 * Features:
 * - Seamless integration with existing wizard
 * - Skippable at any time
 * - Auto-detects and displays pending invites
 * - Handles org creation and invite acceptance
 * - Smart routing based on user actions
 * 
 * Usage:
 * Replace `<EnhancedOnboardingWizard />` in `src/app/onboarding/page.tsx` with:
 * ```tsx
 * <IntegratedOnboardingFlow />
 * ```
 */

type OnboardingPhase = 
  | 'loading'
  | 'invite_detection'
  | 'org_decision'
  | 'wizard'
  | 'complete'

export function IntegratedOnboardingFlow() {
  const router = useRouter()
  const { user, appUser, loading: authLoading } = useAuth()
  
  const [phase, setPhase] = useState<OnboardingPhase>('loading')
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [showOrgDecision, setShowOrgDecision] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [skipOrgSetup, setSkipOrgSetup] = useState(false)

  // =====================================================================================================
  // INITIALIZE ONBOARDING
  // =====================================================================================================
  useEffect(() => {
    if (!authLoading && user && appUser) {
      initializeOnboarding()
    }
  }, [authLoading, user, appUser])

  const initializeOnboarding = async () => {
    try {
      // Check if user already has active_tenant_id
      if (appUser?.active_tenant_id) {
        console.log('[ONBOARDING] User already has organization, proceeding to wizard')
        setPhase('wizard')
        return
      }

      // Check for pending invites
      console.log('[ONBOARDING] Checking for pending invites...')
      setPhase('invite_detection')
      
    } catch (error) {
      console.error('[ONBOARDING] Error initializing:', error)
      // On error, proceed to wizard (safe default)
      setPhase('wizard')
    }
  }

  // =====================================================================================================
  // INVITE HANDLERS
  // =====================================================================================================
  const handleInvitesDetected = (detectedInvites: PendingInvite[]) => {
    console.log('[ONBOARDING] Invites detected:', detectedInvites.length)
    setInvites(detectedInvites)
    
    if (detectedInvites.length === 0) {
      // No invites, show org decision modal
      console.log('[ONBOARDING] No invites, showing org decision')
      setShowOrgDecision(true)
    }
  }

  const handleInviteAccepted = async (invite: PendingInvite) => {
    console.log('[ONBOARDING] Invite accepted:', invite.tenant_name)
    
    // Wait a bit for the backend to update active_tenant_id
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Proceed to wizard (user now has organization)
    setPhase('wizard')
  }

  const handleInviteBannerComplete = () => {
    // User dismissed all invites without accepting
    console.log('[ONBOARDING] Invite banner dismissed, showing org decision')
    setShowOrgDecision(true)
  }

  // =====================================================================================================
  // ORG DECISION HANDLERS
  // =====================================================================================================
  const handleOrgDecision = (decision: OrgDecision) => {
    console.log('[ONBOARDING] Org decision:', decision)
    
    switch (decision) {
      case 'create':
        setShowOrgDecision(false)
        setShowCreateOrg(true)
        break
      
      case 'join':
        setShowOrgDecision(false)
        setShowJoinCode(true)
        break
      
      case 'skip':
        setShowOrgDecision(false)
        setSkipOrgSetup(true)
        // Proceed to wizard without org
        setPhase('wizard')
        break
    }
  }

  const handleOrgCreated = async (org: CreateOrgResponse) => {
    console.log('[ONBOARDING] Organization created:', org.organization.tenant.name)
    
    // Wait a bit for the backend to update active_tenant_id
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Close modal and proceed to wizard
    setShowCreateOrg(false)
    setPhase('wizard')
  }

  const handleOrgJoined = async (membership: AcceptInviteResponse) => {
    console.log('[ONBOARDING] Organization joined:', membership.membership.tenant.name)
    
    // Wait a bit for the backend to update active_tenant_id
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Close modal and proceed to wizard
    setShowJoinCode(false)
    setPhase('wizard')
  }

  // =====================================================================================================
  // WIZARD COMPLETION
  // =====================================================================================================
  const handleWizardComplete = () => {
    console.log('[ONBOARDING] Wizard complete, redirecting to dashboard')
    setPhase('complete')
    router.push('/dashboard')
  }

  // =====================================================================================================
  // RENDER PHASES
  // =====================================================================================================

  // LOADING
  if (authLoading || !user || !appUser || phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Preparing your onboarding...</p>
        </div>
      </div>
    )
  }

  // INVITE DETECTION PHASE
  if (phase === 'invite_detection') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
            <p className="mt-2 text-gray-600">
              Let's get you set up. Checking for pending invitations...
            </p>
          </div>

          {/* Invite Detection Banner */}
          <Card className="p-6">
            <InviteDetectionBanner
              userEmail={user.email!}
              onInvitesDetected={handleInvitesDetected}
              onAcceptInvite={handleInviteAccepted}
            />

            {/* If no invites after loading, show button to continue */}
            {invites.length === 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleInviteBannerComplete}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                >
                  Continue Setup
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // WIZARD PHASE
  if (phase === 'wizard') {
    return (
      <>
        <EnhancedOnboardingWizard onClose={handleWizardComplete} />

        {/* Modals can still be opened from wizard if needed */}
        <OrgDecisionModal
          isOpen={showOrgDecision}
          onClose={() => setShowOrgDecision(false)}
          onDecision={handleOrgDecision}
          canSkip={true}
        />

        <CreateOrgModal
          isOpen={showCreateOrg}
          onClose={() => setShowCreateOrg(false)}
          onSuccess={handleOrgCreated}
        />

        <JoinWithCodeModal
          isOpen={showJoinCode}
          onClose={() => setShowJoinCode(false)}
          onSuccess={handleOrgJoined}
        />
      </>
    )
  }

  // COMPLETE (redirecting)
  if (phase === 'complete') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600">Setup complete! Redirecting...</p>
        </div>
      </div>
    )
  }

  return null
}

