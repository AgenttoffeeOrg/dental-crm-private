'use client'

import { useState } from 'react'
import { Building2, Calendar, Users, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tenant } from '@/types/database'

interface CompanyInformationSectionProps {
  data: Partial<Tenant>
  onChange: (field: keyof Tenant, value: any) => void
  disabled?: boolean
}

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
]

const INDUSTRIES = [
  'Dental Practice',
  'Medical Practice',
  'Healthcare Services',
  'Hospital',
  'Clinic',
  'Orthodontics',
  'Periodontics',
  'Oral Surgery',
  'Pediatric Dentistry',
  'Cosmetic Dentistry',
  'Other',
]

export function CompanyInformationSection({
  data,
  onChange,
  disabled = false
}: CompanyInformationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-indigo-600" />
          <CardTitle>Company Information</CardTitle>
        </div>
        <CardDescription>
          Basic information about your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="org-name">
            Organization Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="org-name"
            value={data.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            disabled={disabled}
            placeholder="Smile Dental Practice"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            This is the display name for your organization
          </p>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">
            <Users className="inline h-4 w-4 mr-1" />
            Industry
          </Label>
          <Select
            value={data.industry || ''}
            onValueChange={(value) => onChange('industry', value)}
            disabled={disabled}
          >
            <SelectTrigger id="industry" className="max-w-md">
              <SelectValue placeholder="Select industry..." />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            The primary industry or sector your organization operates in
          </p>
        </div>

        {/* Company Size */}
        <div className="space-y-2">
          <Label htmlFor="company-size">
            <Users className="inline h-4 w-4 mr-1" />
            Company Size
          </Label>
          <Select
            value={data.company_size || ''}
            onValueChange={(value) => onChange('company_size', value)}
            disabled={disabled}
          >
            <SelectTrigger id="company-size" className="max-w-md">
              <SelectValue placeholder="Select size..." />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Number of employees in your organization
          </p>
        </div>

        {/* Founded Date */}
        <div className="space-y-2">
          <Label htmlFor="founded-date">
            <Calendar className="inline h-4 w-4 mr-1" />
            Founded Date
          </Label>
          <Input
            id="founded-date"
            type="date"
            value={data.founded_date || ''}
            onChange={(e) => onChange('founded_date', e.target.value)}
            disabled={disabled}
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            When was your organization established?
          </p>
        </div>

        {/* Company Description */}
        <div className="space-y-2">
          <Label htmlFor="company-description">
            <FileText className="inline h-4 w-4 mr-1" />
            Company Description
          </Label>
          <Textarea
            id="company-description"
            value={data.company_description || ''}
            onChange={(e) => onChange('company_description', e.target.value)}
            disabled={disabled}
            placeholder="Describe your organization, its mission, and services..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Brief description of your organization (max 500 characters)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

