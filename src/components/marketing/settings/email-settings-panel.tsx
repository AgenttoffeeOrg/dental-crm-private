'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export function EmailSettingsPanel() {
  const [settings, setSettings] = useState({
    fromName: 'Your Dental Practice',
    fromEmail: 'hello@yourpractice.com',
    replyTo: 'support@yourpractice.com',
    sendingDomain: 'yourpractice.com',
  })

  const [dkimConfigured, setDkimConfigured] = useState(false)
  const [spfConfigured, setSpfConfigured] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSave = async () => {
    toast.success('Email settings saved successfully')
  }

  const handleTestEmail = async () => {
    setSending(true)
    // Simulate test email
    setTimeout(() => {
      toast.success('Test email sent! Check your inbox.')
      setSending(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                placeholder="Your Practice Name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name appears in the "From" field of your emails
              </p>
            </div>

            <div>
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={settings.fromEmail}
                onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                placeholder="hello@yourpractice.com"
              />
            </div>

            <div>
              <Label htmlFor="replyTo">Reply-To Email</Label>
              <Input
                id="replyTo"
                type="email"
                value={settings.replyTo}
                onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                placeholder="support@yourpractice.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Replies will be sent to this address
              </p>
            </div>

            <div>
              <Label htmlFor="domain">Sending Domain</Label>
              <Input
                id="domain"
                value={settings.sendingDomain}
                onChange={(e) => setSettings({ ...settings, sendingDomain: e.target.value })}
                placeholder="yourpractice.com"
              />
            </div>
          </div>

          {/* DNS Configuration Status */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">DNS Configuration</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">DKIM Record</span>
              {dkimConfigured ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">SPF Record</span>
              {spfConfigured ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave}>
              Save Settings
            </Button>
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={sending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

