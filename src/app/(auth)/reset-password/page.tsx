'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2, Mail, Lock, CheckCircle, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'request' | 'confirm'>('request')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Check if we have a reset token in URL
  const resetToken = searchParams?.get('token')

  useState(() => {
    if (resetToken) {
      setStep('confirm')
    }
  }, [resetToken])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      toast.success('Check your email!', {
        description: 'We sent you a password reset link'
      })

      // Show success message
      setStep('confirm')
    } catch (error: any) {
      toast.error('Failed to send reset email', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) throw error

      toast.success('Password updated!', {
        description: 'You can now sign in with your new password'
      })

      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (error: any) {
      toast.error('Failed to update password', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link 
          href="/login"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to login
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
              {step === 'request' ? (
                <Lock className="h-7 w-7 text-white" />
              ) : resetToken ? (
                <Lock className="h-7 w-7 text-white" />
              ) : (
                <CheckCircle className="h-7 w-7 text-white" />
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 'request' ? 'Reset your password' : resetToken ? 'Set new password' : 'Check your email'}
            </h1>
            <p className="text-gray-600">
              {step === 'request' 
                ? 'Enter your email and we\'ll send you a reset link'
                : resetToken 
                ? 'Choose a strong password for your account'
                : 'We\'ve sent you a password reset link'}
            </p>
          </div>

          {/* Request Reset Form */}
          {step === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                  Email address
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@practice.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 text-base"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Update Password Form */}
          {step === 'confirm' && resetToken && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-900">
                  New password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 text-base"
                    autoFocus
                    disabled={loading}
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
              </div>

              <div>
                <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-gray-900">
                  Confirm new password
                </Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 h-12 text-base"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Update password
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Email Sent Confirmation */}
          {step === 'confirm' && !resetToken && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-600 mb-6">
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Click the link in the email to reset your password
              </p>
              <Button
                variant="outline"
                onClick={() => setStep('request')}
                className="w-full h-12"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try a different email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
