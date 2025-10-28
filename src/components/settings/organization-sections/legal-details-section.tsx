'use client'

import { Building, FileText, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Tenant } from '@/types/database'

interface LegalDetailsSectionProps {
  data: Partial<Tenant>
  onChange: (field: keyof Tenant, value: any) => void
  disabled?: boolean
}

export function LegalDetailsSection({
  data,
  onChange,
  disabled = false
}: LegalDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-indigo-600" />
          <CardTitle>Legal Details</CardTitle>
        </div>
        <CardDescription>
          Legal and registration information for your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Legal Name */}
        <div className="space-y-2">
          <Label htmlFor="legal-name">
            <Building className="inline h-4 w-4 mr-1" />
            Legal Name
          </Label>
          <Input
            id="legal-name"
            value={data.legal_name || ''}
            onChange={(e) => onChange('legal_name', e.target.value)}
            disabled={disabled}
            placeholder="Smile Dental Practice LLC"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Official registered business name
          </p>
        </div>

        {/* Tax ID */}
        <div className="space-y-2">
          <Label htmlFor="tax-id">
            Tax ID / EIN
          </Label>
          <Input
            id="tax-id"
            value={data.tax_id || ''}
            onChange={(e) => onChange('tax_id', e.target.value)}
            disabled={disabled}
            placeholder="12-3456789"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Tax identification number (EIN, VAT, etc.)
          </p>
        </div>

        {/* Registration Number */}
        <div className="space-y-2">
          <Label htmlFor="registration-number">
            Business Registration Number
          </Label>
          <Input
            id="registration-number"
            value={data.registration_number || ''}
            onChange={(e) => onChange('registration_number', e.target.value)}
            disabled={disabled}
            placeholder="BRN-123456"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Company registration or incorporation number
          </p>
        </div>

        {/* Legal Address Section Header */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-3.5 w-3.5 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900">Legal Address</h4>
          </div>

          <div className="grid gap-4">
            {/* Address Line 1 */}
            <div className="space-y-2">
              <Label htmlFor="legal-address-1">
                Address Line 1
              </Label>
              <Input
                id="legal-address-1"
                value={data.legal_address_line1 || ''}
                onChange={(e) => onChange('legal_address_line1', e.target.value)}
                disabled={disabled}
                placeholder="123 Main Street"
              />
            </div>

            {/* Address Line 2 */}
            <div className="space-y-2">
              <Label htmlFor="legal-address-2">
                Address Line 2
              </Label>
              <Input
                id="legal-address-2"
                value={data.legal_address_line2 || ''}
                onChange={(e) => onChange('legal_address_line2', e.target.value)}
                disabled={disabled}
                placeholder="Suite 100 (optional)"
              />
            </div>

            {/* City, State, Postal Code - Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legal-city">
                  City
                </Label>
                <Input
                  id="legal-city"
                  value={data.legal_city || ''}
                  onChange={(e) => onChange('legal_city', e.target.value)}
                  disabled={disabled}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-state">
                  State / Province
                </Label>
                <Input
                  id="legal-state"
                  value={data.legal_state || ''}
                  onChange={(e) => onChange('legal_state', e.target.value)}
                  disabled={disabled}
                  placeholder="NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-postal-code">
                  Postal Code
                </Label>
                <Input
                  id="legal-postal-code"
                  value={data.legal_postal_code || ''}
                  onChange={(e) => onChange('legal_postal_code', e.target.value)}
                  disabled={disabled}
                  placeholder="10001"
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="legal-country">
                Country
              </Label>
              <Input
                id="legal-country"
                value={data.legal_country || ''}
                onChange={(e) => onChange('legal_country', e.target.value)}
                disabled={disabled}
                placeholder="United States"
                className="max-w-md"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

