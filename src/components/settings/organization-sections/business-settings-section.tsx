'use client'

import { Settings, DollarSign, Calendar, Shield, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Tenant } from '@/types/database'

interface BusinessSettingsSectionProps {
  data: Partial<Tenant>
  onChange: (field: keyof Tenant, value: any) => void
  disabled?: boolean
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
]

export function BusinessSettingsSection({
  data,
  onChange,
  disabled = false
}: BusinessSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-indigo-600" />
          <CardTitle>Business Settings</CardTitle>
        </div>
        <CardDescription>
          Configure fiscal year, currency, and compliance settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Fiscal Year Start */}
        <div className="space-y-2">
          <Label htmlFor="fiscal-year-start">
            <Calendar className="inline h-3 w-3 mr-1" />
            Fiscal Year Start
          </Label>
          <Select
            value={data.fiscal_year_start?.toString() || '1'}
            onValueChange={(value) => onChange('fiscal_year_start', parseInt(value))}
            disabled={disabled}
          >
            <SelectTrigger id="fiscal-year-start" className="max-w-md">
              <SelectValue placeholder="Select month..." />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            The month when your fiscal year starts (default: January)
          </p>
        </div>

        {/* Primary Currency */}
        <div className="space-y-2">
          <Label htmlFor="primary-currency">
            <DollarSign className="inline h-3 w-3 mr-1" />
            Primary Currency
          </Label>
          <Select
            value={data.primary_currency || 'USD'}
            onValueChange={(value) => onChange('primary_currency', value)}
            disabled={disabled}
          >
            <SelectTrigger id="primary-currency" className="max-w-md">
              <SelectValue placeholder="Select currency..." />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Default currency for transactions and reporting
          </p>
        </div>

        {/* Data Retention */}
        <div className="space-y-2">
          <Label htmlFor="data-retention">
            <Clock className="inline h-3 w-3 mr-1" />
            Data Retention Period (days)
          </Label>
          <Input
            id="data-retention"
            type="number"
            min="1"
            max="3650"
            value={data.data_retention_days || 365}
            onChange={(e) => onChange('data_retention_days', parseInt(e.target.value))}
            disabled={disabled}
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            How long to retain data before archival (default: 365 days)
          </p>
        </div>

        {/* GDPR Compliance */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              <Label htmlFor="gdpr-compliant" className="font-medium cursor-pointer">
                GDPR Compliance
              </Label>
            </div>
            <p className="text-[10px] text-gray-600">
              Enable GDPR compliance mode for data protection and privacy regulations
            </p>
          </div>
          <Switch
            id="gdpr-compliant"
            checked={data.gdpr_compliant || false}
            onCheckedChange={(checked) => onChange('gdpr_compliant', checked)}
            disabled={disabled}
          />
        </div>

        {/* Business Hours Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-blue-900 mb-1">
                Business Hours
              </h4>
              <p className="text-xs text-blue-700">
                Organization-wide business hours can be configured in the Company → Locations section.
                Each location can have its own specific hours.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

