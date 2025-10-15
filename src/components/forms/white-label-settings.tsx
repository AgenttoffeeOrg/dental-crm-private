'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Palette, Upload, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export interface WhiteLabelSettings {
  enabled: boolean
  customDomain: string | null
  removeBranding: boolean
  customLogoUrl: string | null
  primaryColor: string
  fontFamily: string
  customCSS: string | null
}

interface WhiteLabelSettingsEditorProps {
  settings: WhiteLabelSettings
  onChange: (settings: WhiteLabelSettings) => void
}

const FONT_FAMILIES = [
  { value: 'inter', label: 'Inter (Modern Sans-Serif)' },
  { value: 'roboto', label: 'Roboto (Clean & Professional)' },
  { value: 'open-sans', label: 'Open Sans (Friendly)' },
  { value: 'lora', label: 'Lora (Elegant Serif)' },
  { value: 'poppins', label: 'Poppins (Geometric)' },
  { value: 'montserrat', label: 'Montserrat (Bold)' },
]

export function WhiteLabelSettingsEditor({
  settings,
  onChange,
}: WhiteLabelSettingsEditorProps) {
  const [logoUploading, setLogoUploading] = useState(false)

  const updateSetting = <K extends keyof WhiteLabelSettings>(
    key: K,
    value: WhiteLabelSettings[K]
  ) => {
    onChange({ ...settings, [key]: value })
  }

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true)
    try {
      // Upload logo to storage
      // TODO: Implement actual upload
      setTimeout(() => {
        updateSetting('customLogoUrl', URL.createObjectURL(file))
        setLogoUploading(false)
      }, 1000)
    } catch (error) {
      setLogoUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-purple-600" />
          White-Label & Branding
        </CardTitle>
        <p className="text-sm text-gray-600">
          Customize the look and feel of your forms to match your brand
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable White-Labeling */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable White-Labeling</Label>
            <p className="text-sm text-gray-500">
              Customize branding and appearance
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSetting('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Custom Logo */}
            <div className="space-y-2">
              <Label>Custom Logo</Label>
              <div className="flex items-center gap-4">
                {settings.customLogoUrl ? (
                  <div className="relative">
                    <img
                      src={settings.customLogoUrl}
                      alt="Custom logo"
                      className="h-16 w-auto border rounded"
                    />
                    <button
                      onClick={() => updateSetting('customLogoUrl', null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload logo</p>
                      <p className="text-xs text-gray-500">PNG or SVG, max 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Brand Color</Label>
              <div className="flex gap-3">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="w-20 h-12"
                />
                <Input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">
                This color will be used for buttons, links, and accents
              </p>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label htmlFor="font_family">Font Family</Label>
              <select
                id="font_family"
                value={settings.fontFamily}
                onChange={(e) => updateSetting('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Domain */}
            <div className="space-y-2">
              <Label htmlFor="custom_domain">Custom Domain (CNAME)</Label>
              <Input
                id="custom_domain"
                type="text"
                value={settings.customDomain || ''}
                onChange={(e) => updateSetting('customDomain', e.target.value || null)}
                placeholder="forms.yourpractice.com"
              />
              <p className="text-xs text-gray-500">
                Forms will be accessible at your custom domain
              </p>
              {settings.customDomain && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                  <p className="font-semibold mb-1">DNS Configuration Required:</p>
                  <p>Add a CNAME record pointing to: <code className="bg-white px-2 py-1 rounded">forms.dentalcrm.com</code></p>
                </div>
              )}
            </div>

            {/* Remove Branding */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Remove "Powered by DentalCRM"</Label>
                <p className="text-sm text-gray-500">
                  Hide branding footer from forms
                </p>
              </div>
              <Switch
                checked={settings.removeBranding}
                onCheckedChange={(checked) => updateSetting('removeBranding', checked)}
              />
            </div>

            {/* Custom CSS (Advanced) */}
            <div className="space-y-2">
              <Label htmlFor="custom_css">Custom CSS (Advanced)</Label>
              <textarea
                id="custom_css"
                value={settings.customCSS || ''}
                onChange={(e) => updateSetting('customCSS', e.target.value || null)}
                placeholder=".form-container { background: #f0f0f0; }"
                className="w-full p-3 border rounded-lg font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Add custom CSS to further customize form appearance
              </p>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <Label className="mb-3 block">Preview</Label>
              <div className="border rounded-lg p-6" style={{
                backgroundColor: '#ffffff',
                fontFamily: settings.fontFamily,
              }}>
                {settings.customLogoUrl && (
                  <img src={settings.customLogoUrl} alt="Logo" className="h-12 mb-4" />
                )}
                <h3 className="text-2xl font-bold mb-4" style={{ color: settings.primaryColor }}>
                  Sample Form Title
                </h3>
                <Button style={{ backgroundColor: settings.primaryColor }}>
                  Submit
                </Button>
                {!settings.removeBranding && (
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    Powered by DentalCRM
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

