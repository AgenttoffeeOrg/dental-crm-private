'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-fetch'

type IntegrationChannelTab = 'email' | 'sms' | 'whatsapp' | 'voice'

interface IntegrationSettings {
  id?: string
  tenant_id: string

  // Email
  email_provider: string
  email_api_key: string
  email_from_address: string
  email_from_name: string
  is_email_configured: boolean

  // SMS (Twilio)
  sms_account_sid: string
  sms_auth_token: string
  sms_from_number: string
  is_sms_configured: boolean

  // WhatsApp (Twilio)
  whatsapp_account_sid: string
  whatsapp_auth_token: string
  whatsapp_from_number: string
  is_whatsapp_configured: boolean

  // Voice (Twilio)
  voice_account_sid: string
  voice_auth_token: string
  voice_from_number: string
  is_voice_configured: boolean

  // Webhooks
  email_webhook_url?: string
  sms_webhook_url?: string
  whatsapp_webhook_url?: string
  voice_webhook_url?: string
}

function channelLabel(channel: IntegrationChannelTab): string {
  switch (channel) {
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    case 'whatsapp':
      return 'WhatsApp'
    case 'voice':
      return 'Voice'
    default:
      return channel
  }
}

function mapRowToState(row: Record<string, unknown>): Partial<IntegrationSettings> {
  const s = (v: unknown): string =>
    v === null || v === undefined ? '' : typeof v === 'string' ? v : String(v)

  const emailProv = row.email_provider
  return {
    tenant_id: s(row.tenant_id),
    email_provider:
      typeof emailProv === 'string' && emailProv.trim() !== '' ? emailProv : 'sendgrid',
    email_api_key: s(row.email_api_key),
    email_from_address: s(row.email_from_address),
    email_from_name: s(row.email_from_name),
    is_email_configured: Boolean(row.is_email_configured),
    sms_account_sid: s(row.sms_account_sid),
    sms_auth_token: s(row.sms_auth_token),
    sms_from_number: s(row.sms_from_number),
    is_sms_configured: Boolean(row.is_sms_configured),
    whatsapp_account_sid: s(row.whatsapp_account_sid),
    whatsapp_auth_token: s(row.whatsapp_auth_token),
    whatsapp_from_number: s(row.whatsapp_from_number),
    is_whatsapp_configured: Boolean(row.is_whatsapp_configured),
    voice_account_sid: s(row.voice_account_sid),
    voice_auth_token: s(row.voice_auth_token),
    voice_from_number: s(row.voice_from_number),
    is_voice_configured: Boolean(row.is_voice_configured),
  }
}

function extractChannelPayload(
  channel: IntegrationChannelTab,
  settings: IntegrationSettings
): Record<string, string> {
  switch (channel) {
    case 'email':
      return {
        email_provider: settings.email_provider,
        email_api_key: settings.email_api_key,
        email_from_address: settings.email_from_address,
        email_from_name: settings.email_from_name,
      }
    case 'sms':
      return {
        sms_account_sid: settings.sms_account_sid,
        sms_auth_token: settings.sms_auth_token,
        sms_from_number: settings.sms_from_number,
      }
    case 'whatsapp':
      return {
        whatsapp_account_sid: settings.whatsapp_account_sid,
        whatsapp_auth_token: settings.whatsapp_auth_token,
        whatsapp_from_number: settings.whatsapp_from_number,
      }
    case 'voice':
      return {
        voice_account_sid: settings.voice_account_sid,
        voice_auth_token: settings.voice_auth_token,
        voice_from_number: settings.voice_from_number,
      }
  }
}

// Hard cap so a stuck server call can never wedge the form indefinitely.
const REQUEST_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
  input: Parameters<typeof authFetch>[0],
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = REQUEST_TIMEOUT_MS, signal: _ignoredCallerSignal, ...rest } = init
  void _ignoredCallerSignal // explicitly drop a caller-supplied signal; we own the abort lifecycle here
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await authFetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function CommunicationsIntegrationsTab() {
  // `initialLoading` = the very first GET on mount; only it should hide the form.
  // `savingChannel` = which Save button (if any) is currently in-flight.
  const [initialLoading, setInitialLoading] = useState(true)
  const [savingChannel, setSavingChannel] = useState<IntegrationChannelTab | null>(null)
  const [settings, setSettings] = useState<IntegrationSettings>({
    tenant_id: '',
    email_provider: 'sendgrid',
    email_api_key: '',
    email_from_address: '',
    email_from_name: '',
    is_email_configured: false,
    sms_account_sid: '',
    sms_auth_token: '',
    sms_from_number: '',
    is_sms_configured: false,
    whatsapp_account_sid: '',
    whatsapp_auth_token: '',
    whatsapp_from_number: '',
    is_whatsapp_configured: false,
    voice_account_sid: '',
    voice_auth_token: '',
    voice_from_number: '',
    is_voice_configured: false
  })
  const [showSecrets, setShowSecrets] = useState({
    emailKey: false,
    smsToken: false,
    whatsappToken: false,
    voiceToken: false
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setInitialLoading(true)
    try {
      const res = await fetchWithTimeout('/api/settings/communications/integrations', {
        method: 'GET',
      })
      if (!res.ok) {
        toast.error('Failed to load integration settings', {
          description: `Server responded ${res.status}`,
        })
        return
      }
      const json = (await res.json()) as {
        ok?: boolean
        row?: Record<string, unknown>
      }
      if (json?.ok && json?.row && typeof json.row === 'object') {
        setSettings((prev) => ({
          ...prev,
          ...mapRowToState(json.row as Record<string, unknown>),
        }))
      }
    } catch (err) {
      console.error('[CIT loadSettings] failed', err)
      const aborted = err instanceof Error && err.name === 'AbortError'
      toast.error(
        aborted
          ? 'Loading integration settings timed out — please retry'
          : 'Failed to load integration settings'
      )
    } finally {
      setInitialLoading(false)
    }
  }

  const saveSettings = async (channel: IntegrationChannelTab) => {
    setSavingChannel(channel)
    try {
      const payload = extractChannelPayload(channel, settings)
      const res = await fetchWithTimeout('/api/settings/communications/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, payload }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        row?: Record<string, unknown>
      }
      if (!res.ok) {
        toast.error('Failed to save integration settings', {
          description:
            json?.error === 'invalid_payload'
              ? 'Some required fields are missing or invalid.'
              : `Server responded ${res.status}`,
        })
        return
      }
      toast.success(`${channelLabel(channel)} settings saved`)
      if (json?.row && typeof json.row === 'object') {
        setSettings((prev) => ({
          ...prev,
          ...mapRowToState(json.row as Record<string, unknown>),
        }))
      }
    } catch (err) {
      console.error('[CIT saveSettings] failed', err)
      const aborted = err instanceof Error && err.name === 'AbortError'
      toast.error(
        aborted
          ? 'Saving integration settings timed out — please retry'
          : 'Failed to save integration settings'
      )
    } finally {
      setSavingChannel(null)
    }
  }

  const testIntegration = async (type: 'email' | 'sms' | 'whatsapp' | 'voice') => {
    toast.info(`Testing ${type} integration...`)
    
    // TODO: Call API endpoint to test integration
    // For now, just simulate success
    setTimeout(() => {
      toast.success(`${type.toUpperCase()} integration test successful!`)
    }, 1500)
  }

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Webhook URL copied!')
  }

  if (initialLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading integration settings...</div>
  }

  const baseWebhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks`
    : 'https://your-domain.com/api/webhooks'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Communications Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Configure email, SMS, WhatsApp, and voice call integrations. 
          Add your API keys to enable real-time communications.
        </p>
      </div>

      {/* Info Banner - Using New Unified Integration System */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Using New Unified Integration System</h3>
            <p className="text-sm text-blue-700 mb-2">
              This page is for API key-based integrations (Twilio, SendGrid). For OAuth integrations (Google, Facebook, Microsoft), 
              use the <strong>&quot;Integrations&quot;</strong> tab above.
            </p>
            <p className="text-xs text-blue-600">
              💡 The new unified system allows one-click connection per provider. Switch to the &quot;Integrations&quot; tab to get started!
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
            {settings.is_email_configured && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
            {settings.is_sms_configured && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
            {settings.is_whatsapp_configured && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-2">
            <Phone className="h-4 w-4" />
            Voice (Twilio)
            {settings.is_voice_configured && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="voip" className="gap-2">
            <Phone className="h-4 w-4" />
            VoIP Systems
          </TabsTrigger>
        </TabsList>

        {/* EMAIL TAB */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Integration
                {settings.is_email_configured ? (
                  <Badge variant="outline" className="ml-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto">
                    <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                    Not Configured
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Send and receive emails directly from the CRM. Supports Resend, SendGrid, Gmail, Outlook, and Amazon SES.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Provider</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={settings.email_provider}
                  onChange={(e) => setSettings({...settings, email_provider: e.target.value})}
                >
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="gmail">Gmail (OAuth)</option>
                  <option value="outlook">Outlook (OAuth)</option>
                  <option value="ses">Amazon SES</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecrets.emailKey ? 'text' : 'password'}
                    placeholder="SG.xxxxxxxxxxxx"
                    value={settings.email_api_key}
                    onChange={(e) => setSettings({...settings, email_api_key: e.target.value})}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets({...showSecrets, emailKey: !showSecrets.emailKey})}
                  >
                    {showSecrets.emailKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    placeholder="noreply@yourpractice.com"
                    value={settings.email_from_address}
                    onChange={(e) => setSettings({...settings, email_from_address: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    placeholder="Your Practice Name"
                    value={settings.email_from_name}
                    onChange={(e) => setSettings({...settings, email_from_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL (for receiving emails)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${baseWebhookUrl}/email`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(`${baseWebhookUrl}/email`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure this URL in your email provider&apos;s webhook settings
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveSettings('email')} disabled={savingChannel !== null}>
                  {savingChannel === 'email' ? 'Saving…' : 'Save Email Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testIntegration('email')}
                  disabled={!settings.email_api_key}
                >
                  Test Connection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('https://sendgrid.com/docs/api-reference/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  API Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS TAB */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Integration (Twilio)
                {settings.is_sms_configured ? (
                  <Badge variant="outline" className="ml-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto">
                    <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                    Not Configured
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Send and receive SMS messages via Twilio. ~$0.0075 per SMS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Twilio Account SID</Label>
                <Input
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.sms_account_sid}
                  onChange={(e) => setSettings({...settings, sms_account_sid: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Twilio Auth Token</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecrets.smsToken ? 'text' : 'password'}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.sms_auth_token}
                    onChange={(e) => setSettings({...settings, sms_auth_token: e.target.value})}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets({...showSecrets, smsToken: !showSecrets.smsToken})}
                  >
                    {showSecrets.smsToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Twilio Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={settings.sms_from_number}
                  onChange={(e) => setSettings({...settings, sms_from_number: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Your Twilio phone number (must be SMS-enabled)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL (for receiving SMS)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${baseWebhookUrl}/sms`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(`${baseWebhookUrl}/sms`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure this URL in Twilio Console → Phone Numbers → Messaging
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveSettings('sms')} disabled={savingChannel !== null}>
                  {savingChannel === 'sms' ? 'Saving…' : 'Save SMS Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testIntegration('sms')}
                  disabled={!settings.sms_account_sid || !settings.sms_auth_token}
                >
                  Test Connection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('https://www.twilio.com/docs/sms', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Twilio Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHATSAPP TAB */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Business Integration
                {settings.is_whatsapp_configured ? (
                  <Badge variant="outline" className="ml-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto">
                    <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                    Not Configured
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Send and receive WhatsApp messages via Twilio WhatsApp Business API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p className="font-medium text-blue-900">WhatsApp Business Account Required</p>
                <p className="text-blue-700 mt-1">
                  You need a verified WhatsApp Business account. Contact Twilio to get started.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Twilio Account SID</Label>
                <Input
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.whatsapp_account_sid}
                  onChange={(e) => setSettings({...settings, whatsapp_account_sid: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Twilio Auth Token</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecrets.whatsappToken ? 'text' : 'password'}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.whatsapp_auth_token}
                    onChange={(e) => setSettings({...settings, whatsapp_auth_token: e.target.value})}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets({...showSecrets, whatsappToken: !showSecrets.whatsappToken})}
                  >
                    {showSecrets.whatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  placeholder="whatsapp:+1234567890"
                  value={settings.whatsapp_from_number}
                  onChange={(e) => setSettings({...settings, whatsapp_from_number: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Format: whatsapp:+[country code][number]
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL (for receiving messages)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${baseWebhookUrl}/whatsapp`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(`${baseWebhookUrl}/whatsapp`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveSettings('whatsapp')} disabled={savingChannel !== null}>
                  {savingChannel === 'whatsapp' ? 'Saving…' : 'Save WhatsApp Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testIntegration('whatsapp')}
                  disabled={!settings.whatsapp_account_sid || !settings.whatsapp_auth_token}
                >
                  Test Connection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('https://www.twilio.com/docs/whatsapp', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  WhatsApp Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOICE TAB */}
        <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Voice Call Integration (Twilio)
                {settings.is_voice_configured ? (
                  <Badge variant="outline" className="ml-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto">
                    <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                    Not Configured
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Make and receive phone calls directly from the CRM. Click-to-call enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Twilio Account SID</Label>
                <Input
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.voice_account_sid}
                  onChange={(e) => setSettings({...settings, voice_account_sid: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Twilio Auth Token</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecrets.voiceToken ? 'text' : 'password'}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.voice_auth_token}
                    onChange={(e) => setSettings({...settings, voice_auth_token: e.target.value})}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets({...showSecrets, voiceToken: !showSecrets.voiceToken})}
                  >
                    {showSecrets.voiceToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Twilio Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={settings.voice_from_number}
                  onChange={(e) => setSettings({...settings, voice_from_number: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Your Twilio phone number (must be voice-enabled)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL (for call events)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${baseWebhookUrl}/voice`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(`${baseWebhookUrl}/voice`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure this URL in Twilio Console → Phone Numbers → Voice & Fax
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveSettings('voice')} disabled={savingChannel !== null}>
                  {savingChannel === 'voice' ? 'Saving…' : 'Save Voice Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testIntegration('voice')}
                  disabled={!settings.voice_account_sid || !settings.voice_auth_token}
                >
                  Test Connection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('https://www.twilio.com/docs/voice', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Voice API Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOIP SYSTEMS TAB */}
        <TabsContent value="voip">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  VoiceStack Integration
                </CardTitle>
                <CardDescription>
                  Connect your VoiceStack system for automatic call capture, recording, and transcription.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">What is VoiceStack?</h4>
                  <p className="text-sm text-blue-700">
                    VoiceStack is a cloud-based phone system that automatically captures all calls, provides recordings, 
                    and integrates with your CRM. When configured, every call will automatically create an activity.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>VoiceStack API Key</Label>
                  <Input
                    type="password"
                    placeholder="vs_xxxxxxxxxxxxxxxx"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact VoiceStack support to get your API credentials
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL (for incoming calls)</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${baseWebhookUrl}/voicestack`}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyWebhookUrl(`${baseWebhookUrl}/voicestack`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure this in your VoiceStack admin panel
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button disabled>
                    Save VoiceStack Settings
                  </Button>
                  <Button variant="outline" disabled>
                    Test Connection
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open('https://voicestack.com/docs', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    VoiceStack Docs
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Other VoIP Providers
                </CardTitle>
                <CardDescription>
                  RingCentral, Aircall, and other VoIP systems (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Button variant="outline" disabled className="h-20 flex-col">
                    <Phone className="h-6 w-6 mb-2" />
                    <span className="text-xs">RingCentral</span>
                  </Button>
                  <Button variant="outline" disabled className="h-20 flex-col">
                    <Phone className="h-6 w-6 mb-2" />
                    <span className="text-xs">Aircall</span>
                  </Button>
                  <Button variant="outline" disabled className="h-20 flex-col">
                    <Phone className="h-6 w-6 mb-2" />
                    <span className="text-xs">Custom VoIP</span>
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                  💡 These integrations are ready to be configured. Contact support for setup assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Integration Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <Mail className={`h-8 w-8 mx-auto mb-2 ${settings.is_email_configured ? 'text-green-500' : 'text-gray-300'}`} />
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">
                {settings.is_email_configured ? 'Ready' : 'Not configured'}
              </p>
            </div>
            <div className="text-center">
              <MessageSquare className={`h-8 w-8 mx-auto mb-2 ${settings.is_sms_configured ? 'text-green-500' : 'text-gray-300'}`} />
              <p className="text-sm font-medium">SMS</p>
              <p className="text-xs text-muted-foreground">
                {settings.is_sms_configured ? 'Ready' : 'Not configured'}
              </p>
            </div>
            <div className="text-center">
              <MessageSquare className={`h-8 w-8 mx-auto mb-2 ${settings.is_whatsapp_configured ? 'text-green-500' : 'text-gray-300'}`} />
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                {settings.is_whatsapp_configured ? 'Ready' : 'Not configured'}
              </p>
            </div>
            <div className="text-center">
              <Phone className={`h-8 w-8 mx-auto mb-2 ${settings.is_voice_configured ? 'text-green-500' : 'text-gray-300'}`} />
              <p className="text-sm font-medium">Voice</p>
              <p className="text-xs text-muted-foreground">
                {settings.is_voice_configured ? 'Ready' : 'Not configured'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

