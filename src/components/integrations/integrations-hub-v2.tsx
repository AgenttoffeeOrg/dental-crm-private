'use client'

/**
 * Comprehensive Integration Management Hub
 * 
 * Allows organizations to:
 * 1. Buy new integrations (Twilio, SendGrid, etc.)
 * 2. Link existing accounts (OAuth or API keys)
 * 3. Manage all integrations in one place
 * 4. View integration status and health
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  ShoppingCart,
  Link2,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Integration {
  id: string
  type: string
  name: string
  category: 'communications' | 'social' | 'analytics' | 'other'
  status: 'connected' | 'disconnected' | 'error' | 'expiring_soon'
  authMethod: 'oauth' | 'api_key' | 'both'
  buyUrl?: string
  docsUrl?: string
  icon: React.ReactNode
  description: string
  configured: boolean
  credentials?: {
    accountId?: string
    accountName?: string
    expiresAt?: string
  }
}

const INTEGRATIONS: Integration[] = [
  // Communications
  {
    id: 'twilio_sms',
    type: 'twilio_sms',
    name: 'Twilio SMS',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'api_key',
    buyUrl: 'https://www.twilio.com/try-twilio',
    docsUrl: 'https://www.twilio.com/docs',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send and receive SMS messages',
    configured: false,
  },
  {
    id: 'twilio_whatsapp',
    type: 'twilio_whatsapp',
    name: 'Twilio WhatsApp',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'api_key',
    buyUrl: 'https://www.twilio.com/whatsapp',
    docsUrl: 'https://www.twilio.com/docs/whatsapp',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send WhatsApp Business messages',
    configured: false,
  },
  {
    id: 'twilio_voice',
    type: 'twilio_voice',
    name: 'Twilio Voice',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'api_key',
    buyUrl: 'https://www.twilio.com/voice',
    docsUrl: 'https://www.twilio.com/docs/voice',
    icon: <Phone className="h-5 w-5" />,
    description: 'Make and receive phone calls',
    configured: false,
  },
  {
    id: 'sendgrid',
    type: 'sendgrid',
    name: 'SendGrid',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'api_key',
    buyUrl: 'https://signup.sendgrid.com/',
    docsUrl: 'https://docs.sendgrid.com/',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send transactional and marketing emails',
    configured: false,
  },
  {
    id: 'gmail',
    type: 'gmail',
    name: 'Gmail',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://developers.google.com/gmail/api',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send emails via Gmail account',
    configured: false,
  },
  {
    id: 'outlook',
    type: 'outlook',
    name: 'Outlook',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send emails via Outlook account',
    configured: false,
  },
  // Social Media
  {
    id: 'facebook',
    type: 'facebook',
    name: 'Facebook',
    category: 'social',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://developers.facebook.com/docs',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Manage Facebook pages and ads',
    configured: false,
  },
  {
    id: 'instagram',
    type: 'instagram',
    name: 'Instagram',
    category: 'social',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Manage Instagram business account',
    configured: false,
  },
  {
    id: 'tiktok',
    type: 'tiktok',
    name: 'TikTok',
    category: 'social',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://developers.tiktok.com/',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Manage TikTok business account',
    configured: false,
  },
  // Analytics
  {
    id: 'google_analytics',
    type: 'google_analytics',
    name: 'Google Analytics',
    category: 'analytics',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://developers.google.com/analytics',
    icon: <Settings className="h-5 w-5" />,
    description: 'Track website analytics',
    configured: false,
  },
  {
    id: 'google_ads',
    type: 'google_ads',
    name: 'Google Ads',
    category: 'analytics',
    status: 'disconnected',
    authMethod: 'oauth',
    docsUrl: 'https://developers.google.com/google-ads/api',
    icon: <Settings className="h-5 w-5" />,
    description: 'Manage Google Ads campaigns',
    configured: false,
  },
]

export function IntegrationsHubV2() {
  const { appUser } = useAuth()
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [apiKeyData, setApiKeyData] = useState<Record<string, string>>({})

  useEffect(() => {
    loadIntegrations()
  }, [appUser])

  const loadIntegrations = async () => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) return

    setLoading(true)
    const supabase = createClient()
    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    try {
      // Load integration connections
      const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('tenant_id', tenantId)

      // Update integration statuses
      const updatedIntegrations = INTEGRATIONS.map(integration => {
        const connection = connections?.find(c => c.integration_type === integration.type)
        if (connection) {
          return {
            ...integration,
            status: connection.status as Integration['status'],
            configured: connection.is_active,
            credentials: {
              accountId: connection.config?.account_id || connection.config?.account_sid,
              accountName: connection.integration_name,
              expiresAt: connection.token_expires_at,
            },
          }
        }
        return integration
      })

      setIntegrations(updatedIntegrations)
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBuyNow = (integration: Integration) => {
    if (integration.buyUrl) {
      window.open(integration.buyUrl, '_blank')
      toast.info(`Opening ${integration.name} signup page...`)
    }
  }

  const handleConnectOAuth = async (integration: Integration) => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) {
      toast.error('Please select an organization first')
      return
    }

    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    try {
      // Initiate OAuth flow
      const response = await fetch(`/api/integrations/${integration.type}/oauth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      const data = await response.json()

      if (data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl
      } else {
        toast.error(data.error || 'Failed to initiate OAuth')
      }
    } catch (error) {
      console.error('OAuth initiation error:', error)
      toast.error('Failed to connect. Please try again.')
    }
  }

  const handleConnectApiKey = (integration: Integration) => {
    setSelectedIntegration(integration)
    setShowApiKeyDialog(true)
    // Reset form based on integration type
    setApiKeyData({})
  }

  const handleSaveApiKey = async () => {
    if (!selectedIntegration) return
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) {
      toast.error('Please select an organization first')
      return
    }

    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    try {
      const response = await fetch(`/api/integrations/${selectedIntegration.type}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          credentials: apiKeyData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${selectedIntegration.name} connected successfully!`)
        setShowApiKeyDialog(false)
        setApiKeyData({})
        loadIntegrations()
      } else {
        toast.error(data.error || 'Failed to connect')
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to connect. Please try again.')
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) return

    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    if (!confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integration.type}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (response.ok) {
        toast.success(`${integration.name} disconnected`)
        loadIntegrations()
      } else {
        toast.error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect')
    }
  }

  const getStatusBadge = (integration: Integration) => {
    switch (integration.status) {
      case 'connected':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      case 'expiring_soon':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expiring Soon
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Not Connected
          </Badge>
        )
    }
  }

  const filteredIntegrations = activeTab === 'all' 
    ? integrations 
    : integrations.filter(i => i.category === activeTab)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Connect your accounts or buy new services. Each organization manages their own integrations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {integration.icon}
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                    {getStatusBadge(integration)}
                  </div>
                  <CardDescription className="mt-2">
                    {integration.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {integration.configured && integration.credentials?.accountName && (
                      <div className="text-sm text-muted-foreground">
                        Account: {integration.credentials.accountName}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {integration.configured ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDisconnect(integration)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Disconnect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadIntegrations()}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {integration.buyUrl && (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleBuyNow(integration)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Buy Now
                            </Button>
                          )}
                          {integration.authMethod === 'oauth' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleConnectOAuth(integration)}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Connect
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleConnectApiKey(integration)}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Link Account
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {integration.docsUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(integration.docsUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Documentation
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Enter your {selectedIntegration?.name} credentials to connect your account.
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration?.type === 'twilio_sms' || selectedIntegration?.type === 'twilio_whatsapp' || selectedIntegration?.type === 'twilio_voice' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Account SID</Label>
                <Input
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKeyData.accountSid || ''}
                  onChange={(e) => setApiKeyData({ ...apiKeyData, accountSid: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Auth Token</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Your auth token"
                    value={apiKeyData.authToken || ''}
                    onChange={(e) => setApiKeyData({ ...apiKeyData, authToken: e.target.value })}
                  />
                </div>
              </div>
              {(selectedIntegration.type === 'twilio_sms' || selectedIntegration.type === 'twilio_voice') && (
                <div className="space-y-2">
                  <Label>Phone Number / Messaging Service SID</Label>
                  <Input
                    placeholder="+1234567890 or MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKeyData.fromNumber || ''}
                    onChange={(e) => setApiKeyData({ ...apiKeyData, fromNumber: e.target.value })}
                  />
                </div>
              )}
              {selectedIntegration.type === 'twilio_whatsapp' && (
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input
                    placeholder="whatsapp:+14155238886"
                    value={apiKeyData.whatsappNumber || ''}
                    onChange={(e) => setApiKeyData({ ...apiKeyData, whatsappNumber: e.target.value })}
                  />
                </div>
              )}
            </div>
          ) : selectedIntegration?.type === 'sendgrid' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="SG.xxxxxxxxxxxx"
                    value={apiKeyData.apiKey || ''}
                    onChange={(e) => setApiKeyData({ ...apiKeyData, apiKey: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input
                  type="email"
                  placeholder="noreply@yourpractice.com"
                  value={apiKeyData.fromEmail || ''}
                  onChange={(e) => setApiKeyData({ ...apiKeyData, fromEmail: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey}>
              Connect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

