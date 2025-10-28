'use client'

import { Phone, Mail, Globe, Headphones } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Tenant } from '@/types/database'

interface ContactInformationSectionProps {
  data: Partial<Tenant>
  onChange: (field: keyof Tenant, value: any) => void
  disabled?: boolean
}

export function ContactInformationSection({
  data,
  onChange,
  disabled = false
}: ContactInformationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-indigo-600" />
          <CardTitle>Contact Information</CardTitle>
        </div>
        <CardDescription>
          How customers and partners can reach your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Main Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone-main">
            <Phone className="inline h-4 w-4 mr-1" />
            Main Phone Number
          </Label>
          <Input
            id="phone-main"
            type="tel"
            value={data.phone_main || ''}
            onChange={(e) => onChange('phone_main', e.target.value)}
            disabled={disabled}
            placeholder="+1 (555) 123-4567"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Primary contact phone number for your organization
          </p>
        </div>

        {/* Support Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone-support">
            <Headphones className="inline h-4 w-4 mr-1" />
            Support Phone Number
          </Label>
          <Input
            id="phone-support"
            type="tel"
            value={data.phone_support || ''}
            onChange={(e) => onChange('phone_support', e.target.value)}
            disabled={disabled}
            placeholder="+1 (555) 987-6543"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Dedicated support or helpdesk phone number
          </p>
        </div>

        {/* Main Email */}
        <div className="space-y-2">
          <Label htmlFor="email-main">
            <Mail className="inline h-4 w-4 mr-1" />
            Main Email Address
          </Label>
          <Input
            id="email-main"
            type="email"
            value={data.email_main || ''}
            onChange={(e) => onChange('email_main', e.target.value)}
            disabled={disabled}
            placeholder="info@smiledental.com"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Primary contact email for your organization
          </p>
        </div>

        {/* Support Email */}
        <div className="space-y-2">
          <Label htmlFor="email-support">
            <Mail className="inline h-4 w-4 mr-1" />
            Support Email Address
          </Label>
          <Input
            id="email-support"
            type="email"
            value={data.email_support || ''}
            onChange={(e) => onChange('email_support', e.target.value)}
            disabled={disabled}
            placeholder="support@smiledental.com"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Dedicated support or customer service email
          </p>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">
            <Globe className="inline h-4 w-4 mr-1" />
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={data.website || ''}
            onChange={(e) => onChange('website', e.target.value)}
            disabled={disabled}
            placeholder="https://www.smiledental.com"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500">
            Your organization's website URL
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

