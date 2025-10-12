'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Mail, Copy, Check } from 'lucide-react'

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  onInvited?: () => void
}

export function InviteUserDialog({ open, onOpenChange, tenantId, onInvited }: InviteUserDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'staff' | 'viewer'>('staff')
  const [loading, setLoading] = useState(false)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          tenant_id: tenantId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setInvitationLink(data.invitationLink)
      toast.success(`Invitation sent to ${email}!`, {
        description: 'They will receive an email with a link to join your team'
      })

      if (onInvited) onInvited()

    } catch (error: any) {
      console.error('Error inviting user:', error)
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      toast.success('Invitation link copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('staff')
    setInvitationLink(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your practice team
          </DialogDescription>
        </DialogHeader>

        {!invitationLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@practice.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    <div>
                      <div className="font-medium">Manager</div>
                      <div className="text-xs text-gray-600">Can view all deals, manage pipelines</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div>
                      <div className="font-medium">Staff</div>
                      <div className="text-xs text-gray-600">Can view and edit their own deals</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <div className="font-medium">Viewer</div>
                      <div className="text-xs text-gray-600">Read-only access</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <strong>Note:</strong> An invitation will be sent to this email address. 
              The recipient will have 7 days to accept the invitation.
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={loading || !email}>
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900">Invitation Sent!</h4>
                  <p className="text-sm text-green-700 mt-1">
                    An invitation has been sent to <strong>{email}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                You can share this link directly with the new team member
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

