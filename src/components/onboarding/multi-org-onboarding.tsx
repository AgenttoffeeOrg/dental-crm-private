/**
 * Multi-Org Onboarding Component
 * 
 * Beautiful welcome experience for users who just gained multi-org access
 * or joined their second organization. Shows key features and keyboard shortcuts.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useMemberships } from '@/lib/hooks/use-multi-org'
import { 
  Building2, 
  MapPin, 
  Sparkles, 
  Keyboard, 
  X,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  icon: React.ReactNode
  title: string
  description: string
  features: string[]
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: <Building2 className="w-12 h-12 text-blue-600" />,
    title: 'Welcome to Multi-Organization Access!',
    description: 'You can now seamlessly switch between multiple organizations in your account.',
    features: [
      'Switch between organizations instantly',
      'Keep separate data and settings per org',
      'Pin your favorite organizations for quick access',
      'View recent organizations in one click',
    ],
  },
  {
    icon: <MapPin className="w-12 h-12 text-purple-600" />,
    title: 'Per-Location Access Control',
    description: 'Some organizations have multiple locations. You\'ll see only the data you have access to.',
    features: [
      'Location-specific dashboards and reports',
      'Smart filtering based on your permissions',
      'Easy location switching when needed',
      'Consistent experience across all locations',
    ],
  },
  {
    icon: <Keyboard className="w-12 h-12 text-green-600" />,
    title: 'Keyboard Shortcuts',
    description: 'Work faster with powerful keyboard shortcuts.',
    features: [
      'Press Cmd/Ctrl + K to open org switcher',
      'Use arrow keys to navigate organizations',
      'Hit Enter to switch instantly',
      'Press Esc to close any modal',
    ],
  },
]

export function MultiOrgOnboarding() {
  const { appUser } = useAuth()
  const { isMultiOrg, loading } = useMemberships()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user should see onboarding
    if (loading || !appUser || !isMultiOrg) return

    const onboardingKey = `multi-org-onboarding-seen-${appUser.id}`
    const hasSeenOnboarding = localStorage.getItem(onboardingKey)

    if (!hasSeenOnboarding) {
      // Delay showing to avoid overwhelming on first load
      setTimeout(() => setShowOnboarding(true), 1500)
    }
  }, [appUser, isMultiOrg, loading])

  const handleComplete = () => {
    if (appUser) {
      localStorage.setItem(`multi-org-onboarding-seen-${appUser.id}`, 'true')
    }
    setShowOnboarding(false)
  }

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!showOnboarding) {
    return null
  }

  const step = onboardingSteps[currentStep]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="relative p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                  New Feature
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Skip onboarding"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Progress Indicators */}
            <div className="flex gap-2">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full flex-1 transition-all duration-300',
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-50 rounded-2xl">
                {step.icon}
              </div>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
              {step.title}
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {step.description}
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-8">
              {step.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {currentStep + 1} of {onboardingSteps.length}
              </span>
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {currentStep < onboardingSteps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Get Started
                    <Check className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Quick Tips Component
 * 
 * Shows a dismissible tip about multi-org features
 * (Less intrusive alternative to full onboarding)
 */
export function MultiOrgQuickTip() {
  const { appUser } = useAuth()
  const { isMultiOrg, loading } = useMemberships()
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    if (loading || !appUser || !isMultiOrg) return

    const tipKey = `multi-org-tip-seen-${appUser.id}`
    const hasSeenTip = localStorage.getItem(tipKey)

    if (!hasSeenTip) {
      setTimeout(() => setShowTip(true), 2000)
    }
  }, [appUser, isMultiOrg, loading])

  const handleDismiss = () => {
    if (appUser) {
      localStorage.setItem(`multi-org-tip-seen-${appUser.id}`, 'true')
    }
    setShowTip(false)
  }

  if (!showTip) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Multi-Org Access Enabled!</h3>
            <p className="text-sm text-white/90 mb-3">
              Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Cmd+K</kbd> to
              quickly switch between organizations.
            </p>
            <button
              onClick={handleDismiss}
              className="text-sm font-medium underline hover:no-underline"
            >
              Got it!
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}



