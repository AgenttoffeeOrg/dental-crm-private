'use client'

import { useState, useRef } from 'react'
import { Key, Loader2, AlertCircle, CheckCircle, Building2 } from 'lucide-react'
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
import type { JoinWithCodeModalProps, JoinCodeFormData, FormError } from '@/types/invites'

/**
 * JoinWithCodeModal Component
 * 
 * Beautiful modal for entering a 6-character invite code to join an organization.
 * 
 * Features:
 * - Auto-formatted 6-character input (uppercase alphanumeric)
 * - Real-time validation
 * - Loading states
 * - Error handling
 * - Success feedback
 * - Auto-submit on complete code
 * - Paste support
 * - Keyboard accessible
 * - Modern, clean UI
 * 
 * Usage:
 * ```tsx
 * <JoinWithCodeModal
 *   isOpen={showJoin}
 *   onClose={() => setShowJoin(false)}
 *   onSuccess={(membership) => {
 *     console.log('Joined:', membership)
 *     // Redirect or update UI
 *   }}
 * />
 * ```
 */
export function JoinWithCodeModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: JoinWithCodeModalProps) {
  const [formData, setFormData] = useState<JoinCodeFormData>({
    invite_code: ''
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // =====================================================================================================
  // VALIDATION
  // =====================================================================================================
  const validateForm = (): boolean => {
    const newErrors: FormError[] = []

    const code = formData.invite_code.toUpperCase().trim()

    if (!code) {
      newErrors.push({
        field: 'invite_code',
        message: 'Invite code is required'
      })
    } else if (code.length !== 6) {
      newErrors.push({
        field: 'invite_code',
        message: 'Invite code must be exactly 6 characters'
      })
    } else if (!/^[A-Z0-9]+$/.test(code)) {
      newErrors.push({
        field: 'invite_code',
        message: 'Invite code must contain only letters and numbers'
      })
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // =====================================================================================================
  // INPUT HANDLER (Auto-format to uppercase, max 6 chars)
  // =====================================================================================================
  const handleCodeChange = (value: string) => {
    // Remove non-alphanumeric, convert to uppercase, limit to 6 chars
    const formatted = value
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
    
    setFormData({ invite_code: formatted })
    setErrors([]) // Clear errors on change
    setSubmitError(null)

    // Auto-submit when 6 characters entered
    if (formatted.length === 6) {
      setTimeout(() => {
        handleSubmit(new Event('submit') as any, formatted)
      }, 300)
    }
  }

  // =====================================================================================================
  // SUBMIT HANDLER
  // =====================================================================================================
  const handleSubmit = async (e: React.FormEvent, codeOverride?: string) => {
    e.preventDefault()

    const codeToSubmit = codeOverride || formData.invite_code

    // Update form data if using override
    if (codeOverride) {
      setFormData({ invite_code: codeOverride })
    }

    // Validate with current or override code
    const tempErrors: FormError[] = []
    const code = codeToSubmit.toUpperCase().trim()

    if (!code || code.length !== 6 || !/^[A-Z0-9]+$/.test(code)) {
      if (!validateForm()) return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)

      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to join organization')
      }

      const data = await response.json()
      
      // Success!
      onSuccess(data)
      
      // Reset form
      setFormData({ invite_code: '' })
      setErrors([])
      
      // Close modal (parent will likely redirect)
      setTimeout(() => onClose(), 500)
      
    } catch (err: any) {
      console.error('[JOIN_CODE] Error:', err)
      const errorMessage = err.message || 'Failed to join organization'
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
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Key className="h-6 w-6 text-green-600" />
              Join with Invite Code
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the 6-character code you received to join an organization.
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

            {/* Invite Code Input */}
            <div className="space-y-2">
              <Label htmlFor="invite-code" className="flex items-center gap-1.5">
                <Key className="h-4 w-4" />
                Invite Code
                <span className="text-red-500">*</span>
              </Label>
              <Input
                ref={inputRef}
                id="invite-code"
                placeholder="A3X7K9"
                value={formData.invite_code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={submitting}
                className={`text-center text-2xl font-mono tracking-widest ${
                  getFieldError('invite_code') ? 'border-red-500' : ''
                }`}
                maxLength={6}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {getFieldError('invite_code') && (
                <p className="text-sm text-red-500">{getFieldError('invite_code')}</p>
              )}
              <p className="text-xs text-center text-muted-foreground">
                {formData.invite_code.length}/6 characters
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  <p className="font-medium">How to get a code:</p>
                  <ul className="space-y-0.5 text-xs">
                    <li>• Ask your practice administrator for an invite</li>
                    <li>• Check your email for an invitation</li>
                    <li>• Codes are 6 characters (letters and numbers)</li>
                    <li>• Codes expire after 7 days</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Example */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-muted-foreground">
                <strong className="font-medium">Example code:</strong> A3X7K9
              </p>
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
              disabled={submitting || formData.invite_code.length !== 6}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Join Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

