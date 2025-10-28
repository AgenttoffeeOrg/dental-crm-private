'use client'

import { useState } from 'react'
import { Building2, MapPin, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CreateOrgModalProps, CreateOrgFormData, FormError } from '@/types/invites'

/**
 * CreateOrgModal Component
 * 
 * Beautiful form modal for creating a new organization.
 * 
 * Features:
 * - Organization name (required)
 * - Location name (optional, defaults to "Main Office")
 * - Real-time validation
 * - Loading states
 * - Error handling
 * - Success feedback
 * - Keyboard accessible
 * - Modern, clean UI
 * 
 * Usage:
 * ```tsx
 * <CreateOrgModal
 *   isOpen={showCreate}
 *   onClose={() => setShowCreate(false)}
 *   onSuccess={(org) => {
 *     console.log('Created:', org)
 *     // Redirect or update UI
 *   }}
 * />
 * ```
 */
export function CreateOrgModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: CreateOrgModalProps) {
  const [formData, setFormData] = useState<CreateOrgFormData>({
    name: '',
    location_name: ''
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // =====================================================================================================
  // VALIDATION
  // =====================================================================================================
  const validateForm = (): boolean => {
    const newErrors: FormError[] = []

    // Validate organization name
    if (!formData.name.trim()) {
      newErrors.push({
        field: 'name',
        message: 'Organization name is required'
      })
    } else if (formData.name.trim().length < 2) {
      newErrors.push({
        field: 'name',
        message: 'Organization name must be at least 2 characters'
      })
    } else if (formData.name.trim().length > 100) {
      newErrors.push({
        field: 'name',
        message: 'Organization name must be less than 100 characters'
      })
    } else if (/[<>{}[\]\\\/]/.test(formData.name)) {
      newErrors.push({
        field: 'name',
        message: 'Organization name contains invalid characters'
      })
    }

    // Validate location name (if provided)
    if (formData.location_name && formData.location_name.trim()) {
      if (formData.location_name.trim().length < 2) {
        newErrors.push({
          field: 'location_name',
          message: 'Location name must be at least 2 characters'
        })
      } else if (formData.location_name.trim().length > 100) {
        newErrors.push({
          field: 'location_name',
          message: 'Location name must be less than 100 characters'
        })
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // =====================================================================================================
  // SUBMIT HANDLER
  // =====================================================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)

      const response = await fetch('/api/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          location_name: formData.location_name?.trim() || 'Main Office'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create organization')
      }

      const data = await response.json()
      
      // Success!
      onSuccess(data)
      
      // Reset form
      setFormData({ name: '', location_name: '' })
      setErrors([])
      
      // Close modal (parent will likely redirect)
      setTimeout(() => onClose(), 500)
      
    } catch (err: any) {
      console.error('[CREATE_ORG] Error:', err)
      const errorMessage = err.message || 'Failed to create organization'
      setSubmitError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // =====================================================================================================
  // HELPER: GET FIELD ERROR
  // =====================================================================================================
  const getFieldError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message
  }

  // =====================================================================================================
  // RENDER
  // =====================================================================================================
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="h-6 w-6 text-blue-600" />
              Create Your Organization
            </DialogTitle>
            <DialogDescription className="text-base">
              Set up your practice in seconds. You'll be the owner and can customize everything later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6">
            {/* Submit Error */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="org-name" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Organization Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="org-name"
                placeholder="e.g., Smith Dental Practice"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setErrors([]) // Clear errors on change
                }}
                disabled={submitting}
                className={getFieldError('name') ? 'border-red-500' : ''}
                autoFocus
              />
              {getFieldError('name') && (
                <p className="text-sm text-red-500">{getFieldError('name')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will be visible to your team and clients.
              </p>
            </div>

            {/* Location Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="location-name" className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Primary Location Name
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="location-name"
                placeholder="Main Office"
                value={formData.location_name}
                onChange={(e) => {
                  setFormData({ ...formData, location_name: e.target.value })
                  setErrors([])
                }}
                disabled={submitting}
                className={getFieldError('location_name') ? 'border-red-500' : ''}
              />
              {getFieldError('location_name') && (
                <p className="text-sm text-red-500">{getFieldError('location_name')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Defaults to "Main Office" if left blank. You can add more locations later.
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">What you'll get:</p>
                  <ul className="space-y-0.5 text-xs">
                    <li>• Owner access with full control</li>
                    <li>• Ability to invite team members</li>
                    <li>• Manage locations and settings</li>
                    <li>• All CRM features enabled</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Create Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

