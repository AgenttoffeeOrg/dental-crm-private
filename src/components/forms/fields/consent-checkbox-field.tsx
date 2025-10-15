'use client'

import { Label } from '@/components/ui/label'
import { ExternalLink, Shield } from 'lucide-react'

interface ConsentCheckboxFieldProps {
  id: string
  label: string
  required?: boolean
  value?: boolean
  onChange: (checked: boolean) => void
  privacyPolicyUrl?: string
  termsUrl?: string
  description?: string
}

export function ConsentCheckboxField({
  id,
  label,
  required = true,
  value = false,
  onChange,
  privacyPolicyUrl,
  termsUrl,
  description,
}: ConsentCheckboxFieldProps) {
  return (
    <div className="space-y-3 border border-gray-300 rounded-lg p-4 bg-gray-50">
      {/* GDPR Shield Icon */}
      <div className="flex items-center gap-2 text-blue-600">
        <Shield className="h-5 w-5" />
        <span className="text-sm font-semibold">Privacy & Consent</span>
      </div>

      {/* Consent Checkbox */}
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          required={required}
        />
        <div className="flex-1">
          <Label htmlFor={id} className="cursor-pointer font-normal text-sm leading-relaxed">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>

          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}

          {/* Links */}
          {(privacyPolicyUrl || termsUrl) && (
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              {privacyPolicyUrl && (
                <a
                  href={privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  Privacy Policy
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {termsUrl && (
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  Terms of Service
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GDPR Compliance Notice */}
      <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded p-2">
        <p className="font-medium mb-1">Your data is protected</p>
        <p>
          We collect and process your personal data in accordance with GDPR regulations. 
          You can request access, correction, or deletion of your data at any time.
        </p>
      </div>

      {/* Validation Error */}
      {required && !value && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          You must accept the privacy policy to continue
        </div>
      )}
    </div>
  )
}

