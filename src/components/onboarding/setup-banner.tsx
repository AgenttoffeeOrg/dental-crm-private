'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles, X, ArrowRight, CheckCircle2, TrendingUp 
} from 'lucide-react'

interface SetupBannerProps {
  onOpenWizard: () => void
}

export function SetupBanner({ onOpenWizard }: SetupBannerProps) {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [setupProgress, setSetupProgress] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [currentStep, setCurrentStep] = useState('')

  useEffect(() => {
    checkSetupStatus()
  }, [user?.id])

  const checkSetupStatus = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()

      // Check if user has completed onboarding
      const { data: appUser } = await supabase
        .from('app_users')
        .select('onboarding_completed, onboarding_status, onboarding_current_step')
        .eq('id', user.id)
        .single()

      if (appUser?.onboarding_completed) {
        setOnboardingCompleted(true)
        setIsVisible(false)
        return
      }

      // Get onboarding status from API
      const response = await fetch('/api/onboarding/status')
      if (response.ok) {
        const statusData = await response.json()
        const progress = statusData.progressPercentage || 0
        setSetupProgress(progress)
        setCurrentStep(statusData.currentStep || 'email_verification')

        // Show banner if onboarding is not complete and not dismissed
        const dismissed = localStorage.getItem('setup-banner-dismissed')
        if (!statusData.onboardingCompleted && !dismissed) {
          setIsVisible(true)
        } else if (statusData.onboardingCompleted) {
          // Onboarding completed - hide banner
          setOnboardingCompleted(true)
          setIsVisible(false)
        }
      } else {
        console.error('Failed to fetch onboarding status:', response.status)
      }
    } catch (error) {
      console.error('Error checking setup status:', error)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    localStorage.setItem('setup-banner-dismissed', 'true')
  }

  const handleSetupClick = () => {
    localStorage.removeItem('setup-banner-dismissed')
    onOpenWizard()
  }

  if (!isVisible || onboardingCompleted) {
    return null
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 animate-in slide-in-from-top duration-500">
      <div className="relative px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
                  Complete Your Profile Setup
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                    {setupProgress}% Complete
                  </span>
                </h3>
                <p className="text-white/90 text-sm mb-3">
                  Finish setting up your account to unlock all features and get the most out of DentalCRM
                </p>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <Progress value={setupProgress} className="h-2 bg-white/20" />
                </div>

                <div className="flex items-center gap-4 text-xs text-white/80">
                  <div className="flex items-center gap-1">
                    {setupProgress > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-300" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-white/40" />
                    )}
                    <span>Started</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {setupProgress > 50 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-300" />
                    ) : setupProgress > 0 ? (
                      <TrendingUp className="w-4 h-4 text-yellow-300" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-white/40" />
                    )}
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {setupProgress === 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-300" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-white/40" />
                    )}
                    <span>Complete</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSetupClick}
                  size="sm"
                  className="bg-white text-purple-600 hover:bg-white/90 shadow-lg"
                >
                  {setupProgress > 0 ? 'Resume Setup' : 'Get Started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
