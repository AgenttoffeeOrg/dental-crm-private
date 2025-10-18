'use client'

/**
 * Multi-Location Management Tab
 * 
 * Manage dental group locations (tenants) and user access
 * Enterprise multi-location feature
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MapPin, Plus, Edit, Trash2, Star, Building2, Users, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { FeatureFlags } from '@/lib/feature-flags'
import { useAccessibleLocations, useDentalGroup } from '@/lib/hooks/use-multi-location'

interface TenantLocation {
  id: string
  name: string
  location_name: string | null
  is_multi_location: boolean
  website_url: string | null
  billing_email: string | null
  created_at: string
  // Computed fields
  user_count?: number
}

export function MultiLocationManagementTab() {
  const { dentalGroup, loading: groupLoading, isPartOfGroup } = useDentalGroup()
  const { locations: accessibleLocations, loading: locationsLoading, refresh: refreshLocations } = useAccessibleLocations()
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationWebsite, setNewLocationWebsite] = useState('')

  const loading = groupLoading || locationsLoading

  // Don't show if multi-location is disabled
  if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-1">Multi-Location Feature Disabled</h3>
        <p className="text-sm text-gray-600">
          This feature is not enabled in your current configuration.
        </p>
      </Card>
    )
  }

  useEffect(() => {
    loadUserCounts()
  }, [accessibleLocations])

  const loadUserCounts = async () => {
    if (!accessibleLocations || accessibleLocations.length === 0) return
    
    try {
      const supabase = createClient()
      
      // Get user count for each accessible location
      const locationsWithCounts = await Promise.all(
        accessibleLocations.map(async (loc) => {
          const { count } = await supabase
            .from('app_users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', loc.id)
          
          return {
            ...loc,
            user_count: count || 0
          }
        })
      )
      
      setLocations(locationsWithCounts as any)
    } catch (error) {
      console.error('[MultiLocation] Error loading user counts:', error)
      setLocations(accessibleLocations as any)
    }
  }

  const handleCreateLocation = async () => {
    if (!newLocationName || !dentalGroup) {
      toast.error('Please enter a location name')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create new tenant/location
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          name: `${dentalGroup.name}`,
          location_name: newLocationName,
          dental_group_id: dentalGroup.id,
          is_multi_location: true,
          website_url: newLocationWebsite || null,
          billing_email: dentalGroup.billing_email,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[MultiLocation] Error creating:', error)
        toast.error('Failed to create location')
        return
      }

      toast.success(`Location "${newLocationName}" created successfully`)
      setShowCreateDialog(false)
      setNewLocationName('')
      setNewLocationWebsite('')
      
      // Refresh locations using the hook
      refreshLocations()
    } catch (error) {
      console.error('[MultiLocation] Error creating location:', error)
      toast.error('Failed to create location')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!isPartOfGroup) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-1">No Dental Group Found</h3>
        <p className="text-sm text-gray-600 mb-4">
          You are not part of a multi-location dental group. Contact support to set up multi-location features.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dental Group Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{dentalGroup.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Multi-Location Dental Group</p>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs text-gray-500">
                  📧 {dentalGroup.primary_email}
                </p>
                <Badge className="bg-green-100 text-green-800">
                  {locations.length} {locations.length === 1 ? 'Location' : 'Locations'}
                </Badge>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={dentalGroup.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}>
            {dentalGroup.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </Card>

      {/* Locations Management */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Locations</h3>
          <p className="text-sm text-gray-600">Manage all locations in your dental group</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>Create a new location for {dentalGroup.name}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label>Location Name *</Label>
                <Input
                  placeholder="e.g., Downtown Branch, North Office"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will appear as: {dentalGroup.name} - {newLocationName || '(location name)'}
                </p>
              </div>
              
              <div>
                <Label>Website URL (Optional)</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={newLocationWebsite}
                  onChange={(e) => setNewLocationWebsite(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLocation}>
                  Create Location
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Locations Yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add your first location to get started with multi-location management
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Location
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locations.map((location, index) => (
            <Card key={location.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {location.location_name || location.name}
                      </h4>
                      {index === 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-4" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{location.name}</p>
                    {location.website_url && (
                      <p className="text-xs text-blue-600 mt-1">
                        🌐 {location.website_url}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        {location.user_count || 0} {location.user_count === 1 ? 'user' : 'users'}
                      </div>
                      <span className="text-xs text-gray-400">
                        Created {new Date(location.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-1" />
                    Manage Users
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Subscription Info */}
      {FeatureFlags.ENABLE_BILLING && (
        <Card className="p-6 bg-gray-50 border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Subscription</h4>
              <p className="text-sm text-gray-600 mt-1">
                Consolidated billing across all locations
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/settings?tab=billing'}>
              View Billing
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

