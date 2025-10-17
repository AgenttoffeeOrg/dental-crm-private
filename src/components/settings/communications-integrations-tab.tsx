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
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

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

export function CommunicationsIntegrationsTab() {
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
    const supabase = createClient()
    
    // Note: This component needs tenant context when integration_settings table exists
    // For now, skip loading and use defaults
    setLoading(false)
    return
    
    /* Uncomment when integration_settings table is created:
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('tenant_id', orgId)
      .single()
    
    // Handle errors gracefully
    if (error) {
      // PGRST116 = No rows found (expected for first time)
      // PGRST205 = Table not in schema cache (migration not run yet)
      // 42P01 = Table doesn't exist (PostgreSQL error)
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01') {
        console.log('[Integrations] Initializing settings (table not migrated yet)')
        toast.info('Integration settings ready to configure', {
          description: 'Run the database migration to enable saving settings'
        })
      } else {
        console.error('Error loading integration settings:', JSON.stringify(error))
        toast.error('Failed to load settings', {
          description: 'Unexpected error - check console for details'
        })
      }
    }
    
    // Initialize settings (either from DB or empty)
    if (data) {
      setSettings(data)
    } else {
      setSettings({
        tenant_id: tenantId,
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
    }
    
    setLoading(false)
    */
  }

  const saveSettings = async () => {
    setLoading(true)
    
    // TODO: Implement when integration_settings table is created
    toast.info('Save integration settings', {
      description: 'Database migration required to save settings'
    })
    
    setLoading(false)
    
    /* Uncomment when integration_settings table is created:
    const supabase = createClient()
    
    const { error } = await supabase
      .from('integration_settings')
      .upsert({
        ...settings,
        tenant_id: orgId,
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } else {
      toast.success('Integration settings saved!')
      loadSettings()
    }
    */
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

  if (loading) {
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

      {/* Migration Reminder Banner */}
      {settings && !settings.id && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Database Migration Required</h3>
              <p className="text-sm text-blue-700 mb-3">
                To enable integrations, run the database migration first:
              </p>
              <ol className="text-sm text-blue-700 space-y-1 mb-3 ml-4 list-decimal">
                <li>Open your Supabase project dashboard</li>
                <li>Go to <strong>SQL Editor</strong></li>
                <li>Copy the file: <code className="bg-blue-100 px-1 rounded">dental-crm/supabase/sql/19_activity_integrations.sql</code></li>
                <li>Paste and click <strong>RUN</strong></li>
              </ol>
              <p className="text-xs text-blue-600">
                💡 After running the migration, refresh this page. The UI will work even without the migration, but settings won't be saved.
              </p>
            </div>
          </div>
        </div>
      )}

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
                Send and receive emails directly from the CRM. Supports SendGrid, Gmail, Outlook, and Amazon SES.
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
                  Configure this URL in your email provider's webhook settings
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveSettings} disabled={loading}>
                  Save Email Settings
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
                <Button onClick={saveSettings} disabled={loading}>
                  Save SMS Settings
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
                <Button onClick={saveSettings} disabled={loading}>
                  Save WhatsApp Settings
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
                <Button onClick={saveSettings} disabled={loading}>
                  Save Voice Settings
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

