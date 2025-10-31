'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Mail, Lock, Sparkles, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  })

  // Pre-fill email from URL params and show appropriate message
  useEffect(() => {
    const email = searchParams.get('email')
    const message = searchParams.get('message')
    
    // Pre-fill email if provided
    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
    }
    
    // Show appropriate message based on redirect reason
    if (message === 'no-account') {
      toast.info('Create your account', {
        description: 'No account found with this email. Let\'s create one for you!',
        duration: 4000
      })
      // Focus full name field since email is pre-filled
      setTimeout(() => {
        document.getElementById('fullName')?.focus()
      }, 500)
    }
  }, [searchParams])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the terms and conditions'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const supabase = createClient()

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim()
          }
        }
      })

      if (authError) {
        console.error('[SIGNUP] Auth error:', authError)
        if (authError.message.includes('already registered') || 
            authError.message.includes('User already registered') ||
            authError.message.includes('already been registered')) {
          // Smart redirect: User already exists, send them to signin with email pre-filled
          toast.error('Account already exists', {
            description: 'This email is already registered. Redirecting you to sign in...',
            duration: 3000
          })
          
          // Redirect to signin with email pre-filled
          setTimeout(() => {
            const email = encodeURIComponent(formData.email.trim())
            window.location.href = `/sign-in?email=${email}&message=account-exists`
          }, 1500)
          return
        }
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Note: Email confirmation is handled separately and doesn't block dashboard access

      // Step 2: Create app user (or update if exists)
      // Users can sign up without a tenant - they'll be prompted to create an organization
      // when they try to perform actions that require one
      
      // First check if app user already exists
      const { data: existingAppUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (existingAppUser) {
        // User already exists - update their information (keep existing tenant_id if they have one)
        console.log('[SIGNUP] App user already exists, updating...')
        const { error: updateError } = await supabase
          .from('app_users')
          .update({
            full_name: formData.fullName.trim(),
            role: existingAppUser.role || 'owner' // Preserve existing role
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('[SIGNUP] Failed to update app user:', updateError)
          throw new Error(`Failed to update user profile: ${updateError.message}`)
        }
      } else {
        // Create new app user WITHOUT tenant_id initially
        const { error: appUserError } = await supabase
          .from('app_users')
          .insert({
            id: authData.user.id,
            full_name: formData.fullName.trim(),
            role: 'owner'
            // tenant_id is NOT set initially - will be set below for practice sign-ups
          })

        if (appUserError) {
          console.error('[SIGNUP] Failed to create app user:', appUserError)
          
          // Handle the specific case where tenant_id constraint fails
          // This means the database migration hasn't been run yet
          if (appUserError.message?.includes('tenant_id') && 
              (appUserError.message?.includes('not-null') || appUserError.message?.includes('null value'))) {
            // This is a database configuration issue - migration needs to be run
            // User will need to delete their orphaned auth account manually or via SQL
            throw new Error(
              'Database configuration issue detected. The database migration needs to be applied. ' +
              'Your account was partially created. Please contact support or use the cleanup script to delete the orphaned account.'
            )
          }
          
          throw new Error(`Failed to create user profile: ${appUserError.message}`)
        }
      }

      // Success!
      console.log('[SIGNUP] Account created successfully')
      console.log('[SIGNUP] Auth session:', authData.session ? 'exists' : 'null')
      
      // Enterprise workflow: Always redirect to dashboard, regardless of email verification
      const emailVerified = !!authData.session
      
      toast.success('🎉 Account created!', {
        description: `Hi ${formData.fullName.trim()}, you're all set! Create an organization or join one to get started.`,
        duration: 5000
      })
      
      // Always redirect to dashboard - enterprise workflow
      setTimeout(() => {
        console.log('[SIGNUP] Redirecting to dashboard (email verified:', emailVerified, ')')
        window.location.href = '/dashboard'
      }, 1500)

    } catch (error: any) {
      console.error('Sign up error:', error)
      
      // Handle specific error types
      let errorTitle = 'Sign up failed'
      let errorDescription = error.message || 'An unexpected error occurred'
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorTitle = 'Connection error'
        errorDescription = 'Please check your internet connection and try again'
      } else if (error.message.includes('timeout')) {
        errorTitle = 'Request timeout'
        errorDescription = 'The request took too long. Please try again'
      } else if (error.message.includes('already registered')) {
        errorTitle = 'Account exists'
        errorDescription = 'An account with this email already exists. Please sign in instead'
      } else if (error.message.includes('profile') || error.message.includes('user')) {
        errorTitle = 'Account setup error'
        errorDescription = 'Failed to complete account setup. Please try again'
      } else if (error.message.includes('database') || error.message.includes('unique constraint')) {
        errorTitle = 'Database error'
        errorDescription = 'This email is already in use. Please try a different one'
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
        duration: 5000
      })
      
      // Log error for debugging
      console.error('[SIGNUP ERROR]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create your account
            </h1>
            <p className="text-gray-600">
              Join thousands of practices using Dental CRM
            </p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-5 animate-in slide-in-from-bottom duration-300">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-900">
                  Your Full Name *
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`mt-1.5 h-12 ${errors.fullName ? 'border-red-500' : ''}`}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>

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
                    placeholder="Create a strong password"
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
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-gray-500">Password requirements:</p>
                  <ul className="text-xs text-gray-400 space-y-0.5">
                    <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                      <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center ${/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : ''}`}>
                      <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
                      One lowercase letter
                    </li>
                    <li className={`flex items-center ${/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : ''}`}>
                      <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
                      One uppercase letter
                    </li>
                    <li className={`flex items-center ${/(?=.*\d)/.test(formData.password) ? 'text-green-600' : ''}`}>
                      <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
                      One number
                    </li>
                  </ul>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">
                  Confirm Password *
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`pl-11 pr-11 h-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Passwords match
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreedToTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreedToTerms: checked as boolean })}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.agreedToTerms && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.agreedToTerms}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <span className="text-sm text-gray-600">Already have an account?</span>{' '}
            <Link href="/sign-in" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything you need to grow your practice
          </h2>
          <p className="text-xl text-indigo-100 mb-12">
            Join the modern way of managing dental practices
          </p>
          
          <div className="space-y-4">
            {[
              'Complete CRM with pipeline management',
              'Multi-channel communications (Email, SMS, WhatsApp)',
              'AI-powered analytics and insights',
              'Marketing automation and campaigns',
              'Team collaboration and permissions',
              'HIPAA-compliant security'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-indigo-50">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-white" />
                ))}
              </div>
              <p className="text-white text-sm font-semibold">2,500+ dental practices</p>
            </div>
            <p className="text-indigo-100 text-sm">
              Trusted by leading dental practices worldwide
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <ErrorBoundary>
      <SignUpForm />
    </ErrorBoundary>
  )
}