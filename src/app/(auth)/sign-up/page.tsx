'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Building2, User, Mail, Lock, Sparkles, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'

function SignUpForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState<'practice' | 'individual'>('practice')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    practiceName: '',
    specialty: 'general',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  })

  const specialties = [
    { value: 'general', label: 'General Dentistry' },
    { value: 'cosmetic', label: 'Cosmetic Dentistry' },
    { value: 'orthodontics', label: 'Orthodontics' },
    { value: 'pediatric', label: 'Pediatric Dentistry' },
    { value: 'endodontics', label: 'Endodontics' },
    { value: 'periodontics', label: 'Periodontics' },
    { value: 'oral_surgery', label: 'Oral Surgery' },
    { value: 'prosthodontics', label: 'Prosthodontics' }
  ]

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    
    if (accountType === 'practice' && !formData.practiceName.trim()) {
      newErrors.practiceName = 'Practice name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
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
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the terms and conditions'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep2()) {
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
            full_name: formData.fullName.trim(),
            account_type: accountType
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          setErrors({ email: 'This email is already registered. Please sign in instead.' })
          return
        }
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Step 2: Create tenant
      const tenantName = accountType === 'practice' 
        ? formData.practiceName.trim()
        : `${formData.fullName.trim()}'s Practice`

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
        .select()
        .single()

      if (tenantError) {
        throw new Error(`Failed to create practice: ${tenantError.message}`)
      }

      // Step 3: Create app user
      const { error: appUserError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          tenant_id: tenant.id,
          full_name: formData.fullName.trim(),
          role: 'owner'
        })

      if (appUserError) {
        // Cleanup: delete tenant if app user creation fails
        await supabase.from('tenants').delete().eq('id', tenant.id)
        throw new Error(`Failed to create user profile: ${appUserError.message}`)
      }

      // Step 4: Create default pipeline (non-blocking)
      try {
        const pipelineData: any = {
          tenant_id: tenant.id,
          name: 'Main Pipeline'
        }
        
        // Add description if column exists (optional for backward compatibility)
        pipelineData.description = 'Your main sales pipeline'
        
        await supabase.from('pipelines').insert(pipelineData)
      } catch (pipelineError) {
        console.warn('Failed to create default pipeline:', pipelineError)
        // Don't fail signup for this - it's optional
      }

      // Success!
      toast.success('Account created successfully!', {
        description: 'Welcome to Dental CRM'
      })

      // Redirect to onboarding
      setTimeout(() => {
        router.push('/onboarding')
      }, 1000)

    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error('Sign up failed', {
        description: error.message || 'An unexpected error occurred'
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
              Start your free trial
            </h1>
            <p className="text-gray-600">
              Join thousands of practices using Dental CRM
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          </div>

          {/* Step 1: Account Type & Practice Info */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
              {/* Account Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAccountType('practice')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    accountType === 'practice'
                      ? 'border-indigo-600 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className={`h-8 w-8 mx-auto mb-3 ${accountType === 'practice' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-gray-900">Practice</p>
                  <p className="text-xs text-gray-500 mt-1">For dental practices with a team</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    accountType === 'individual'
                      ? 'border-indigo-600 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className={`h-8 w-8 mx-auto mb-3 ${accountType === 'individual' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-gray-900">Individual</p>
                  <p className="text-xs text-gray-500 mt-1">For solo practitioners</p>
                </button>
              </div>

              {accountType === 'practice' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="practiceName" className="text-sm font-medium text-gray-900">
                      Practice Name *
                    </Label>
                    <Input
                      id="practiceName"
                      placeholder="e.g., Bright Smile Dental"
                      value={formData.practiceName}
                      onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
                      className={`mt-1.5 h-12 ${errors.practiceName ? 'border-red-500' : ''}`}
                    />
                    {errors.practiceName && (
                      <p className="text-sm text-red-600 mt-1 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.practiceName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="specialty" className="text-sm font-medium text-gray-900">
                      Primary Specialty
                    </Label>
                    <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
                      <SelectTrigger className="mt-1.5 h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleContinue}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Personal Info & Password */}
          {step === 2 && (
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
                <p className="text-xs text-gray-500 mt-1.5">At least 8 characters</p>
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
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`mt-1.5 h-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
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

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
              </div>
            </form>
          )}

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