'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, appUser, loading: authLoading, signIn: authSignIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check for pre-filled email and messages from URL params
  useEffect(() => {
    const email = searchParams.get('email')
    const message = searchParams.get('message')
    
    // Pre-fill email if provided
    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
    }
    
    // Show appropriate message based on redirect reason
    if (message === 'confirm-email' || message === 'confirm-email-first') {
      toast.info('Email confirmation required', {
        description: 'Please check your email and click the confirmation link to activate your account, then sign in.',
        duration: 6000
      })
    } else if (message === 'account-exists') {
      toast.info('Welcome back!', {
        description: 'This email is already registered. Please enter your password to sign in.',
        duration: 4000
      })
      // Focus password field if email is pre-filled
      setTimeout(() => {
        document.getElementById('password')?.focus()
      }, 500)
    }
  }, [searchParams])

  // Redirect if already authenticated AND has appUser
  useEffect(() => {
    if (!authLoading && user && appUser) {
      console.log('[SIGNIN] User already authenticated with appUser, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, appUser, authLoading, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // Use the auth hook's signIn method instead of direct Supabase call
      const { error } = await authSignIn(formData.email.trim(), formData.password)

      if (error) {
        // Check if user doesn't exist (no account with this email)
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ 
            email: 'Invalid email or password',
            password: 'Invalid email or password'
          })
          
          toast.error('Sign in failed', {
            description: 'Invalid email or password. Need an account?',
            duration: 5000,
            action: {
              label: 'Sign Up',
              onClick: () => {
                const email = encodeURIComponent(formData.email.trim())
                window.location.href = `/sign-up?email=${email}&message=no-account`
              }
            }
          })
          return
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ 
            email: 'Email not confirmed. Please check your inbox and click the confirmation link.',
            password: '' 
          })
          
          toast.error('Email not confirmed', {
            description: 'Please check your email and click the confirmation link to activate your account before signing in.',
            duration: 6000,
            action: {
              label: 'Resend',
              onClick: () => { void handleResendConfirmation() }
            }
          })
          return
        } else if (error.message.includes('Too many requests')) {
          setErrors({ email: 'Too many login attempts. Please try again later.' })
          return
        }
        throw new Error(error.message)
      }

      // If no error, sign in was successful
      toast.success('Welcome back!', {
        description: 'You have been signed in successfully. Redirecting to your dashboard...'
      })

      // The auth hook will handle the state update, we just need to redirect
      console.log('[SIGNIN] Sign in successful, redirecting to dashboard')
      router.push('/dashboard')

    } catch (error: any) {
      console.error('Sign in error:', error)
      
      // Handle specific error types
      let errorTitle = 'Sign in failed'
      let errorDescription = error.message || 'An unexpected error occurred'
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorTitle = 'Connection error'
        errorDescription = 'Please check your internet connection and try again'
      } else if (error.message.includes('timeout')) {
        errorTitle = 'Request timeout'
        errorDescription = 'The request took too long. Please try again'
      } else if (error.message.includes('credentials')) {
        errorTitle = 'Invalid credentials'
        errorDescription = 'The email or password you entered is incorrect'
      } else if (error.message.includes('locked') || error.message.includes('suspended')) {
        errorTitle = 'Account locked'
        errorDescription = 'Your account has been locked. Please contact support'
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
        duration: 5000
      })
      
      // Log error for debugging
      console.error('[SIGNIN ERROR]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Password reset email sent!', {
        description: 'Check your inbox for reset instructions'
      })
    } catch (error: any) {
      console.error('Password reset error:', error)
      
      let errorDescription = error.message || 'Please try again'
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorDescription = 'Please check your internet connection and try again'
      } else if (error.message.includes('not found') || error.message.includes('User not found')) {
        errorDescription = 'No account found with this email address'
      } else if (error.message.includes('rate limit')) {
        errorDescription = 'Too many requests. Please wait a few minutes and try again'
      }
      
      toast.error('Failed to send reset email', {
        description: errorDescription,
        duration: 5000
      })
    }
  }

  const handleResendConfirmation = async () => {
    if (!formData.email.trim()) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim()
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success('Confirmation email sent!', {
        description: 'Check your email and click the confirmation link to verify your account'
      })
    } catch (error: any) {
      console.error('Confirmation email error:', error)
      
      let errorDescription = error.message || 'Please try again'
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorDescription = 'Please check your internet connection and try again'
      } else if (error.message.includes('rate limit')) {
        errorDescription = 'Too many requests. Please wait a few minutes and try again'
      } else if (error.message.includes('already confirmed')) {
        errorDescription = 'Your email is already confirmed. You can sign in now'
      }
      
      toast.error('Failed to send confirmation email', {
        description: errorDescription,
        duration: 5000
      })
    }
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600">
              Sign in to your Dental CRM account
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email Address *
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@practice.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`pl-11 h-12 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password *
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`pl-11 pr-11 h-12 ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>

            {/* Resend Confirmation Button */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Didn't receive confirmation email? Resend it
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <span className="text-sm text-gray-600">Don't have an account?</span>{' '}
            <Link href="/sign-up" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-12 items-center justify-center relative overflow-hidden">
        <div className="relative z-10 max-w-lg text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Manage your practice with confidence
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Access all your tools and data in one secure platform
          </p>
          
          <div className="space-y-4 text-left">
            {[
              'View your practice dashboard',
              'Manage patient contacts and deals',
              'Track marketing campaigns',
              'Collaborate with your team',
              'Access analytics and reports'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <span className="text-indigo-50">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
