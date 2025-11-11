'use client'

import React, { useEffect, useState } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Phone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-client'

/**
 * FirstLocationStep
 * 
 * Step 4: Location Setup (simplified)
 * Fields:
 * - Location Name (optional)
 * - Address Line 1 (optional)
 * - City (optional)
 * - Postal Code (optional)
 * - Phone Number (optional)
 */

export function FirstLocationStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}
  const [hasTenant, setHasTenant] = useState(false)
  const [loading, setLoading] = useState(true)
  const [additionalLocations, setAdditionalLocations] = useState<Array<Record<string, any>>>(
    stepData.additional_locations || []
  )

  useEffect(() => {
    setAdditionalLocations(stepData.additional_locations || [])
  }, [stepData.additional_locations])

  // Load existing location data
  // ✅ FIX: Wait for currentStepId to be set, and re-run when step changes
  useEffect(() => {
    // Only run if currentStepId is available (step is loaded)
    if (currentStepId === 'location_setup') {
      loadExistingData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]) // We intentionally don't include formData or loadExistingData to avoid infinite loops

  const loadExistingData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id, active_tenant_id, active_location_id')
        .eq('id', user.id)
        .single()

      if (!appUser) return

      const tenantId = appUser.active_tenant_id || appUser.tenant_id
      setHasTenant(!!tenantId)

      if (tenantId) {
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name, address, city, postal_code, phone, is_primary')
          .eq('tenant_id', tenantId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })

        if (locations && locations.length > 0) {
          const existingStepData = formData['location_setup'] || {}

          const primaryLocation =
            locations.find(loc => loc.id === appUser.active_location_id) ||
            locations[0]

          if (primaryLocation) {
            if (primaryLocation.name && (!existingStepData.name || existingStepData.name === '')) {
              updateFieldValue('name', primaryLocation.name)
            }
            if (primaryLocation.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
              updateFieldValue('address_line1', primaryLocation.address)
            }
            if (primaryLocation.city && (!existingStepData.city || existingStepData.city === '')) {
              updateFieldValue('city', primaryLocation.city)
            }
            if (primaryLocation.postal_code && (!existingStepData.postal_code || existingStepData.postal_code === '')) {
              updateFieldValue('postal_code', primaryLocation.postal_code)
            }
            if (primaryLocation.phone && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
              updateFieldValue('phone_number', primaryLocation.phone)
            }
          }

          const others = locations.filter(loc => primaryLocation && loc.id !== primaryLocation.id)
          if (!existingStepData.additional_locations || existingStepData.additional_locations.length === 0) {
            const mapped = others.map(loc => ({
              id: loc.id,
              name: loc.name || '',
              address_line1: loc.address || '',
              city: loc.city || '',
              postal_code: loc.postal_code || '',
              phone_number: loc.phone || ''
            }))
            if (mapped.length > 0) {
              setAdditionalLocations(mapped)
              updateFieldValue('additional_locations', mapped)
            }
          }
          return
        }

        // ✅ FALLBACK: If no locations found, keep existing behaviour
        if (appUser.active_location_id) {
          const { data: location } = await supabase
            .from('locations')
            .select('name, address, city, postal_code, phone')
            .eq('id', appUser.active_location_id)
            .eq('tenant_id', tenantId)
            .single()

          if (location) {
            // ✅ FIX: Always pre-fill from DB data (DB is source of truth)
            // Map database columns (address, phone) to form field names (address_line1, phone_number)
            // Only skip if formData already has a non-empty value (user edited it)
            const existingStepData = formData['location_setup'] || {}
            
            // Force pre-fill from DB (DB data takes precedence over saved empty values)
            if (location.name && (!existingStepData.name || existingStepData.name === '')) {
              updateFieldValue('name', location.name)
            }
            // Map 'address' (DB) to 'address_line1' (form field)
            if (location.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
              updateFieldValue('address_line1', location.address)
            }
            if (location.city && (!existingStepData.city || existingStepData.city === '')) {
              updateFieldValue('city', location.city)
            }
            if (location.postal_code && (!existingStepData.postal_code || existingStepData.postal_code === '')) {
              updateFieldValue('postal_code', location.postal_code)
            }
            // Map 'phone' (DB) to 'phone_number' (form field)
            if (location.phone && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
              updateFieldValue('phone_number', location.phone)
            }
            return // Found location, exit early
          }
        }

        const { data: fallbackLocations } = await supabase
          .from('locations')
          .select('name, address, city, postal_code, phone')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true })
          .limit(1)

        if (fallbackLocations && fallbackLocations.length > 0) {
          const location = fallbackLocations[0]
          // ✅ FIX: Always pre-fill from DB data (DB is source of truth)
          // Map database columns (address, phone) to form field names (address_line1, phone_number)
          // Only skip if formData already has a non-empty value (user edited it)
          const existingStepData = formData['location_setup'] || {}
          
          // Force pre-fill from DB (DB data takes precedence over saved empty values)
          if (location.name && (!existingStepData.name || existingStepData.name === '')) {
            updateFieldValue('name', location.name)
          }
          // Map 'address' (DB) to 'address_line1' (form field)
          if (location.address && (!existingStepData.address_line1 || existingStepData.address_line1 === '')) {
            updateFieldValue('address_line1', location.address)
          }
          if (location.city && (!existingStepData.city || existingStepData.city === '')) {
            updateFieldValue('city', location.city)
          }
          if (location.postal_code && (!existingStepData.postal_code || existingStepData.postal_code === '')) {
            updateFieldValue('postal_code', location.postal_code)
          }
          // Map 'phone' (DB) to 'phone_number' (form field)
          if (location.phone && (!existingStepData.phone_number || existingStepData.phone_number === '')) {
            updateFieldValue('phone_number', location.phone)
          }
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Show message if user doesn't have an organization yet
  if (!hasTenant) {
    return (
      <div className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <MapPin className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="font-medium mb-1 text-sm">No Organization Found</div>
            <div className="text-sm">
              You need to create an organization before setting up a location. You can skip this step and create 
              an organization later from the Settings page.
            </div>
          </AlertDescription>
        </Alert>
        <div className="text-center py-6">
          <p className="text-sm text-gray-600 mb-3">
            Location setup is optional and requires an organization. You can complete your profile and set up locations later.
          </p>
        </div>
      </div>
    )
  }

  // Check if we have pre-filled data (indicates existing location detected)
  const hasExistingData = !!(stepData.name || stepData.address_line1 || stepData.city)

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      {hasExistingData ? (
        <Alert className="border-green-200 bg-green-50">
          <MapPin className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium mb-1 text-sm">Existing Location Detected</div>
            <div className="text-sm">
              We found a location for your organization. You can review and update the details below, or skip this step to keep it as is.
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-blue-200 bg-blue-50">
          <MapPin className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="text-sm">
              Set up your primary practice location. You can add more locations later from your settings.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Location Name */}
      <WizardFieldWrapper
        fieldName="name"
        label="Location Name"
        isRequired={false}
        helpText="Internal name for this location (e.g., 'Main Clinic', 'Downtown Branch')"
      >
        <Input
          id="name"
          value={stepData.name || ''}
          onChange={(e) => updateFieldValue('name', e.target.value)}
          placeholder="e.g., Main Clinic"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Address Line 1 */}
      <WizardFieldWrapper
        fieldName="address_line1"
        label="Street Address"
        isRequired={false}
        helpText="Street address, P.O. box"
      >
        <Input
          id="address_line1"
          value={stepData.address_line1 || ''}
          onChange={(e) => updateFieldValue('address_line1', e.target.value)}
          placeholder="e.g., 123 High Street"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* City & Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardFieldWrapper
          fieldName="city"
          label="City"
          isRequired={false}
          helpText="City name"
        >
          <Input
            id="city"
            value={stepData.city || ''}
            onChange={(e) => updateFieldValue('city', e.target.value)}
            placeholder="e.g., London"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="postal_code"
          label="Postal Code"
          isRequired={false}
          helpText="Postal/ZIP code"
        >
          <Input
            id="postal_code"
            value={stepData.postal_code || ''}
            onChange={(e) => updateFieldValue('postal_code', e.target.value)}
            placeholder="e.g., SW1A 1AA"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Phone Number */}
      <WizardFieldWrapper
        fieldName="phone_number"
        label="Phone Number"
        isRequired={false}
        helpText="Location's direct phone number"
      >
        <Input
          id="phone_number"
          type="tel"
          value={stepData.phone_number || ''}
          onChange={(e) => updateFieldValue('phone_number', e.target.value)}
          placeholder="+44 20 7946 0958"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Preview Card */}
      {(stepData.name || stepData.address_line1 || stepData.city) && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mt-4">
          <h4 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            Location Preview
          </h4>
          
          <div className="bg-white rounded-lg p-3 space-y-2">
            {stepData.name && (
              <div>
                <h5 className="font-semibold text-gray-900 text-base">{stepData.name}</h5>
              </div>
            )}
            
            {(stepData.address_line1 || stepData.city || stepData.postal_code) && (
              <div className="text-sm text-gray-600">
                {stepData.address_line1 && <div>{stepData.address_line1}</div>}
                {stepData.city && (
                  <div>
                    {stepData.city}
                    {stepData.postal_code && ` ${stepData.postal_code}`}
                  </div>
                )}
              </div>
            )}

            {stepData.phone_number && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {stepData.phone_number}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Locations */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Additional Locations</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newLocations = [...additionalLocations, { name: '', address_line1: '', city: '', postal_code: '', phone_number: '' }]
              setAdditionalLocations(newLocations)
              updateFieldValue('additional_locations', newLocations)
            }}
          >
            Add Another Location
          </Button>
        </div>

        {additionalLocations.length === 0 && (
          <p className="text-sm text-gray-600">You can add more practice locations using the button above.</p>
        )}

        {additionalLocations.map((loc, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <h5 className="text-xs font-semibold text-gray-500 uppercase">Location {index + 2}</h5>
            <WizardFieldWrapper
              fieldName={`additional_locations.${index}.name`}
              label="Location Name"
              isRequired={false}
              helpText="Internal name for this location"
            >
              <Input
                value={loc.name || ''}
                onChange={(e) => {
                  const newLocations = [...additionalLocations]
                  newLocations[index] = { ...newLocations[index], name: e.target.value }
                  setAdditionalLocations(newLocations)
                  updateFieldValue('additional_locations', newLocations)
                }}
                placeholder="e.g., Downtown Branch"
              />
            </WizardFieldWrapper>

            <WizardFieldWrapper
              fieldName={`additional_locations.${index}.address_line1`}
              label="Street Address"
              isRequired={false}
              helpText="Street address"
            >
              <Input
                value={loc.address_line1 || ''}
                onChange={(e) => {
                  const newLocations = [...additionalLocations]
                  newLocations[index] = { ...newLocations[index], address_line1: e.target.value }
                  setAdditionalLocations(newLocations)
                  updateFieldValue('additional_locations', newLocations)
                }}
                placeholder="e.g., 45 River Road"
              />
            </WizardFieldWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <WizardFieldWrapper
                fieldName={`additional_locations.${index}.city`}
                label="City"
                isRequired={false}
                helpText="City name"
              >
                <Input
                  value={loc.city || ''}
                  onChange={(e) => {
                    const newLocations = [...additionalLocations]
                    newLocations[index] = { ...newLocations[index], city: e.target.value }
                    setAdditionalLocations(newLocations)
                    updateFieldValue('additional_locations', newLocations)
                  }}
                  placeholder="e.g., Winterfell"
                />
              </WizardFieldWrapper>

              <WizardFieldWrapper
                fieldName={`additional_locations.${index}.postal_code`}
                label="Postal Code"
                isRequired={false}
                helpText="Postal/ZIP code"
              >
                <Input
                  value={loc.postal_code || ''}
                  onChange={(e) => {
                    const newLocations = [...additionalLocations]
                    newLocations[index] = { ...newLocations[index], postal_code: e.target.value }
                    setAdditionalLocations(newLocations)
                    updateFieldValue('additional_locations', newLocations)
                  }}
                  placeholder="e.g., WF1 1AA"
                />
              </WizardFieldWrapper>
            </div>

            <WizardFieldWrapper
              fieldName={`additional_locations.${index}.phone_number`}
              label="Phone Number"
              isRequired={false}
              helpText="Location phone number"
            >
              <Input
                value={loc.phone_number || ''}
                onChange={(e) => {
                  const newLocations = [...additionalLocations]
                  newLocations[index] = { ...newLocations[index], phone_number: e.target.value }
                  setAdditionalLocations(newLocations)
                  updateFieldValue('additional_locations', newLocations)
                }}
                placeholder="e.g., +44 20 7000 0000"
              />
            </WizardFieldWrapper>
          </div>
        ))}
      </div>
    </div>
  )
}

