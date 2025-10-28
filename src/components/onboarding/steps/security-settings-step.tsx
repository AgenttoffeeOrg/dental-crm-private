'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock, Info } from 'lucide-react'

/**
 * SecuritySettingsStep
 * 
 * Step 5: Security Settings
 * Fields:
 * - Two-Factor Authentication (optional)
 */

export function SecuritySettingsStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  const twoFactorEnabled = stepData.two_factor_enabled || false

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="text-sm">
            Enhance your account security with additional protection options.
            These settings help keep your data safe and secure.
          </div>
        </AlertDescription>
      </Alert>

      {/* Two-Factor Authentication */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-green-600" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="two_factor" className="text-base font-semibold text-gray-900">
                Two-Factor Authentication (2FA)
              </Label>
              <Switch
                id="two_factor"
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => updateFieldValue('two_factor_enabled', checked)}
              />
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Add an extra layer of security by requiring a verification code in addition 
              to your password when signing in.
            </p>

            {twoFactorEnabled && (
              <Alert className="border-green-200 bg-green-50 mt-3">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="text-xs">
                    <strong>Note:</strong> You'll be prompted to set up 2FA after completing 
                    this wizard. You'll need an authenticator app like Google Authenticator 
                    or Authy on your mobile device.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* 2FA Benefits */}
        {!twoFactorEnabled && (
          <div className="pl-16">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Why enable 2FA?</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Protects against unauthorized access even if your password is compromised</li>
              <li>Secures sensitive patient and practice data</li>
              <li>Meets compliance requirements for healthcare data protection</li>
              <li>Quick and easy setup with your smartphone</li>
            </ul>
          </div>
        )}
      </div>

      {/* Password Security Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-600" />
          Password Security Tips
        </h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Use a unique password for this account (don't reuse passwords)</li>
          <li>Make it at least 12 characters long with mixed case, numbers, and symbols</li>
          <li>Consider using a password manager to generate and store secure passwords</li>
          <li>Never share your password with anyone</li>
          <li>Change your password regularly (every 90 days recommended)</li>
        </ul>
      </div>

      {/* Additional Security Info */}
      <div className="text-sm text-gray-500 border-l-4 border-blue-500 pl-4 py-2">
        <p>
          <strong>Your privacy matters:</strong> All your data is encrypted both in transit 
          and at rest. We follow industry-leading security practices to protect your information.
        </p>
      </div>
    </div>
  )
}

