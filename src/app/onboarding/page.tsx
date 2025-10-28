'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { IntegratedOnboardingFlow } from '@/components/onboarding/integrated-onboarding-flow'
import { LoadingState } from '@/components/ui/loading-state'

/**
 * OnboardingPage
 * 
 * Dedicated page for the integrated onboarding flow
 * Now includes invite detection, org creation, and the enhanced wizard
 * 
 * FLOW:
 * 1. Check if onboarding needed
 * 2. IntegratedOnboardingFlow handles:
 *    - Invite detection
 *    - Org decision (create/join/skip)
 *    - Enhanced wizard
 *    - Redirect to dashboard
 */

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [shouldShowFlow, setShouldShowFlow] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [user?.id])

  const checkOnboardingStatus = async () => {
    if (authLoading) return
    
    if (!user) {
      router.push('/sign-in')
      return
    }

    try {
      const supabase = createClient()

      // Check user's onboarding status
      const { data: appUser } = await supabase
        .from('app_users')
        .select('onboarding_completed, profile_completed, onboarding_status')
        .eq('id', user.id)
        .single()

      // If onboarding already completed, redirect to dashboard
      if (appUser?.onboarding_completed || appUser?.profile_completed) {
        router.push('/dashboard')
        return
      }

      // Show integrated flow
      setShouldShowFlow(true)
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      // On error, show flow anyway (safe default)
      setShouldShowFlow(true)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingState message="Loading onboarding..." size="lg" />
  }

  if (!shouldShowFlow) {
    return <LoadingState message="Redirecting..." size="lg" />
  }

  return <IntegratedOnboardingFlow />
}

