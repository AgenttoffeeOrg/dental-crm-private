'use client'

/**
 * Team Invites Tab - Complete Invite Management Interface
 * 
 * Features:
 * - Send new invites with role selection
 * - View pending invites
 * - Revoke invites
 * - Resend invites
 * - View invite history
 * - Copy invite codes
 * 
 * @component TeamInvitesTab
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  Send, 
  Copy, 
  X, 
  RefreshCw, 
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Shield,
  Users,
  Eye,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/posthog'

// Types
type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
type UserRole = 'owner' | 'admin' | 'staff' | 'read_only'

interface PendingInvite {
  id: string
  tenant_id: string
  invitee_email: string
  invite_code: string
  role: UserRole
  status: InviteStatus
  expires_at: string
  created_at: string
  invited_by_email?: string
  personal_message?: string
}

interface InviteFormData {
  email: string
  role: UserRole
  personalMessage: string
}

// Role configuration
const ROLES: Array<{ value: UserRole; label: string; description: string; icon: React.ReactNode }> = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access to all features and settings',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Can manage team members and most settings',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    value: 'staff',
    label: 'Staff',
    description: 'Can manage contacts, deals, and tasks',
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: 'read_only',
    label: 'Read Only',
    description: 'Can view data but not make changes',
    icon: <Eye className="h-4 w-4" />,
  },
]

// Status badges
const getStatusBadge = (status: InviteStatus) => {
  const config = {
    pending: { icon: Clock, variant: 'outline' as const, label: 'Pending' },
    accepted: { icon: CheckCircle, variant: 'default' as const, label: 'Accepted' },
    declined: { icon: XCircle, variant: 'secondary' as const, label: 'Declined' },
    expired: { icon: AlertCircle, variant: 'destructive' as const, label: 'Expired' },
    revoked: { icon: X, variant: 'destructive' as const, label: 'Revoked' },
  }
  
  const { icon: Icon, variant, label } = config[status]
  
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

export function TeamInvitesTab() {
  const { appUser } = useAuth()
  
  // Form state
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'staff',
    personalMessage: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  
  // List state
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // Check user role
  const userRole = appUser?.role || 'staff'
  const canInvite = ['owner', 'admin'].includes(userRole)
  
  // Load invites
  const loadInvites = async () => {
    if (!appUser?.active_tenant_id) return
    
    try {
      setIsLoading(true)
      setLoadError(null)
      
      const response = await fetch('/api/invites/list')
      
      if (!response.ok) {
        throw new Error('Failed to load invites')
      }
      
      const data = await response.json()
      setInvites(data.invites || [])
    } catch (error: any) {
      console.error('[INVITES] Error loading:', error)
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Load on mount
  useEffect(() => {
    loadInvites()
  }, [appUser?.active_tenant_id])
  
  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canInvite) {
      setSubmitError('You do not have permission to send invites')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    setGeneratedCode(null)
    
    try {
      const response = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeEmail: formData.email,
          role: formData.role,
          personalMessage: formData.personalMessage || undefined,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }
      
      // Success
      setSubmitSuccess(true)
      setGeneratedCode(data.inviteCode)
      
      // Track event
      trackEvent('invite_sent', {
        role: formData.role,
        tenant_id: appUser?.active_tenant_id,
      })
      
      // Reset form
      setFormData({
        email: '',
        role: 'staff',
        personalMessage: '',
      })
      
      // Reload invites list
      loadInvites()
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false)
        setGeneratedCode(null)
      }, 5000)
      
    } catch (error: any) {
      console.error('[INVITES] Error sending:', error)
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle revoke
  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return
    
    try {
      const response = await fetch(`/api/invites/${inviteId}/revoke`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to revoke invite')
      }
      
      // Reload invites
      loadInvites()
      
      trackEvent('invite_revoked', {
        invite_id: inviteId,
        tenant_id: appUser?.active_tenant_id,
      })
    } catch (error: any) {
      console.error('[INVITES] Error revoking:', error)
      alert(`Error: ${error.message}`)
    }
  }
  
  // Handle resend
  const handleResend = async (inviteId: string, email: string) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}/resend`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to resend invite')
      }
      
      alert(`Invite resent to ${email}`)
      
      trackEvent('invite_resent', {
        invite_id: inviteId,
        tenant_id: appUser?.active_tenant_id,
      })
    } catch (error: any) {
      console.error('[INVITES] Error resending:', error)
      alert(`Error: ${error.message}`)
    }
  }
  
  // Handle copy code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  // Check if expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }
  
  if (!canInvite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Team Invites
          </CardTitle>
          <CardDescription>
            You need Owner or Administrator permissions to manage team invites.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Send Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Invite
          </CardTitle>
          <CardDescription>
            Invite new team members to join your organization. They'll receive an invite code via email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>
            
            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        {role.icon}
                        <div className="flex flex-col">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Personal Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to the invite email..."
                value={formData.personalMessage}
                onChange={(e) => setFormData({ ...formData, personalMessage: e.target.value })}
                rows={3}
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {formData.personalMessage.length}/500 characters
              </p>
            </div>
            
            {/* Error */}
            {submitError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}
            
            {/* Success */}
            {submitSuccess && generatedCode && (
              <div className="rounded-md bg-green-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Invite sent successfully!
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded border text-lg font-mono tracking-wider">
                    {generatedCode}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyCode(generatedCode)}
                  >
                    {copiedCode === generatedCode ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-green-700">
                  The invite code has been sent to <strong>{formData.email}</strong>. They can also enter the code manually.
                </p>
              </div>
            )}
            
            {/* Submit */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Pending Invites List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Invites
          </CardTitle>
          <CardDescription>
            Manage invites that haven't been accepted yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="text-center py-8 text-destructive">
              Error loading invites: {loadError}
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending invites. Send your first invite above!
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                >
                  {/* Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invite.invitee_email}</span>
                      {getStatusBadge(invite.status)}
                      <Badge variant="outline">{ROLES.find(r => r.value === invite.role)?.label}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Code: <code className="px-1 py-0.5 bg-muted rounded font-mono">{invite.invite_code}</code></span>
                      <span>•</span>
                      <span>Expires: {formatDate(invite.expires_at)}</span>
                      {isExpired(invite.expires_at) && (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </div>
                    
                    {invite.personal_message && (
                      <p className="text-sm text-muted-foreground italic">
                        "{invite.personal_message}"
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {invite.status === 'pending' && !isExpired(invite.expires_at) && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyCode(invite.invite_code)}
                      >
                        {copiedCode === invite.invite_code ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(invite.id, invite.invitee_email)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevoke(invite.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

