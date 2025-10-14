'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Building2, Mail, Lock, Loader2, Check, X, AlertCircle } from 'lucide-react'

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (token) {
      fetchInvitation()
    }
  }, [token])

  const fetchInvitation = async () => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*, tenants(name)')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single()

      if (error) throw error

      if (!data) {
        setError('Invitation not found or has expired')
        return
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        return
      }

      setInvitation(data)
    } catch (error: any) {
      console.error('Error fetching invitation:', error)
      setError('Invalid or expired invitation link')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName) {
      toast.error('Please enter your full name')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Step 2: Create app_user record
      const { error: appUserError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          tenant_id: invitation.tenant_id,
          full_name: formData.fullName,
          email: invitation.email,
          role: invitation.role,
          status: 'active'
        })

      if (appUserError) throw appUserError

      // Step 3: Update invitation status
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      toast.success('Welcome to the team!', {
        description: 'Your account has been created successfully'
      })

      setTimeout(() => {
        router.push('/pipeline')
      }, 1500)

    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation', {
        description: error.message || 'Please try again'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            {error?.includes('expired') ? (
              <AlertCircle className="w-8 h-8 text-red-600" />
            ) : (
              <X className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error?.includes('expired') ? 'Invitation Expired' : 'Invalid Invitation'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'This invitation link is not valid'}
          </p>
          <Button onClick={() => router.push('/login')} variant="outline">
            Go to Sign In
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Join {invitation.tenants?.name}
          </h1>
          <p className="text-lg text-gray-600">
            You've been invited as {invitation.role}
          </p>
        </div>

        {/* Invitation Info */}
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Invited Email</p>
              <p className="text-sm text-gray-600">{invitation.email}</p>
            </div>
          </div>
        </Card>

        {/* Main Card */}
        <Card className="p-8 shadow-2xl border-0">
          <form onSubmit={handleAcceptInvitation} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="e.g., Dr. John Smith"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={submitting}
                />
              </div>
              {formData.password && (
                <p className={`text-sm ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.password.length >= 8 ? '✓' : '○'} At least 8 characters
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={submitting}
                />
              </div>
              {formData.confirmPassword && (
                <p className={`text-sm ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {formData.password === formData.confirmPassword ? '✓ Passwords match' : '○ Passwords must match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Accept Invitation & Join Team
                  <Check className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}



