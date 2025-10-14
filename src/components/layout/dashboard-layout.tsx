'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UniversalSearchBar } from '@/components/search/universal-search-bar'
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
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pipeline', href: '/pipeline', icon: TrendingUp },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Marketing', href: '/marketing', icon: Mail },
  { name: 'Forms', href: '/forms', icon: FileText },
  { name: 'Integrations', href: '/integrations', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading } = useAuth()
  const pathname = usePathname()

  // Debug logging - minimal
  if (process.env.NODE_ENV === 'development') {
    console.log('[DASHBOARD_LAYOUT] Auth state:', { loading, hasUser: !!user, hasAppUser: !!appUser })
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  // Show loading state while auth is checking
  if (loading) {
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

  // If user exists but no appUser, show error state instead of redirecting
  if (user && !appUser && !loading) {
    console.log('[DASHBOARD] Auth user exists but app_user record is missing!')
    console.log('[DASHBOARD] Auth user ID:', user.id)
    console.log('[DASHBOARD] Auth user email:', user.email)
    console.log('[DASHBOARD] This means the signup process did not complete properly.')
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Account Setup Incomplete</h1>
          <p className="text-gray-600 mb-4">
            Your account was created but the setup process didn't complete properly. 
            Please contact support or try signing out and signing back in.
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

  // Auth state is valid, render dashboard

  return (
    <div className="flex h-screen bg-gray-50">
          {/* LEFT SIDEBAR - ENTERPRISE NAVIGATION */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            DentalCRM
          </h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise Edition</p>
        </div>

        {/* Navigation Menu - Vertical */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-all group
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer - User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                {appUser.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{appUser.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{appUser.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR - Search & Actions */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6">
            <div className="flex h-14 items-center justify-between">
              {/* Breadcrumb/Page Title (optional) */}
              <div></div>

              {/* Universal Search Bar - RIGHT SIDE */}
              <div className="flex-1 max-w-xl ml-auto">
                <UniversalSearchBar />
              </div>

              {/* User Actions - FAR RIGHT */}
              <div className="flex items-center gap-3 ml-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {appUser?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{appUser?.full_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {appUser?.role}
                      </p>
                    </div>
                  </div>
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

