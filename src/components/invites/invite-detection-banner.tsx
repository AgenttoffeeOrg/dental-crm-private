'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Mail, CheckCircle, Clock, Building2, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { PendingInvite, InviteDetectionBannerProps } from '@/types/invites'

/**
 * InviteDetectionBanner Component
 * 
 * Displays pending organization invitations to the user.
 * Auto-detects invites on mount and shows them in an elegant banner.
 * 
 * Features:
 * - Auto-detection of pending invites
 * - Shows inviter name, org name, and role
 * - One-click accept
 * - Loading and error states
 * - Dismissible
 * - Beautiful, modern UI
 * 
 * Usage:
 * ```tsx
 * <InviteDetectionBanner 
 *   userEmail="user@example.com"
 *   onInvitesDetected={(invites) => console.log('Found invites:', invites)}
 *   onAcceptInvite={(invite) => handleAccept(invite)}
 * />
 * ```
 */
export function InviteDetectionBanner({
  userEmail,
  onInvitesDetected,
  onAcceptInvite,
  className = ''
}: InviteDetectionBannerProps) {
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null) // invite ID being accepted
  const [dismissed, setDismissed] = useState(false)

  const handleDismissInvite = (inviteId: string) => {
    setInvites(prev => {
      const filtered = prev.filter(i => i.id !== inviteId)
      if (filtered.length === 0) {
        setDismissed(true)
      }
      return filtered
    })
  }

  // =====================================================================================================
  // FETCH PENDING INVITES
  // =====================================================================================================
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/invites/check-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to check for invites')
        }

        const data = await response.json()
        
        if (data.has_invites && data.invites.length > 0) {
          setInvites(data.invites)
          onInvitesDetected?.(data.invites)
        }
      } catch (err: any) {
        console.error('[INVITE_BANNER] Error fetching invites:', err)
        setError(err.message || 'Failed to check for pending invitations')
      } finally {
        setLoading(false)
      }
    }

    if (userEmail) {
      fetchInvites()
    }
  }, [userEmail, onInvitesDetected])

  // =====================================================================================================
  // ACCEPT INVITE HANDLER
  // =====================================================================================================
  const handleAccept = async (invite: PendingInvite) => {
    try {
      setAccepting(invite.id)
      setError(null)

      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: invite.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to accept invite')
      }

      const data = await response.json()
      
      // Remove accepted invite from list
      setInvites(prev => prev.filter(i => i.id !== invite.id))
      
      // Notify parent
      onAcceptInvite?.(invite)
      
      // Show success (parent will likely redirect)
      console.log('[INVITE_BANNER] Successfully accepted invite:', data)
      
    } catch (err: any) {
      console.error('[INVITE_BANNER] Error accepting invite:', err)
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setAccepting(null)
    }
  }

  // =====================================================================================================
  // RENDER: LOADING STATE
  // =====================================================================================================
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  // =====================================================================================================
  // RENDER: NO INVITES
  // =====================================================================================================
  if (invites.length === 0 || dismissed) {
    return null
  }

  // =====================================================================================================
  // RENDER: INVITES DETECTED
  // =====================================================================================================
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Error Alert (if any) */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invites List */}
      {invites.map((invite, index) => (
        <Alert 
          key={invite.id} 
          className="relative border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
        >
          {/* Dismiss Button */}
          <button
            onClick={() => handleDismissInvite(invite.id)}
            className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            disabled={accepting === invite.id}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>

          {/* Icon */}
          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />

          <div className="flex-1 pr-8">
            {/* Title */}
            <AlertTitle className="mb-2 text-base font-semibold text-blue-900 dark:text-blue-100">
              {index === 0 && invites.length === 1 ? (
                'You have a pending invitation'
              ) : (
                `Invitation ${index + 1} of ${invites.length}`
              )}
            </AlertTitle>

            {/* Organization Info */}
            <AlertDescription className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  {/* Organization Name */}
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {invite.tenant_name}
                    </span>
                  </div>

                  {/* Invited By */}
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">{invite.invited_by_name}</span> invited you to join as{' '}
                    <Badge variant="secondary" className="ml-1">
                      {invite.assigned_role}
                    </Badge>
                  </p>

                  {/* Personal Message */}
                  {invite.personal_message && (
                    <div className="mt-2 rounded-md bg-white/50 p-3 dark:bg-black/20">
                      <p className="text-sm italic text-blue-700 dark:text-blue-300">
                        "{invite.personal_message}"
                      </p>
                    </div>
                  )}

                  {/* Expires At */}
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Expires {new Date(invite.expires_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleAccept(invite)}
                  disabled={accepting === invite.id}
                  size="sm"
                  className="gap-1.5"
                >
                  {accepting === invite.id ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Accept Invitation
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleDismissInvite(invite.id)}
                  disabled={accepting === invite.id}
                  variant="outline"
                  size="sm"
                  className="text-blue-700 dark:text-blue-300"
                >
                  Maybe Later
                </Button>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      ))}

      {/* Multiple Invites Info */}
      {invites.length > 1 && (
        <p className="text-center text-sm text-muted-foreground">
          You can accept multiple invitations and switch between organizations anytime.
        </p>
      )}
    </div>
  )
}

