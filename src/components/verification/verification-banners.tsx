/**
 * Verification Banners
 * 
 * Beautiful, intuitive banners for:
 * - Unvalidated organizations (grace period warnings)
 * - Unverified email addresses (verification reminders)
 * - Expired grace periods (restrictions active)
 */

'use client'

import { useState } from 'react'
import { useOrgValidation, useEmailVerification } from '@/lib/hooks/use-multi-org'
import { useAuth } from '@/lib/auth'
import { useFeatureFlag } from '@/lib/feature-flags-client'
import {
  AlertCircle,
  Mail,
  CheckCircle,
  X,
  Clock,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ============================================================================
// Organization Validation Banner
// ============================================================================

export function OrgValidationBanner() {
  const { appUser } = useAuth()
  const orgValidationEnabled = useFeatureFlag('org_validation_enabled', appUser?.tenant_id)
  const { needsValidation, isUnvalidated, isExpired, daysRemaining, status } = useOrgValidation()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if:
  // - Feature not enabled
  // - Org is validated
  // - User dismissed it
  if (!orgValidationEnabled || !needsValidation || dismissed) {
    return null
  }

  const handleValidate = () => {
    window.location.href = '/settings/organization/validate'
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Save dismissal to localStorage (expires after 24 hours)
    if (typeof window !== 'undefined') {
      const dismissalKey = `org-validation-dismissed-${appUser?.tenant_id}`
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      localStorage.setItem(dismissalKey, expiresAt.toString())
    }
  }

  // EXPIRED STATE - Critical (Red)
  if (isExpired) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500">
        <div className="px-4 py-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Organization Validation Required
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Your organization's grace period has expired. Some features are now restricted until you
                complete validation.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleValidate}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Validate Now
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={() => window.open('/docs/validation-requirements', '_blank')}
                  className="text-sm text-red-700 hover:text-red-900 underline"
                >
                  Learn more
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // UNVALIDATED STATE - Warning (Amber)
  if (isUnvalidated && daysRemaining !== null) {
    const isUrgent = daysRemaining <= 3

    return (
      <div className={cn(
        'border-l-4',
        isUrgent ? 'bg-amber-50 border-amber-500' : 'bg-blue-50 border-blue-500'
      )}>
        <div className="px-4 py-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Clock className={cn('h-5 w-5', isUrgent ? 'text-amber-500' : 'text-blue-500')} />
            </div>
            <div className="ml-3 flex-1">
              <h3 className={cn(
                'text-sm font-semibold',
                isUrgent ? 'text-amber-900' : 'text-blue-900'
              )}>
                {isUrgent ? 'Validation Required Soon' : 'Complete Organization Validation'}
              </h3>
              <p className={cn(
                'mt-1 text-sm',
                isUrgent ? 'text-amber-700' : 'text-blue-700'
              )}>
                Please validate your organization within{' '}
                <strong className="font-semibold">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</strong>
                {' '}to maintain full access to all features.
                {isUrgent && ' After this, some features will be restricted.'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleValidate}
                  size="sm"
                  className={cn(
                    'text-white',
                    isUrgent ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Validate Organization
                </Button>
                <button
                  onClick={handleDismiss}
                  className={cn(
                    'text-sm hover:underline',
                    isUrgent ? 'text-amber-700' : 'text-blue-700'
                  )}
                >
                  Remind me later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className={cn(
                'flex-shrink-0 ml-3 p-1 rounded hover:bg-black/5 transition-colors',
                isUrgent ? 'text-amber-600' : 'text-blue-600'
              )}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ============================================================================
// Email Verification Banner
// ============================================================================

export function EmailVerificationBanner() {
  const { appUser, user } = useAuth()
  const emailVerificationRequired = useFeatureFlag('email_verification_required', appUser?.tenant_id)
  const { needsVerification, isGracePeriod, isExpired, daysRemaining, isVerified } = useEmailVerification()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Check if dismissed in last 24 hours
  if (typeof window !== 'undefined') {
    const dismissalKey = `email-verification-dismissed-${appUser?.id}`
    const dismissedUntil = localStorage.getItem(dismissalKey)
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      if (!dismissed) setDismissed(true)
    }
  }

  // Don't show if:
  // - Feature not enabled
  // - Email already verified
  // - User dismissed it
  if (!emailVerificationRequired || isVerified || dismissed) {
    return null
  }

  const handleResendEmail = async () => {
    setSending(true)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })

      if (response.ok) {
        setSent(true)
        setTimeout(() => setSent(false), 5000) // Reset after 5 seconds
      } else {
        alert('Failed to resend verification email. Please try again.')
      }
    } catch (error) {
      console.error('[EmailVerificationBanner] Error:', error)
      alert('Failed to resend verification email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Save dismissal to localStorage (expires after 24 hours)
    if (typeof window !== 'undefined') {
      const dismissalKey = `email-verification-dismissed-${appUser?.id}`
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      localStorage.setItem(dismissalKey, expiresAt.toString())
    }
  }

  // EXPIRED STATE - Critical (Red)
  if (isExpired) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500">
        <div className="px-4 py-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Email Verification Required
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Your grace period has expired. You cannot send invitations or perform certain actions until
                you verify your email address.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleResendEmail}
                  disabled={sending || sent}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {sent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Email Sent!
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {sending ? 'Sending...' : 'Resend Verification Email'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-red-600">
                  Check <strong>{user?.email}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // GRACE PERIOD STATE - Warning (Amber/Blue)
  if (isGracePeriod && daysRemaining !== null) {
    const isUrgent = daysRemaining <= 3

    return (
      <div className={cn(
        'border-l-4',
        isUrgent ? 'bg-amber-50 border-amber-500' : 'bg-blue-50 border-blue-500'
      )}>
        <div className="px-4 py-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Mail className={cn('h-5 w-5', isUrgent ? 'text-amber-500' : 'text-blue-500')} />
            </div>
            <div className="ml-3 flex-1">
              <h3 className={cn(
                'text-sm font-semibold',
                isUrgent ? 'text-amber-900' : 'text-blue-900'
              )}>
                {isUrgent ? 'Verify Your Email Soon' : 'Please Verify Your Email'}
              </h3>
              <p className={cn(
                'mt-1 text-sm',
                isUrgent ? 'text-amber-700' : 'text-blue-700'
              )}>
                Please verify your email address within{' '}
                <strong className="font-semibold">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</strong>.
                {isUrgent && ' After this, some features will be restricted.'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleResendEmail}
                  disabled={sending || sent}
                  size="sm"
                  className={cn(
                    'text-white',
                    isUrgent ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {sent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Email Sent!
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {sending ? 'Sending...' : 'Resend Email'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-600">
                  Sent to <strong>{user?.email}</strong>
                </p>
                <button
                  onClick={handleDismiss}
                  className={cn(
                    'text-sm hover:underline ml-auto',
                    isUrgent ? 'text-amber-700' : 'text-blue-700'
                  )}
                >
                  Remind me later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className={cn(
                'flex-shrink-0 ml-3 p-1 rounded hover:bg-black/5 transition-colors',
                isUrgent ? 'text-amber-600' : 'text-blue-600'
              )}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // NEEDS VERIFICATION (No grace period info available)
  if (needsVerification) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500">
        <div className="px-4 py-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                Verify Your Email Address
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Please verify your email to access all features.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleResendEmail}
                  disabled={sending || sent}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Email Sent!
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {sending ? 'Sending...' : 'Send Verification Email'}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 ml-3 p-1 rounded hover:bg-black/5 transition-colors text-blue-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ============================================================================
// Combined Verification Banners Container
// ============================================================================

export function VerificationBanners() {
  return (
    <div className="space-y-0">
      <EmailVerificationBanner />
      <OrgValidationBanner />
    </div>
  )
}


