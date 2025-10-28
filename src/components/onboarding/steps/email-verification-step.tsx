'use client'

import React, { useState, useEffect } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

/**
 * EmailVerificationStep
 * 
 * Step 1: Email verification
 * - Checks if user's email is verified
 * - Sends verification email if not verified
 * - Auto-advances when verified
 */

export function EmailVerificationStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null)

  useEffect(() => {
    checkEmailVerification()
  }, [])

  const checkEmailVerification = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.error('Error getting user:', error)
        return
      }

      setEmailAddress(user.email || '')
      const isVerified = user.email_confirmed_at !== null

      setEmailVerified(isVerified)
      
      // Update form data
      updateFieldValue('email', user.email)
      updateFieldValue('email_verified', isVerified)
      
    } catch (error) {
      console.error('Error checking email verification:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendVerificationEmail = async () => {
    try {
      setSending(true)
      const supabase = createClient()
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailAddress
      })

      if (error) throw error

      setLastSentAt(new Date())
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error: any) {
      console.error('Error sending verification email:', error)
      toast.error(error.message || 'Failed to send verification email')
    } finally {
      setSending(false)
    }
  }

  const canResendEmail = () => {
    if (!lastSentAt) return true
    const secondsSinceLastSend = (Date.now() - lastSentAt.getTime()) / 1000
    return secondsSinceLastSend > 60 // 1 minute cooldown
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (emailVerified) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium mb-1">Email Verified! ✓</div>
            <div className="text-sm">
              Your email address <strong>{emailAddress}</strong> has been verified.
              You're all set to continue with your profile setup.
            </div>
          </AlertDescription>
        </Alert>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Mail className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            You're Ready to Go!
          </h3>
          <p className="text-gray-600">
            Click "Next" to continue setting up your profile.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Verification Required Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>
          <div className="font-medium mb-1">Email Verification Required</div>
          <div className="text-sm">
            Please verify your email address to continue with the setup process.
          </div>
        </AlertDescription>
      </Alert>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="h-6 w-6 text-gray-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Verify Your Email</h3>
            <p className="text-gray-600 text-sm mb-4">
              We've sent a verification link to:
            </p>
            <div className="bg-white border border-gray-200 rounded px-4 py-2 mb-4">
              <p className="font-mono text-sm text-gray-900">{emailAddress}</p>
            </div>
            <p className="text-gray-600 text-sm">
              Please check your inbox and click the verification link. Once verified, 
              this page will automatically update.
            </p>
          </div>
        </div>

        {/* Resend Button */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Didn't receive the email?</p>
            <Button
              onClick={sendVerificationEmail}
              disabled={!canResendEmail() || sending}
              variant="outline"
              size="sm"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Resend Email'
              )}
            </Button>
          </div>
          {lastSentAt && (
            <p className="text-xs text-gray-500 mt-2">
              Last sent {Math.floor((Date.now() - lastSentAt.getTime()) / 1000)} seconds ago
            </p>
          )}
        </div>

        {/* Refresh Button */}
        <div className="pt-2">
          <Button
            onClick={checkEmailVerification}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Already verified? Click here to refresh
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Check your spam/junk folder if you don't see the email</li>
          <li>Make sure to check the correct inbox for {emailAddress}</li>
          <li>The verification link expires after 24 hours</li>
          <li>You can click "Resend Email" to get a new verification link</li>
        </ul>
      </div>
    </div>
  )
}

