'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Mail, ExternalLink } from 'lucide-react'

export interface ThankYouSettings {
  message: string
  redirectUrl: string | null
  redirectDelay: number
  sendConfirmationEmail: boolean
  confirmationEmailSubject: string
  confirmationEmailBody: string
}

interface ThankYouEditorProps {
  settings: ThankYouSettings
  onChange: (settings: ThankYouSettings) => void
  availableVariables?: string[]
}

const DEFAULT_VARIABLES = [
  '{{full_name}}',
  '{{email}}',
  '{{phone}}',
  '{{treatment_interest}}',
  '{{submission_date}}',
  '{{submission_time}}',
]

export function ThankYouEditor({
  settings,
  onChange,
  availableVariables = DEFAULT_VARIABLES,
}: ThankYouEditorProps) {
  const updateSetting = <K extends keyof ThankYouSettings>(
    key: K,
    value: ThankYouSettings[K]
  ) => {
    onChange({ ...settings, [key]: value })
  }

  const insertVariable = (variable: string, target: 'message' | 'emailBody') => {
    if (target === 'message') {
      const newMessage = settings.message + ' ' + variable
      updateSetting('message', newMessage)
    } else {
      const newBody = settings.confirmationEmailBody + ' ' + variable
      updateSetting('confirmationEmailBody', newBody)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Thank You Page Settings
        </CardTitle>
        <p className="text-sm text-gray-600">
          Customize what users see after submitting the form
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success Message */}
        <div className="space-y-2">
          <Label htmlFor="success_message">Success Message</Label>
          <Textarea
            id="success_message"
            value={settings.message}
            onChange={(e) => updateSetting('message', e.target.value)}
            placeholder="Thank you, {{full_name}}! We'll be in touch within 24 hours."
            rows={4}
            className="font-sans"
          />
          <p className="text-xs text-gray-500">
            Use variables to personalize the message
          </p>

          {/* Variable Chips */}
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((variable) => (
              <Badge
                key={variable}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => insertVariable(variable, 'message')}
              >
                {variable}
              </Badge>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Preview:</p>
          <p className="text-sm whitespace-pre-line">
            {settings.message.replace(/\{\{(\w+)\}\}/g, (match) => {
              return `[${match}]`
            })}
          </p>
        </div>

        {/* Redirect URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="redirect_url">Redirect URL (Optional)</Label>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            id="redirect_url"
            type="url"
            value={settings.redirectUrl || ''}
            onChange={(e) => updateSetting('redirectUrl', e.target.value || null)}
            placeholder="https://yoursite.com/thank-you"
          />
          <p className="text-xs text-gray-500">
            Redirect users to this URL after submission (leave empty to show message only)
          </p>
        </div>

        {/* Redirect Delay */}
        {settings.redirectUrl && (
          <div className="space-y-2">
            <Label htmlFor="redirect_delay">Redirect Delay (seconds)</Label>
            <Input
              id="redirect_delay"
              type="number"
              min="0"
              max="10"
              value={settings.redirectDelay}
              onChange={(e) => updateSetting('redirectDelay', parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-gray-500">
              Wait time before redirecting (recommended: 2-3 seconds)
            </p>
          </div>
        )}

        {/* Confirmation Email */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send Confirmation Email
              </Label>
              <p className="text-sm text-gray-500">
                Send an automated confirmation to the submitter
              </p>
            </div>
            <Switch
              checked={settings.sendConfirmationEmail}
              onCheckedChange={(checked) => updateSetting('sendConfirmationEmail', checked)}
            />
          </div>

          {settings.sendConfirmationEmail && (
            <>
              {/* Email Subject */}
              <div className="space-y-2">
                <Label htmlFor="email_subject">Email Subject</Label>
                <Input
                  id="email_subject"
                  value={settings.confirmationEmailSubject}
                  onChange={(e) => updateSetting('confirmationEmailSubject', e.target.value)}
                  placeholder="Thank you for your inquiry, {{full_name}}"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <Label htmlFor="email_body">Email Body</Label>
                <Textarea
                  id="email_body"
                  value={settings.confirmationEmailBody}
                  onChange={(e) => updateSetting('confirmationEmailBody', e.target.value)}
                  placeholder="Dear {{full_name}},&#10;&#10;Thank you for contacting us. We've received your inquiry and will respond within 24 hours.&#10;&#10;Best regards,&#10;The Team"
                  rows={6}
                />

                {/* Variable Chips */}
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => insertVariable(variable, 'emailBody')}
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Best Practices</p>
              <ul className="space-y-1 text-xs">
                <li>• Always include a clear thank you message</li>
                <li>• Set realistic response time expectations</li>
                <li>• Use variables to personalize messages</li>
                <li>• Avoid redirecting immediately (show message for 2-3s)</li>
                <li>• Send confirmation emails to build trust</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

