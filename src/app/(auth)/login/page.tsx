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
import { ArrowRight, Loader2, Eye, EyeOff, Mail, Lock, Sparkles, Shield, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const redirectTo = searchParams?.get('redirect') || '/dashboard'

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(redirectTo)
      }
    }
    checkSession()

    // Load remembered email
    const remembered = localStorage.getItem('remembered_email')
    if (remembered) {
      setFormData(prev => ({ ...prev, email: remembered }))
      setRememberMe(true)
    }
  }, [router, redirectTo])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) throw error

      if (data.session) {
        toast.success('Welcome back!', {
          description: 'Redirecting to your dashboard...'
        })

        if (rememberMe) {
          localStorage.setItem('remembered_email', formData.email)
        } else {
          localStorage.removeItem('remembered_email')
        }

        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 300)
      }
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Invalid credentials', {
          description: 'Please check your email and password'
        })
      } else {
        toast.error('Sign in failed', {
          description: error.message
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600">
              Sign in to your practice dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@practice.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-11 h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 pr-11 h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <Link 
                href="/reset-password" 
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
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

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">New to Dental CRM?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link href="/sign-up">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium border-2 hover:bg-gray-50"
            >
              Create your practice account
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-12 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-6">
            The modern CRM built for dental practices
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Lightning fast</h3>
                <p className="text-indigo-100">Manage your entire practice from one beautiful dashboard</p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Enterprise security</h3>
                <p className="text-indigo-100">HIPAA-compliant with bank-level encryption</p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">AI-powered insights</h3>
                <p className="text-indigo-100">Smart analytics to grow your revenue and patient base</p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <p className="text-white text-sm italic">
              "This CRM transformed how we manage our practice. Patient satisfaction is up 40% and revenue increased 25% in just 3 months."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
              <div>
                <p className="text-white font-semibold text-sm">Dr. Sarah Johnson</p>
                <p className="text-indigo-200 text-xs">Elite Dental Clinic</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
