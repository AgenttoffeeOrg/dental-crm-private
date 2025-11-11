'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Users, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function OrganizationSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    checkExistingOrganization()
  }, [])

  const checkExistingOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: membership } = await supabase
        .from('user_tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (membership) {
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.error('Error checking organization:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name is required')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          description: orgDescription.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      toast.success('Your organization has been created.')

      router.push('/onboarding')
    } catch (error: any) {
      console.error('Create organization error:', error)
      toast.error(error.message || 'Failed to create organization. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinOrganization = async () => {
    if (!inviteCode.trim()) {
      toast.error('Invite code is required')
      return
    }

    setIsJoining(true)
    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inviteCode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization')
      }

      toast.success('You have joined the organization.')

      router.push('/onboarding')
    } catch (error: any) {
      console.error('Join organization error:', error)
      toast.error(error.message || 'Invalid or expired invite code. Please check and try again.')
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome! Let's get you set up
          </h1>
          <p className="mt-2 text-gray-600">
            You need to either create a new organization or join an existing one
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be part of an organization to use the CRM. Choose one of the options below.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <CardTitle>Create New Organization</CardTitle>
              </div>
              <CardDescription>
                Start your own dental practice organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  placeholder="My Dental Practice"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <div>
                <Label htmlFor="org-desc">Description (Optional)</Label>
                <Textarea
                  id="org-desc"
                  placeholder="A brief description of your practice..."
                  rows={3}
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <Button
                onClick={handleCreateOrganization}
                disabled={isCreating || !orgName.trim()}
                className="w-full"
              >
                {isCreating ? 'Creating...' : 'Create Organization'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-green-600" />
                <CardTitle>Join Existing Organization</CardTitle>
              </div>
              <CardDescription>
                Have an invite code? Join your team's organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invite-code">Invite Code *</Label>
                <Input
                  id="invite-code"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={isJoining}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ask your organization admin for an invite code
                </p>
              </div>
              <Button
                onClick={handleJoinOrganization}
                disabled={isJoining || !inviteCode.trim()}
                className="w-full"
                variant="secondary"
              >
                {isJoining ? 'Joining...' : 'Join Organization'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

