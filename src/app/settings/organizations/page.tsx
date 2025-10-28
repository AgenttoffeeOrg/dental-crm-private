'use client'

/**
 * Organization Management Page
 * 
 * Features:
 * - View all organizations user belongs to
 * - Switch between organizations
 * - Create new organizations
 * - Manage organization settings
 * - View membership roles
 * - Leave organizations (non-owners)
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMemberships, useOrgSwitcher } from '@/lib/hooks/use-multi-org'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import {
  Building2,
  Plus,
  Check,
  Settings,
  Users,
  Crown,
  Shield,
  Eye,
  UserCircle,
  LogOut,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface OrganizationWithDetails {
  id: string
  tenant_id: string
  tenant_name: string
  role: string
  status: string
  tenant_logo?: string
  member_count?: number
  created_at: string
}

export default function OrganizationsPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const { memberships, currentMembership, loading: membershipsLoading } = useMemberships()
  const { switchOrg, switching } = useOrgSwitcher()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [organizationsWithDetails, setOrganizationsWithDetails] = useState<OrganizationWithDetails[]>([])
  const [loadingDetails, setLoadingDetails] = useState(true)

  // Load organization details
  useEffect(() => {
    if (!membershipsLoading && memberships.length > 0) {
      loadOrganizationDetails()
    }
  }, [memberships, membershipsLoading])

  const loadOrganizationDetails = async () => {
    try {
      setLoadingDetails(true)
      const supabase = createClient()
      
      // Fetch member counts for each organization
      const orgsWithDetails = await Promise.all(
        memberships.map(async (membership) => {
          // Get member count
          const { count } = await supabase
            .from('app_users')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', membership.tenant_id)
          
          return {
            ...membership,
            member_count: count || 0,
          }
        })
      )
      
      setOrganizationsWithDetails(orgsWithDetails)
    } catch (error) {
      console.error('Error loading organization details:', error)
      toast.error('Failed to load organization details')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Filter organizations by search query
  const filteredOrganizations = organizationsWithDetails.filter(org =>
    org.tenant_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group organizations by role
  const ownedOrgs = filteredOrganizations.filter(org => org.role === 'owner')
  const memberOrgs = filteredOrganizations.filter(org => org.role !== 'owner')

  const handleSwitchOrg = async (tenantId: string) => {
    console.log('[SETTINGS_PAGE] handleSwitchOrg called with:', tenantId)
    console.log('[SETTINGS_PAGE] Current membership:', currentMembership?.tenant_id)
    
    const result = await switchOrg(tenantId)
    
    console.log('[SETTINGS_PAGE] switchOrg result:', result)
    
    if (result.success) {
      toast.success('Switched organization successfully')
      // Page will reload automatically
    } else {
      toast.error(result.error || 'Failed to switch organization')
    }
  }

  const handleLeaveOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to leave "${orgName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', appUser?.id)
        .eq('tenant_id', orgId)

      if (error) throw error

      toast.success(`Left "${orgName}" successfully`)
      
      // Reload to update memberships
      globalThis.location.reload()
    } catch (error) {
      console.error('Error leaving organization:', error)
      toast.error('Failed to leave organization')
    }
  }

  if (membershipsLoading || loadingDetails) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
            <p className="text-gray-600 mt-1">
              Manage your organization memberships and switch between accounts
            </p>
          </div>
          <Button
            onClick={() => router.push('/settings/organizations/create')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Organization
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Current Organization */}
      {currentMembership && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Current Organization
          </h2>
          <OrganizationCard
            org={organizationsWithDetails.find(o => o.tenant_id === currentMembership.tenant_id) || currentMembership}
            isCurrent={true}
            onSwitch={handleSwitchOrg}
            onLeave={handleLeaveOrganization}
            switching={switching}
          />
        </div>
      )}

      {/* Owned Organizations */}
      {ownedOrgs.some(org => org.tenant_id !== currentMembership?.tenant_id) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-600" />
            Organizations You Own
          </h2>
          <div className="grid gap-4">
            {ownedOrgs
              .filter(org => org.tenant_id !== currentMembership?.tenant_id)
              .map(org => (
                <OrganizationCard
                  key={org.id}
                  org={org}
                  isCurrent={false}
                  onSwitch={handleSwitchOrg}
                  onLeave={handleLeaveOrganization}
                  switching={switching}
                />
              ))}
          </div>
        </div>
      )}

      {/* Member Organizations */}
      {memberOrgs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Member Organizations
          </h2>
          <div className="grid gap-4">
            {memberOrgs.map(org => (
              <OrganizationCard
                key={org.id}
                org={org}
                isCurrent={org.tenant_id === currentMembership?.tenant_id}
                onSwitch={handleSwitchOrg}
                onLeave={handleLeaveOrganization}
                switching={switching}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredOrganizations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No organizations found' : 'No organizations yet'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first organization to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/settings/organizations/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Alert className="mt-8">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          <strong>Need help?</strong> You can belong to multiple organizations and switch between them anytime.
          Owners have full control, while members have limited permissions based on their role.
        </AlertDescription>
      </Alert>
    </div>
  )
}

// Organization Card Component
interface OrganizationCardProps {
  org: OrganizationWithDetails | any
  isCurrent: boolean
  onSwitch: (tenantId: string) => void
  onLeave: (orgId: string, orgName: string) => void
  switching: boolean
}

function OrganizationCard({ org, isCurrent, onSwitch, onLeave, switching }: OrganizationCardProps) {
  const roleConfig = {
    owner: { icon: Crown, color: 'text-amber-600 bg-amber-50', label: 'Owner' },
    admin: { icon: Shield, color: 'text-blue-600 bg-blue-50', label: 'Admin' },
    manager: { icon: UserCircle, color: 'text-green-600 bg-green-50', label: 'Manager' },
    staff: { icon: Users, color: 'text-gray-600 bg-gray-50', label: 'Staff' },
    viewer: { icon: Eye, color: 'text-purple-600 bg-purple-50', label: 'Viewer' },
  }[org.role] || { icon: UserCircle, color: 'text-gray-600 bg-gray-50', label: org.role }

  const RoleIcon = roleConfig.icon

  return (
    <Card className={cn(
      'transition-all duration-200',
      isCurrent && 'border-blue-500 bg-blue-50/30'
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Org Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Logo/Avatar */}
            <div className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0',
              isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            )}>
              {org.tenant_logo ? (
                <img
                  src={org.tenant_logo}
                  alt={org.tenant_name}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                org.tenant_name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {org.tenant_name}
                </h3>
                {isCurrent && (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Current
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded', roleConfig.color)}>
                  <RoleIcon className="w-4 h-4" />
                  <span className="font-medium">{roleConfig.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {org.member_count || 0} {(org.member_count || 0) === 1 ? 'member' : 'members'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isCurrent && (
              <Button
                variant="default"
                onClick={() => onSwitch(org.tenant_id)}
                disabled={switching}
                className="gap-2"
              >
                {switching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Switch
                  </>
                )}
              </Button>
            )}
            
            {org.role === 'owner' && isCurrent && (
              <Button
                variant="outline"
                onClick={() => { globalThis.location.href = '/settings?tab=company' }}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            )}

            {org.role !== 'owner' && !isCurrent && (
              <Button
                variant="ghost"
                onClick={() => onLeave(org.tenant_id, org.tenant_name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

