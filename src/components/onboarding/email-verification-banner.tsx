'use client'

import { useState } from 'react'
import { Mail, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export function EmailVerificationBanner() {
  const { user, appUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Don't show if email is verified or user dismissed it
  if (dismissed || !user || appUser?.email_verified) {
    return null
  }

  const handleResendEmail = async () => {
    if (!user?.email) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })
      
      if (error) throw error
      
      toast.success('Verification email sent!', {
        description: 'Please check your inbox and spam folder.',
        icon: <CheckCircle className="h-4 w-4" />
      })
    } catch (error: any) {
      console.error('Error resending verification email:', error)
      toast.error('Failed to send email', {
        description: error.message || 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Verify your email address
            </h3>
            <p className="text-sm text-blue-700">
              We sent a verification link to <span className="font-medium">{user?.email}</span>. 
              Click the link in the email to verify your account.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={handleResendEmail}
              disabled={loading}
              className="h-auto p-0 mt-2 text-blue-700 hover:text-blue-900 font-medium"
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
