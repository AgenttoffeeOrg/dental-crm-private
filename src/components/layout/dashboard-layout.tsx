'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UniversalSearchBar } from '@/components/search/universal-search-bar'
import { NotificationsBellButton } from '@/components/notifications/notifications-bell-button'
import { NotificationsDrawer } from '@/components/notifications/notifications-drawer'
import { WhatsNewPanel } from '@/components/ui/whats-new-panel'
import { CalendarIconButton } from '@/components/calendar/calendar-icon-button'
import { LABELS } from '@/lib/constants/labels'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  CheckSquare,
  Settings,
  BarChart3,
  Zap,
  FileText,
  TrendingUp,
  Mail,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  DollarSign,
  Workflow,
  LineChart,
  Bell,
  GitBranch,
  Calendar,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { useFeatureFlags } from '@/lib/hooks/use-feature-flags'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { LocationSwitcher } from '@/components/multi-location/location-switcher'
import { OrgSwitcher } from './org-switcher'
// import { VerificationBanners } from '@/components/verification/verification-banners' // Temporarily disabled - has missing dependencies
import { MultiOrgOnboarding } from '@/components/onboarding/multi-org-onboarding'

const getNavigation = (featureFlags: any) => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: LABELS.DEAL.plural, href: '/deals', icon: DollarSign },
  { name: 'Pipeline', href: '/pipeline', icon: Workflow },
  { name: LABELS.CONTACT.plural, href: '/contacts', icon: Users },
  { name: LABELS.TASK.plural, href: '/tasks', icon: CheckSquare },
  { name: 'Marketing', href: '/marketing', icon: Mail },
  { name: 'Automations', href: '/automations', icon: GitBranch, badge: 'NEW', badgeColor: 'bg-blue-600 text-white' },
  { name: 'Marketing Audit', href: '/marketing-audit', icon: LineChart, badge: 'New', badgeColor: 'bg-blue-600 text-white' },
  { name: 'Forms', href: '/forms', icon: FileText },
  { name: 'Integrations', href: '/integrations', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

// Account Auto-Repair Component
function AccountAutoRepair({ user }: { user: any }) {
  const [repairAttempted, setRepairAttempted] = useState(false)
  const [repairError, setRepairError] = useState<string | null>(null)
  
  useEffect(() => {
    if (repairAttempted) return // Don't retry if already attempted
    
    const autoRepairAccount = async () => {
      try {
        setRepairAttempted(true)
        const supabase = createClient()
        
        console.log('[DASHBOARD] Auto-repairing account for user:', user.id)
        
        // First, check if app_user exists (race condition protection)
        const { data: existingAppUser } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (existingAppUser) {
          console.log('[DASHBOARD] App user found on retry, refreshing...')
          window.location.reload()
          return
        }
        
        // Check if tenant exists for this user
        let tenantId: string | null = null
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
        
        if (tenants && tenants.length > 0) {
          tenantId = tenants[0].id
          console.log('[DASHBOARD] Found existing tenant:', tenantId)
        } else {
          // Create new tenant
          const { data: newTenant, error: tenantError} = await supabase
            .from('tenants')
            .insert({
              name: user.email?.split('@')[0] || 'My Practice',
              owner_id: user.id
            })
            .select()
            .single()
          
          if (tenantError) throw tenantError
          tenantId = newTenant.id
          console.log('[DASHBOARD] Created new tenant:', tenantId)
        }
        
        // Create app_user record
        const { error: appUserError } = await supabase
          .from('app_users')
          .insert({
            id: user.id,
            tenant_id: tenantId,
            full_name: user.email?.split('@')[0] || 'User',
            role: 'owner'
          })
        
        if (appUserError) throw appUserError
        
        console.log('[DASHBOARD] ✅ Account repaired successfully!')
        
        // Refresh the page to load with new app_user
        window.location.reload()
        
      } catch (error) {
        console.error('[DASHBOARD] Auto-repair failed:', error)
        setRepairError((error as Error).message)
      }
    }
    
    autoRepairAccount()
  }, [user.id, repairAttempted])
  
  // Show error state if repair failed
  if (repairError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Account Setup Error</h1>
          <p className="text-gray-600 mb-4">
            We couldn't complete your account setup. Please sign out and try signing in again.
          </p>
          <Button 
            onClick={() => {
              const supabase = createClient()
              supabase.auth.signOut()
              window.location.href = '/sign-in'
            }}
            className="w-full"
          >
            Sign Out & Try Again
          </Button>
        </div>
      </div>
    )
  }
  
  // Show loading state while repairing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Setting up your account...</h1>
        <p className="text-gray-600">
          Please wait while we complete your account setup.
        </p>
      </div>
    </div>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false)
  const [tenantContext, setTenantContext] = useState<any>(null)
  const [locationContext, setLocationContext] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const featureFlags = useFeatureFlags()
  const navigation = getNavigation(featureFlags)

  // Prevent hydration mismatches by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize global keyboard shortcuts
  useKeyboardShortcuts()

  // Fetch tenant context
  useEffect(() => {
    const fetchTenantContext = async () => {
      try {
        const response = await fetch('/api/tenant/context')
        if (response.ok) {
          const data = await response.json()
          setTenantContext(data)
        }
      } catch (error) {
        console.error('Error fetching tenant context:', error)
      }
    }

    if (appUser) {
      fetchTenantContext()
    }
  }, [appUser])

  // Fetch location context
  useEffect(() => {
    const fetchLocationContext = async () => {
      try {
        const response = await fetch('/api/locations/context')
        if (response.ok) {
          const data = await response.json()
          setLocationContext(data)
        }
      } catch (error) {
        console.error('Error fetching location context:', error)
      }
    }

    if (appUser) {
      fetchLocationContext()
    }
  }, [appUser])

  // Debug logging - minimal
  if (process.env.NODE_ENV === 'development') {
    console.log('[DASHBOARD_LAYOUT] Auth state:', { loading, hasUser: !!user, hasAppUser: !!appUser })
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to sign-in
  if (!user && !loading) {
    console.log('[DASHBOARD_LAYOUT] No user found, redirecting to sign-in')
    
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
    return null
  }

  // If user exists but no appUser, auto-repair the account
  if (user && !appUser && !loading) {
    console.log('[DASHBOARD] Auth user exists but app_user record is missing!')
    console.log('[DASHBOARD] Auth user ID:', user.id)
    console.log('[DASHBOARD] Auth user email:', user.email)
    return <AccountAutoRepair user={user} />
  }

  // Auth state is valid, render dashboard

  return (
    <div className="flex h-screen bg-gray-50">
          {/* MOBILE HEADER - Shows on small screens */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              DentalCRM
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* LEFT SIDEBAR - ENTERPRISE NAVIGATION */}
          {/* Desktop: Always visible | Mobile: Slide-in overlay */}
          <div className={`
            w-64 bg-[#282C3F] border-r border-[#3A3F54] flex flex-col flex-shrink-0
            lg:relative lg:translate-x-0
            fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
        {/* Logo */}
        <div className="p-6 border-b border-[#3A3F54] flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              DentalCRM
            </h1>
            <p className="text-xs text-gray-400 mt-1">Enterprise Edition</p>
          </div>
          {/* Close button - mobile only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-[#3A3F54]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Menu - Vertical */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            // Exact match for active state to avoid /marketing matching /marketing-audit
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-lg transition-all group
                  ${isActive
                    ? 'bg-[#3A3F54] text-white'
                    : 'text-gray-300 hover:bg-[#3A3F54] hover:text-white'
                  }
                `}
              >
                <div className="flex items-center">
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                  {item.name}
                </div>
                {(item as any).badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${(item as any).badgeColor || 'bg-blue-600 text-white'}`}>
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer - User Info */}
        <div className="p-4 border-t border-[#3A3F54]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#3A3F54] cursor-pointer transition-colors">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                {appUser.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{appUser.full_name}</p>
              <p className="text-xs text-gray-400 capitalize">{appUser.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE OVERLAY - Darkens background when menu is open */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Verification Banners - Show before top bar */}
        {/* <VerificationBanners /> */} {/* Temporarily disabled - missing dependencies */}
        
        {/* TOP BAR - Search & Actions */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm lg:block hidden">
          <div className="px-4 lg:px-6">
            <div className="flex h-14 items-center justify-between">
              {/* Breadcrumb/Page Title (optional) */}
              <div></div>

              {/* Universal Search Bar - RIGHT SIDE */}
              <div className="flex-1 max-w-xl ml-auto hidden sm:block">
                <UniversalSearchBar />
              </div>

              {/* User Actions - FAR RIGHT */}
              <div className="flex items-center gap-3 ml-4">
              {/* Organization Switcher - Multi-Org Users */}
              <OrgSwitcher />
              
              {/* Location Switcher - Multi-Location Organizations */}
              {locationContext?.isMultiLocation && (
                <LocationSwitcher
                  currentLocationId={locationContext.activeLocation?.id || locationContext.accessibleLocations?.[0]?.id}
                  currentLocationName={locationContext.activeLocation?.name || locationContext.accessibleLocations?.[0]?.name || 'Select Location'}
                  isMultiLocation={locationContext.isMultiLocation}
                />
              )}
              
              {/* What's New */}
              <WhatsNewPanel />
              
              {/* Calendar */}
              <CalendarIconButton />
              
              {/* Notifications Bell */}
              <NotificationsBellButton onOpen={() => setNotifDrawerOpen(true)} />
              
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full pointer-events-auto">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {appUser?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 z-[200]" align="end" forceMount>
                  <DropdownMenuItem 
                    className="flex items-center justify-start gap-2 p-2 cursor-pointer"
                    onClick={() => { window.location.href = '/settings?section=account&tab=profile' }}
                  >
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{appUser?.full_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {appUser?.role}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { window.location.href = '/notifications' }}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { window.location.href = '/settings?tab=profile' }}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Full Width */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      
      {/* Notifications Drawer */}
      <NotificationsDrawer 
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
      />
      
      {/* Multi-Org Onboarding */}
      <MultiOrgOnboarding />
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ErrorBoundary>
  )
}

