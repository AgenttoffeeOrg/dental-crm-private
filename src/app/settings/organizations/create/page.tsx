'use client'

/**
 * Create Organization Page
 * 
 * Features:
 * - Create new organization
 * - Automatic owner assignment
 * - Form validation
 * - Success redirect
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import {
  Building2,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

export default function CreateOrganizationPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    if (!appUser) {
      toast.error('You must be logged in to create an organization')
      return
    }

    try {
      setCreating(true)
      const supabase = createClient()

      // Step 1: Create the tenant (organization)
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name.trim(),
          timezone: formData.timezone,
          // Add other fields as needed
        })
        .select()
        .single()

      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        throw new Error('Failed to create organization: ' + tenantError.message)
      }

      // Step 2: Create app_user entry for the creator as owner
      const { error: appUserError } = await supabase
        .from('app_users')
        .insert({
          id: appUser.id, // User's auth ID
          tenant_id: tenant.id,
          full_name: appUser.full_name,
          role: 'owner',
        })

      if (appUserError) {
        // If app_user already exists for this tenant, update it
        if (appUserError.code === '23505') { // Unique constraint violation
          const { error: updateError } = await supabase
            .from('app_users')
            .update({
              tenant_id: tenant.id,
              full_name: appUser.full_name,
              role: 'owner',
            })
            .eq('id', appUser.id)

          if (updateError) {
            console.error('Error updating app_user:', updateError)
            throw new Error('Failed to set up organization membership')
          }
        } else {
          console.error('Error creating app_user:', appUserError)
          // Clean up: delete the tenant we just created
          await supabase.from('tenants').delete().eq('id', tenant.id)
          throw new Error('Failed to set up organization membership')
        }
      }

      // Step 3: Create default pipeline for the new organization
      const { error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          tenant_id: tenant.id,
          name: 'Default',
          owner_user_id: appUser.id,
        })

      if (pipelineError) {
        console.warn('Failed to create default pipeline:', pipelineError)
        // Don't fail the entire process if pipeline creation fails
      }

      toast.success('Organization created successfully!')
      
      // Redirect to the new organization
      router.push(`/settings/organizations?success=created&org=${tenant.id}`)
      
      // Reload after a short delay to pick up new org
      setTimeout(() => {
        globalThis.location.href = '/settings/organizations'
      }, 1000)

    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.message || 'Failed to create organization')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/settings/organizations')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Organizations
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Organization</h1>
            <p className="text-gray-600 mt-1">
              Set up a new organization to manage separately
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Basic information about your new organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Dental Practice"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-red-500' : ''}
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
              <p className="text-sm text-gray-500">
                This will be displayed to all members of the organization
              </p>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-gray-400">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="A brief description of your organization..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={errors.description ? 'border-red-500' : ''}
                rows={4}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.description}
                </p>
              )}
              <p className="text-sm text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">
                Timezone <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                This will be used for scheduling and time-based features
              </p>
            </div>

            {/* Info Alert */}
            <Alert>
              <Check className="w-4 h-4" />
              <AlertDescription>
                <strong>You will be the owner</strong> of this organization with full administrative
                privileges. You can invite team members after creation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/settings/organizations')}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={creating}
            className="gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                Create Organization
              </>
            )}
          </Button>
        </div>
      </form>

      {/* What Happens Next */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Organization Created</p>
                <p className="text-sm text-gray-600">
                  Your new organization will be created with you as the owner
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Default Setup</p>
                <p className="text-sm text-gray-600">
                  A default pipeline and initial settings will be configured
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Ready to Use</p>
                <p className="text-sm text-gray-600">
                  You can start inviting team members and customizing settings
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

