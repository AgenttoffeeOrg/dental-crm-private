'use client'

import React, { useEffect } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Calendar, DollarSign } from 'lucide-react'

/**
 * BusinessSettingsStep
 * 
 * Step 9: Business Settings
 * Fields:
 * - Fiscal Year Start (optional)
 * - Primary Currency (required)
 * - Business Hours (optional)
 * - GDPR Compliant (optional)
 * - Data Retention Days (optional)
 */

interface BusinessHours {
  monday?: { enabled: boolean; start: string; end: string }
  tuesday?: { enabled: boolean; start: string; end: string }
  wednesday?: { enabled: boolean; start: string; end: string }
  thursday?: { enabled: boolean; start: string; end: string }
  friday?: { enabled: boolean; start: string; end: string }
  saturday?: { enabled: boolean; start: string; end: string }
  sunday?: { enabled: boolean; start: string; end: string }
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '13:00' },
  sunday: { enabled: false, start: '09:00', end: '13:00' }
}

export function BusinessSettingsStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  useEffect(() => {
    if (!stepData.fiscal_year_start) updateFieldValue('fiscal_year_start', 1)
    if (!stepData.primary_currency) updateFieldValue('primary_currency', 'GBP')
    if (!stepData.business_hours_json) updateFieldValue('business_hours_json', DEFAULT_BUSINESS_HOURS)
    if (!stepData.data_retention_days) updateFieldValue('data_retention_days', 365)
  }, [])

  const businessHours: BusinessHours = stepData.business_hours_json || DEFAULT_BUSINESS_HOURS

  const updateBusinessHours = (day: keyof BusinessHours, field: 'enabled' | 'start' | 'end', value: any) => {
    const updated = {
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [field]: value
      }
    }
    updateFieldValue('business_hours_json', updated)
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  const months = [
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
    { value: 12, label: 'December' }
  ]

  return (
    <div className="space-y-6">
      {/* Financial Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <DollarSign className="h-4 w-4 text-gray-600" />
          Financial Settings
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WizardFieldWrapper
            fieldName="fiscal_year_start"
            label="Fiscal Year Start Month"
            isRequired={false}
            helpText="The month your fiscal year begins"
          >
            <Select
              value={String(stepData.fiscal_year_start || 1)}
              onValueChange={(value) => updateFieldValue('fiscal_year_start', parseInt(value))}
            >
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardFieldWrapper>

          <WizardFieldWrapper
            fieldName="primary_currency"
            label="Primary Currency"
            isRequired={true}
            helpText="The main currency for financial operations"
          >
            <Select
              value={stepData.primary_currency || 'GBP'}
              onValueChange={(value) => updateFieldValue('primary_currency', value)}
            >
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GBP">British Pound (£ GBP)</SelectItem>
                <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                <SelectItem value="EUR">Euro (€ EUR)</SelectItem>
                <SelectItem value="CAD">Canadian Dollar ($ CAD)</SelectItem>
                <SelectItem value="AUD">Australian Dollar ($ AUD)</SelectItem>
                <SelectItem value="NZD">New Zealand Dollar ($ NZD)</SelectItem>
                <SelectItem value="INR">Indian Rupee (₹ INR)</SelectItem>
                <SelectItem value="AED">UAE Dirham (د.إ AED)</SelectItem>
              </SelectContent>
            </Select>
          </WizardFieldWrapper>
        </div>
      </div>

      {/* Business Hours */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Calendar className="h-4 w-4 text-gray-600" />
          Business Hours (Optional)
        </div>
        <p className="text-xs text-gray-500">
          Set your organization's operating hours for appointments and availability
        </p>
        
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {days.map(({ key, label }) => {
            const dayData = businessHours[key as keyof BusinessHours]
            return (
              <div key={key} className="p-4 flex items-center gap-4">
                <div className="flex items-center gap-3 w-32">
                  <Switch
                    checked={dayData?.enabled || false}
                    onCheckedChange={(checked) => updateBusinessHours(key as keyof BusinessHours, 'enabled', checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>

                {dayData?.enabled && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayData.start || '09:00'}
                      onChange={(e) => updateBusinessHours(key as keyof BusinessHours, 'start', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={dayData.end || '18:00'}
                      onChange={(e) => updateBusinessHours(key as keyof BusinessHours, 'end', e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                
                {!dayData?.enabled && (
                  <span className="text-sm text-gray-400 flex-1">Closed</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Compliance & Data */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Settings className="h-4 w-4 text-gray-600" />
          Compliance & Data Management
        </div>

        {/* GDPR Compliant */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="gdpr_compliant" className="text-sm font-medium text-gray-900">
                GDPR Compliant
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Enable GDPR compliance features for data protection
              </p>
            </div>
            <Switch
              id="gdpr_compliant"
              checked={stepData.gdpr_compliant || false}
              onCheckedChange={(checked) => updateFieldValue('gdpr_compliant', checked)}
            />
          </div>
        </div>

        {/* Data Retention */}
        <WizardFieldWrapper
          fieldName="data_retention_days"
          label="Data Retention Period (Days)"
          isRequired={false}
          helpText="How long to retain data before automatic deletion (minimum 30 days)"
        >
          <Input
            id="data_retention_days"
            type="number"
            min="30"
            value={stepData.data_retention_days || 365}
            onChange={(e) => updateFieldValue('data_retention_days', parseInt(e.target.value))}
            placeholder="365"
            className="text-base"
          />
        </WizardFieldWrapper>

        {stepData.gdpr_compliant && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-xs">
              GDPR compliance enabled. Patient data will be handled according to GDPR regulations.
              Users will have access to data export and deletion requests.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

