'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ password: 'Invalid email or password' })
          return
        }
        throw new Error(error.message)
      }

      if (data.user) {
        toast.success('Welcome back!', {
          description: 'You have been signed in successfully'
        })

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }

    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error('Sign in failed', {
        description: error.message || 'An unexpected error occurred'
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
      toast.error('Failed to send reset email', {
        description: error.message || 'Please try again'
      })
    }
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
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
