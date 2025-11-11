'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Session, User } from '@supabase/supabase-js'
import type { AppUser } from '@/types/database'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const syncSessionWithServer = useCallback(async (event: string, session: Session | null) => {
    try {
      console.log('[AUTH] syncSessionWithServer event:', event, 'session?', !!session)
      await fetch('/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, session }),
        credentials: 'include',
      })
    } catch (error) {
      console.error('[AUTH] Failed to sync session with server:', error)
    }
  }, [])

  const fetchAppUser = async (userId: string, user?: any) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.error('[AUTH] app_users record not found for user:', userId)
        }
        return null
      }

      // Add email verification status to app user data
      return {
        ...data,
        email_verified: user?.email_confirmed_at ? true : false,
        email_confirmed_at: user?.email_confirmed_at || null
      }
    } catch (error) {
      console.error('[AUTH] Error fetching app user:', error)
      return null
    }
  }

  const refreshUser = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error('[AUTH] refreshUser getUser error:', error)
      }

      if (!user) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[AUTH] refreshUser getSession error:', sessionError)
        }

        if (session?.user) {
          setUser(session.user)
          const appUserData = await fetchAppUser(session.user.id, session.user)
          setAppUser(appUserData)
          return
        }

        setUser(null)
        setAppUser(null)
        return
      }

      setUser(user)
      const appUserData = await fetchAppUser(user.id, user)
      setAppUser(appUserData)
    } catch (error) {
      console.error('Error refreshing user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let authSubscription: any = null
    
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const appUserData = await fetchAppUser(session.user.id, session.user)
          if (mounted) {
            setAppUser(appUserData)
          }
          console.log('[AUTH] initAuth initial session user', session.user.id)
          // Ensure server is aware of existing session on initial load
          await syncSessionWithServer('INITIAL_SESSION', session)
        } else {
          console.log('[AUTH] initAuth no session on load')
          setAppUser(null)
        }
        
        if (mounted) {
          setLoading(false)
        }
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return
            
            console.log('[AUTH] onAuthStateChange', event, 'hasSession?', !!session)
            setUser(session?.user ?? null)
            
            if (session?.user) {
              const appUserData = await fetchAppUser(session.user.id, session.user)
              if (mounted) {
                setAppUser(appUserData)
              }
            } else {
              setAppUser(null)
            }
            
            await syncSessionWithServer(event, session)

            if (mounted) {
              setLoading(false)
            }
          }
        )
        
        authSubscription = subscription
        
      } catch (error) {
        console.error('[AUTH] Error:', error)
        if (mounted) {
          setLoading(false)
          setUser(null)
          setAppUser(null)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [supabase, syncSessionWithServer])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    appUser,
    loading,
    signIn,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
