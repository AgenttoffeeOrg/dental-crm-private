'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Info } from 'lucide-react'

export interface GDPRSettings {
  enabled: boolean
  consentRequired: boolean
  privacyPolicyUrl: string
  dataRetentionDays: number
  doubleOptIn: boolean
  dataProcessingNote: string
  allowDataExport: boolean
  allowDataDeletion: boolean
}

interface GDPRSettingsEditorProps {
  settings: GDPRSettings
  onChange: (settings: GDPRSettings) => void
}

const RETENTION_PERIODS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days (3 months)' },
  { value: 180, label: '180 days (6 months)' },
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years (recommended)' },
  { value: 1095, label: '3 years' },
  { value: 1825, label: '5 years' },
  { value: -1, label: 'Indefinite (not recommended)' },
]

export function GDPRSettingsEditor({ settings, onChange }: GDPRSettingsEditorProps) {
  const updateSetting = <K extends keyof GDPRSettings>(
    key: K,
    value: GDPRSettings[K]
  ) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-blue-600" />
          GDPR & Privacy Settings
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ensure compliance with GDPR and data protection regulations
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable GDPR Compliance */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable GDPR Compliance</Label>
            <p className="text-sm text-gray-500">
              Activate privacy controls and consent management
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSetting('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Consent Required */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Explicit Consent</Label>
                <p className="text-sm text-gray-500">
                  Users must check a consent box to submit
                </p>
              </div>
              <Switch
                checked={settings.consentRequired}
                onCheckedChange={(checked) => updateSetting('consentRequired', checked)}
              />
            </div>

            {/* Privacy Policy URL */}
            <div className="space-y-2">
              <Label htmlFor="privacy_url">Privacy Policy URL</Label>
              <Input
                id="privacy_url"
                type="url"
                value={settings.privacyPolicyUrl}
                onChange={(e) => updateSetting('privacyPolicyUrl', e.target.value)}
                placeholder="https://yoursite.com/privacy"
              />
              <p className="text-xs text-gray-500">
                Link to your privacy policy (required for GDPR)
              </p>
            </div>

            {/* Data Retention Period */}
            <div className="space-y-2">
              <Label htmlFor="retention">Data Retention Period</Label>
              <Select
                value={settings.dataRetentionDays.toString()}
                onValueChange={(value) => updateSetting('dataRetentionDays', parseInt(value))}
              >
                <SelectTrigger id="retention">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value.toString()}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                How long to keep form submission data
              </p>
            </div>

            {/* Double Opt-In */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Double Opt-In</Label>
                <p className="text-sm text-gray-500">
                  Send confirmation email to verify consent
                </p>
              </div>
              <Switch
                checked={settings.doubleOptIn}
                onCheckedChange={(checked) => updateSetting('doubleOptIn', checked)}
              />
            </div>

            {/* Allow Data Export */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Data Export</Label>
                <p className="text-sm text-gray-500">
                  Users can request a copy of their data
                </p>
              </div>
              <Switch
                checked={settings.allowDataExport}
                onCheckedChange={(checked) => updateSetting('allowDataExport', checked)}
              />
            </div>

            {/* Allow Data Deletion */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Data Deletion</Label>
                <p className="text-sm text-gray-500">
                  Users can request deletion of their data (Right to be Forgotten)
                </p>
              </div>
              <Switch
                checked={settings.allowDataDeletion}
                onCheckedChange={(checked) => updateSetting('allowDataDeletion', checked)}
              />
            </div>

            {/* Data Processing Note */}
            <div className="space-y-2">
              <Label htmlFor="processing_note">Data Processing Notice</Label>
              <textarea
                id="processing_note"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                value={settings.dataProcessingNote}
                onChange={(e) => updateSetting('dataProcessingNote', e.target.value)}
                placeholder="We process your data to respond to your inquiry. Your data will be stored securely and never shared with third parties without your consent."
              />
              <p className="text-xs text-gray-500">
                Explain how you will process user data
              </p>
            </div>

            {/* Compliance Checklist */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    GDPR Compliance Checklist
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li className={settings.consentRequired ? 'text-green-700' : ''}>
                      {settings.consentRequired ? '✓' : '○'} Explicit consent mechanism
                    </li>
                    <li className={settings.privacyPolicyUrl ? 'text-green-700' : ''}>
                      {settings.privacyPolicyUrl ? '✓' : '○'} Privacy policy link
                    </li>
                    <li className={settings.dataRetentionDays > 0 ? 'text-green-700' : ''}>
                      {settings.dataRetentionDays > 0 ? '✓' : '○'} Data retention policy
                    </li>
                    <li className={settings.allowDataExport ? 'text-green-700' : ''}>
                      {settings.allowDataExport ? '✓' : '○'} Right to access (data export)
                    </li>
                    <li className={settings.allowDataDeletion ? 'text-green-700' : ''}>
                      {settings.allowDataDeletion ? '✓' : '○'} Right to be forgotten (deletion)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

