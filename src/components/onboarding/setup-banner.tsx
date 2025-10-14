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
  onSetupClick: () => void
}

export function SetupBanner({ onSetupClick }: SetupBannerProps) {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [setupProgress, setSetupProgress] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState(false)

  useEffect(() => {
    checkSetupStatus()
  }, [user?.id])

  const checkSetupStatus = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()

      // Check if user has completed profile
      const { data: appUser } = await supabase
        .from('app_users')
        .select('profile_completed')
        .eq('id', user.id)
        .single()

      if (appUser?.profile_completed) {
        setProfileCompleted(true)
        setIsVisible(false)
        return
      }

      // Calculate setup progress
      let progress = 25 // Account created

      // Check if tenant has name
      const { data: appUserData } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (appUserData?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', appUserData.tenant_id)
          .single()

        if (tenant?.name) {
          progress += 25 // Practice name added
        }

        // Check if pipeline exists
        const { count: pipelineCount } = await supabase
          .from('pipelines')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', appUserData.tenant_id)

        if (pipelineCount && pipelineCount > 0) {
          progress += 50 // Pipeline created
        }
      }

      setSetupProgress(progress)
      
      // Show banner if setup is not complete and not dismissed
      const dismissed = localStorage.getItem('setup-banner-dismissed')
      if (progress < 100 && !dismissed) {
        setIsVisible(true)
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
    onSetupClick()
  }

  if (!isVisible || profileCompleted || setupProgress >= 100) {
    return null
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-in slide-in-from-top duration-500">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-pulse" />
      </div>

      <div className="relative px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="hidden sm:flex h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm items-center justify-center flex-shrink-0">
                <Sparkles className="h-7 w-7 text-white animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">
                    Complete Your Profile Setup
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                    {setupProgress}% Complete
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <Progress 
                      value={setupProgress} 
                      className="h-2 bg-white/20"
                    />
                  </div>
                  <p className="text-sm text-white/90 hidden md:block">
                    {setupProgress < 50 
                      ? 'Get started with your practice details' 
                      : setupProgress < 100 
                      ? 'Almost there! Set up your pipeline' 
                      : 'You\'re all set!'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                onClick={handleSetupClick}
                className="bg-white text-indigo-600 hover:bg-white/90 font-semibold shadow-lg"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {setupProgress < 50 ? 'Get Started' : 'Continue Setup'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

