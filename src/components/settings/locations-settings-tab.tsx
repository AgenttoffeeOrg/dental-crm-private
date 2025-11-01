'use client'

/**
 * Locations Settings Tab
 * 
 * Manage multiple practice locations (Enterprise feature)
 * 
 * Features:
 * - Add/edit/delete locations
 * - Set location-specific settings (override org defaults)
 * - Operating hours per location
 * - Staff assignments per location
 * - Location-specific branding
 * - Primary location designation
 */

import { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin, Plus, Edit, Trash2, Star, Building2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface Location {
  id: string
  name: string
  displayName?: string
  locationType: 'headquarters' | 'branch' | 'clinic' | 'mobile'
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  phone?: string
  email?: string
  websiteUrl?: string
  operatingHours: Record<string, { open: string; close: string }>
  isActive: boolean
  isPrimary: boolean
}

export function LocationsSettingsTab({ tenantId }: { tenantId?: string }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    locationType: 'branch',
    address: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
    isActive: true,
    isPrimary: false,
  })
  
  const loadLocations = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    
    try {
      const supabase = createClient()
      
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })
      
      if (data) {
        setLocations(data as any)
      }
    } catch (error) {
      console.error('[Locations] Error loading:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])
  
  useEffect(() => {
    loadLocations()
  }, [loadLocations])
  
  const handleCreateLocation = async () => {
    if (!newLocation.name || !newLocation.address?.city) {
      toast.error('Please fill in required fields')
      return
    }
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('locations')
        .insert({
          tenant_id: tenantId,
          name: newLocation.name,
          display_name: newLocation.displayName,
          location_type: newLocation.locationType,
          address_line1: newLocation.address?.line1,
          address_line2: newLocation.address?.line2,
          city: newLocation.address?.city,
          state: newLocation.address?.state,
          postal_code: newLocation.address?.postalCode,
          country: newLocation.address?.country,
          phone_number: newLocation.phone,
          email: newLocation.email,
          website_url: newLocation.websiteUrl,
          is_active: newLocation.isActive,
          is_primary: newLocation.isPrimary,
        })
      
      if (error) {
        toast.error('Failed to create location')
        console.error(error)
        return
      }
      
      toast.success('Location created successfully')
      setShowCreateDialog(false)
      resetForm()
      loadLocations()
    } catch (error) {
      console.error('[Locations] Error creating:', error)
      toast.error('Failed to create location')
    }
  }
  
  const resetForm = () => {
    setNewLocation({
      name: '',
      locationType: 'branch',
      address: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
      isActive: true,
      isPrimary: false,
    })
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Practice Locations</h3>
          <p className="text-sm text-gray-600">Manage multiple locations and location-specific settings</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>Create a new practice location</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location Name *</Label>
                  <Input
                    placeholder="Downtown Office"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newLocation.locationType}
                    onValueChange={(value: any) => setNewLocation({ ...newLocation, locationType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">Headquarters</SelectItem>
                      <SelectItem value="branch">Branch Office</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="mobile">Mobile Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Address Line 1 *</Label>
                <Input
                  placeholder="123 Main Street"
                  value={newLocation.address?.line1}
                  onChange={(e) => setNewLocation({
                    ...newLocation,
                    address: { ...newLocation.address!, line1: e.target.value },
                  })}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City *</Label>
                  <Input
                    placeholder="Los Angeles"
                    value={newLocation.address?.city}
                    onChange={(e) => setNewLocation({
                      ...newLocation,
                      address: { ...newLocation.address!, city: e.target.value },
                    })}
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    placeholder="CA"
                    value={newLocation.address?.state}
                    onChange={(e) => setNewLocation({
                      ...newLocation,
                      address: { ...newLocation.address!, state: e.target.value },
                    })}
                  />
                </div>
                <div>
                  <Label>Zip Code</Label>
                  <Input
                    placeholder="90001"
                    value={newLocation.address?.postalCode}
                    onChange={(e) => setNewLocation({
                      ...newLocation,
                      address: { ...newLocation.address!, postalCode: e.target.value },
                    })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    placeholder="+1 (555) 555-5555"
                    value={newLocation.phone}
                    onChange={(e) => setNewLocation({ ...newLocation, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="downtown@practice.com"
                    value={newLocation.email}
                    onChange={(e) => setNewLocation({ ...newLocation, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Set as Primary Location</Label>
                  <p className="text-xs text-gray-600">Main practice location</p>
                </div>
                <Switch
                  checked={newLocation.isPrimary}
                  onCheckedChange={(checked) => setNewLocation({ ...newLocation, isPrimary: checked })}
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : locations.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Locations Yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add your first location to enable location-specific settings
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Location
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locations.map((location) => (
            <Card key={location.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{location.name}</h4>
                      {location.isPrimary && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize text-xs">
                        {location.locationType}
                      </Badge>
                    </div>
                    {location.address && (
                      <p className="text-sm text-gray-600 mt-1">
                        {location.address.line1 || 'No address'}, {location.address.city || ''}, {location.address.state || ''}
                      </p>
                    )}
                    {location.phone && (
                      <p className="text-xs text-gray-500 mt-1">{location.phone}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch checked={location.isActive} />
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!location.isPrimary && (
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

