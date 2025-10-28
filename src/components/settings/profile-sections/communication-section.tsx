'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Mail, MessageSquare, HelpCircle } from 'lucide-react'
import type { AppUser } from '@/types/database'

interface CommunicationSectionProps {
  profile: AppUser
  onChange: (field: keyof AppUser, value: any) => void
  hasChanges: boolean
}

export function CommunicationSection({
  profile,
  onChange,
  hasChanges
}: CommunicationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-blue-600" />
          Communication Preferences
          {hasChanges && (
            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-300">
              Unsaved changes
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Customize your email and SMS signatures
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Email Signature */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="email_signature">Email Signature</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your email signature will be automatically added to emails you send.
                    You can use plain text or basic HTML.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="email_signature"
            value={profile.email_signature || ''}
            onChange={(e) => onChange('email_signature', e.target.value)}
            placeholder={`Best regards,
${profile.full_name}
${profile.professional_title || 'Your Title'}

${profile.phone_office || profile.phone_mobile || 'Your Phone'}
${profile.email || 'your.email@practice.com'}`}
            rows={8}
            className="font-mono text-sm resize-y"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {profile.email_signature?.length || 0} characters
            </p>
            <p className="text-xs text-gray-500">
              Tip: Include your name, title, contact info
            </p>
          </div>
        </div>

        {/* Preview */}
        {profile.email_signature && (
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
            <div 
              className="text-sm whitespace-pre-wrap text-gray-900"
              dangerouslySetInnerHTML={{ __html: profile.email_signature }}
            />
          </div>
        )}

        {/* SMS Signature */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Label htmlFor="sms_signature">SMS Signature</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your SMS signature will be automatically added to text messages.
                    Keep it short (recommended: 20-40 characters).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Textarea
              id="sms_signature"
              value={profile.sms_signature || ''}
              onChange={(e) => onChange('sms_signature', e.target.value)}
              placeholder={`- ${profile.full_name?.split(' ')[0] || 'Your Name'}, ${profile.professional_title?.split(' ')[0] || 'Practice'}`}
              rows={2}
              maxLength={60}
              className="pl-10 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {profile.sms_signature?.length || 0} / 60 characters
            </p>
            {profile.sms_signature && profile.sms_signature.length > 40 && (
              <p className="text-xs text-amber-600">
                ⚠️ Shorter signatures work better for SMS
              </p>
            )}
          </div>
        </div>

        {/* SMS Preview */}
        {profile.sms_signature && (
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">SMS Preview:</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-900">
                Hi! Your appointment is confirmed for tomorrow at 2pm.
              </p>
              <p className="text-sm text-gray-600">
                {profile.sms_signature}
              </p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-xs font-medium text-blue-900 mb-2">💡 Tips:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Keep SMS signatures short and professional</li>
            <li>• Email signatures can include more detail</li>
            <li>• Update your signatures when your role changes</li>
            <li>• Test how they look on mobile devices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

