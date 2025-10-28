'use client'

import React, { useEffect } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

/**
 * WorkPreferencesStep
 * 
 * Step 3: Work Preferences
 * Fields:
 * - Timezone (required)
 * - Language (required)
 * - Date Format (required)
 * - Time Format (required)
 * - Working Hours (optional)
 */

interface WorkingHours {
  monday?: { enabled: boolean; start: string; end: string }
  tuesday?: { enabled: boolean; start: string; end: string }
  wednesday?: { enabled: boolean; start: string; end: string }
  thursday?: { enabled: boolean; start: string; end: string }
  friday?: { enabled: boolean; start: string; end: string}
  saturday?: { enabled: boolean; start: string; end: string }
  sunday?: { enabled: boolean; start: string; end: string }
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' }
}

export function WorkPreferencesStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  useEffect(() => {
    // Set defaults if not already set
    if (!stepData.timezone) updateFieldValue('timezone', 'Europe/London')
    if (!stepData.language) updateFieldValue('language', 'en')
    if (!stepData.date_format) updateFieldValue('date_format', 'DD/MM/YYYY')
    if (!stepData.time_format) updateFieldValue('time_format', '24h')
    if (!stepData.working_hours_json) updateFieldValue('working_hours_json', DEFAULT_WORKING_HOURS)
  }, [])

  const workingHours: WorkingHours = stepData.working_hours_json || DEFAULT_WORKING_HOURS

  const updateWorkingHours = (day: keyof WorkingHours, field: 'enabled' | 'start' | 'end', value: any) => {
    const updated = {
      ...workingHours,
      [day]: {
        ...workingHours[day],
        [field]: value
      }
    }
    updateFieldValue('working_hours_json', updated)
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

  return (
    <div className="space-y-6">
      {/* Timezone */}
      <WizardFieldWrapper
        fieldName="timezone"
        label="Timezone"
        isRequired={true}
        helpText="Your local timezone for scheduling and notifications"
      >
        <Select
          value={stepData.timezone || 'Europe/London'}
          onValueChange={(value) => updateFieldValue('timezone', value)}
        >
          <SelectTrigger className="text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Europe/London">UK Time (GMT/BST)</SelectItem>
            <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
            <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
            <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
            <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
            <SelectItem value="Asia/Dubai">Gulf Standard Time (GST)</SelectItem>
            <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
            <SelectItem value="Asia/Singapore">Singapore Time (SGT)</SelectItem>
            <SelectItem value="Australia/Sydney">Australian Eastern Time (AET)</SelectItem>
          </SelectContent>
        </Select>
      </WizardFieldWrapper>

      {/* Language */}
      <WizardFieldWrapper
        fieldName="language"
        label="Language"
        isRequired={true}
        helpText="Your preferred language for the interface"
      >
        <Select
          value={stepData.language || 'en'}
          onValueChange={(value) => updateFieldValue('language', value)}
        >
          <SelectTrigger className="text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="it">Italian</SelectItem>
            <SelectItem value="pt">Portuguese</SelectItem>
          </SelectContent>
        </Select>
      </WizardFieldWrapper>

      {/* Date & Time Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WizardFieldWrapper
          fieldName="date_format"
          label="Date Format"
          isRequired={true}
          helpText="How dates will be displayed"
        >
          <Select
            value={stepData.date_format || 'DD/MM/YYYY'}
            onValueChange={(value) => updateFieldValue('date_format', value)}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
            </SelectContent>
          </Select>
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="time_format"
          label="Time Format"
          isRequired={true}
          helpText="12-hour or 24-hour clock"
        >
          <Select
            value={stepData.time_format || '24h'}
            onValueChange={(value) => updateFieldValue('time_format', value)}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12h">12-hour (3:00 PM)</SelectItem>
              <SelectItem value="24h">24-hour (15:00)</SelectItem>
            </SelectContent>
          </Select>
        </WizardFieldWrapper>
      </div>

      {/* Working Hours */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">
          Working Hours (Optional)
        </Label>
        <p className="text-xs text-gray-500 mb-3">
          Set your typical working hours to help schedule appointments and notifications
        </p>
        
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {days.map(({ key, label }) => {
            const dayData = workingHours[key as keyof WorkingHours]
            return (
              <div key={key} className="p-4 flex items-center gap-4">
                {/* Day Toggle */}
                <div className="flex items-center gap-3 w-32">
                  <Switch
                    checked={dayData?.enabled || false}
                    onCheckedChange={(checked) => updateWorkingHours(key as keyof WorkingHours, 'enabled', checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>

                {/* Time Inputs */}
                {dayData?.enabled && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayData.start || '09:00'}
                      onChange={(e) => updateWorkingHours(key as keyof WorkingHours, 'start', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={dayData.end || '17:00'}
                      onChange={(e) => updateWorkingHours(key as keyof WorkingHours, 'end', e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                
                {!dayData?.enabled && (
                  <span className="text-sm text-gray-400 flex-1">Not working</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

