'use client'

/**
 * User-Friendly Integration Management Hub
 * 
 * Designed for non-technical users with:
 * - Step-by-step wizards
 * - Plain English instructions
 * - Visual guides
 * - Auto-testing
 * - Help videos
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
  RefreshCw,
  HelpCircle,
  PlayCircle,
  ChevronRight,
  Check,
  X,
  Sparkles
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Integration {
  id: string
  type: string
  name: string
  category: 'communications' | 'social' | 'analytics' | 'other'
  status: 'connected' | 'disconnected' | 'error' | 'expiring_soon'
  authMethod: 'oauth' | 'api_key' | 'both'
  buyUrl?: string
  docsUrl?: string
  helpVideoUrl?: string
  icon: React.ReactNode
  description: string
  configured: boolean
  simpleDescription: string // Plain English explanation
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
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send and receive SMS messages',
    simpleDescription: 'Send text messages to your patients directly from the CRM',
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
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send WhatsApp Business messages',
    simpleDescription: 'Send WhatsApp messages to patients - they prefer this over SMS!',
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
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <Phone className="h-5 w-5" />,
    description: 'Make and receive phone calls',
    simpleDescription: 'Make phone calls directly from the CRM - no need to use your phone!',
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
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send transactional and marketing emails',
    simpleDescription: 'Send professional emails to patients - appointment reminders, newsletters, and more',
    configured: false,
  },
  {
    id: 'gmail',
    type: 'gmail',
    name: 'Gmail',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'oauth',
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send emails via Gmail account',
    simpleDescription: 'Use your existing Gmail account to send emails from the CRM',
    configured: false,
  },
  {
    id: 'outlook',
    type: 'outlook',
    name: 'Outlook',
    category: 'communications',
    status: 'disconnected',
    authMethod: 'oauth',
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send emails via Outlook account',
    simpleDescription: 'Use your existing Outlook account to send emails from the CRM',
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
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Manage Facebook pages and ads',
    simpleDescription: 'Post to your Facebook page and manage ads - all from one place',
    configured: false,
  },
  {
    id: 'instagram',
    type: 'instagram',
    name: 'Instagram',
    category: 'social',
    status: 'disconnected',
    authMethod: 'oauth',
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Manage Instagram business account',
    simpleDescription: 'Post to Instagram and respond to messages - grow your social presence',
    configured: false,
  },
  {
    id: 'tiktok',
    type: 'tiktok',
    name: 'TikTok',
    category: 'social',
    status: 'disconnected',
    authMethod: 'oauth',
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Manage TikTok business account',
    simpleDescription: 'Manage your TikTok content and engage with followers',
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
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <Settings className="h-5 w-5" />,
    description: 'Track website analytics',
    simpleDescription: 'See how many people visit your website and what they do there',
    configured: false,
  },
  {
    id: 'google_ads',
    type: 'google_ads',
    name: 'Google Ads',
    category: 'analytics',
    status: 'disconnected',
    authMethod: 'oauth',
    helpVideoUrl: 'https://www.youtube.com/watch?v=example',
    icon: <Settings className="h-5 w-5" />,
    description: 'Manage Google Ads campaigns',
    simpleDescription: 'See how your Google Ads are performing and which ones bring in patients',
    configured: false,
  },
]

export function IntegrationsHubUserFriendly() {
  const { appUser } = useAuth()
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [apiKeyData, setApiKeyData] = useState<Record<string, string>>({})
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    loadIntegrations()
  }, [appUser])

  const loadIntegrations = async () => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) return

    setLoading(true)
    const supabase = createClient()
    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    try {
      const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('tenant_id', tenantId)

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

  const startWizard = (integration: Integration, step: 'buy' | 'link') => {
    setSelectedIntegration(integration)
    setWizardStep(step === 'buy' ? 1 : 2)
    setShowWizard(true)
    setApiKeyData({})
    setConnectionTestResult(null)
  }

  const handleBuyNow = (integration: Integration) => {
    startWizard(integration, 'buy')
  }

  const handleConnectOAuth = async (integration: Integration) => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) {
      toast.error('Please select an organization first')
      return
    }

    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    // Show friendly message explaining what's happening
    toast.info(`Connecting ${integration.name}...`, {
      description: 'You\'ll be redirected to approve access. Just click "Allow" and you\'ll be back!',
      duration: 3000,
    })

    try {
      const response = await fetch(`/api/integrations/${integration.type}/oauth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      const data = await response.json()

      if (data.authUrl) {
        // ONE-CLICK: Immediately redirect to provider's permission page
        // User approves → Automatically redirected back → Connection complete!
        window.location.href = data.authUrl
      } else {
        toast.error('Oops! Something went wrong', {
          description: 'Please try again or contact support if this continues.',
        })
      }
    } catch (error) {
      console.error('OAuth initiation error:', error)
      toast.error('Connection failed', {
        description: 'Please try again. If this keeps happening, contact our support team.',
      })
    }
  }

  const handleLinkAccount = (integration: Integration) => {
    startWizard(integration, 'link')
  }

  const testConnection = async () => {
    if (!selectedIntegration) return

    setTestingConnection(true)
    setConnectionTestResult(null)

    try {
      // Simulate test - in production, actually test the connection
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In production, call actual test endpoint
      const response = await fetch(`/api/integrations/${selectedIntegration.type}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: appUser?.active_tenant_id || appUser?.tenant_id,
          credentials: apiKeyData,
        }),
      })

      if (response.ok) {
        setConnectionTestResult('success')
        toast.success('Connection successful!', {
          description: 'Your account is ready to use.',
        })
      } else {
        setConnectionTestResult('error')
        toast.error('Connection test failed', {
          description: 'Please check your credentials and try again.',
        })
      }
    } catch (error) {
      setConnectionTestResult('error')
      toast.error('Test failed', {
        description: 'Please check your internet connection and try again.',
      })
    } finally {
      setTestingConnection(false)
    }
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
        toast.success('Successfully connected!', {
          description: `${selectedIntegration.name} is now ready to use.`,
        })
        setShowWizard(false)
        setApiKeyData({})
        setConnectionTestResult(null)
        loadIntegrations()
      } else {
        toast.error('Connection failed', {
          description: data.error || 'Please check your credentials and try again.',
        })
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Something went wrong', {
        description: 'Please try again or contact support if this continues.',
      })
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) return

    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    if (!confirm(`Disconnect ${integration.name}? You can reconnect anytime.`)) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integration.type}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (response.ok) {
        toast.success('Disconnected', {
          description: `${integration.name} has been disconnected.`,
        })
        loadIntegrations()
      } else {
        toast.error('Failed to disconnect', {
          description: 'Please try again.',
        })
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Something went wrong', {
        description: 'Please try again.',
      })
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

  const getFieldLabels = (type: string, field: string): { label: string; help: string; placeholder: string } => {
    const labels: Record<string, Record<string, { label: string; help: string; placeholder: string }>> = {
      twilio_sms: {
        accountSid: {
          label: 'Your Twilio Account ID',
          help: 'This is like your username. Find it in your Twilio dashboard under Account Info.',
          placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
        authToken: {
          label: 'Your Twilio Secret Key',
          help: 'This is like your password. Keep it secret! Find it in your Twilio dashboard.',
          placeholder: 'Your secret key',
        },
        fromNumber: {
          label: 'Your Phone Number',
          help: 'The phone number you bought from Twilio. Format: +1234567890',
          placeholder: '+1234567890',
        },
      },
      twilio_whatsapp: {
        accountSid: {
          label: 'Your Twilio Account ID',
          help: 'Find this in your Twilio dashboard under Account Info.',
          placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
        authToken: {
          label: 'Your Twilio Secret Key',
          help: 'Keep this secret! Find it in your Twilio dashboard.',
          placeholder: 'Your secret key',
        },
        whatsappNumber: {
          label: 'Your WhatsApp Number',
          help: 'Format: whatsapp:+1234567890 (include the "whatsapp:" prefix)',
          placeholder: 'whatsapp:+1234567890',
        },
      },
      twilio_voice: {
        accountSid: {
          label: 'Your Twilio Account ID',
          help: 'Find this in your Twilio dashboard under Account Info.',
          placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
        authToken: {
          label: 'Your Twilio Secret Key',
          help: 'Keep this secret! Find it in your Twilio dashboard.',
          placeholder: 'Your secret key',
        },
        fromNumber: {
          label: 'Your Phone Number',
          help: 'The phone number you bought from Twilio for making calls.',
          placeholder: '+1234567890',
        },
      },
      sendgrid: {
        apiKey: {
          label: 'Your SendGrid API Key',
          help: 'Create one in SendGrid: Settings → API Keys → Create API Key. Give it "Full Access".',
          placeholder: 'SG.xxxxxxxxxxxx',
        },
        fromEmail: {
          label: 'Your Email Address',
          help: 'The email address you want to send from (e.g., noreply@yourpractice.com)',
          placeholder: 'noreply@yourpractice.com',
        },
      },
    }

    return labels[type]?.[field] || { label: field, help: '', placeholder: '' }
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
      {/* Welcome Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Connect Your Favorite Tools</AlertTitle>
        <AlertDescription className="text-blue-800">
          No technical knowledge needed! We'll guide you through each step. Most connections take less than 2 minutes.
        </AlertDescription>
      </Alert>

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
              <Card key={integration.id} className="relative hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {integration.icon}
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                    {getStatusBadge(integration)}
                  </div>
                  <CardDescription className="mt-2">
                    {integration.simpleDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {integration.configured && integration.credentials?.accountName && (
                      <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                        <strong>Account:</strong> {integration.credentials.accountName}
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
                              Get Started
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
                              onClick={() => handleLinkAccount(integration)}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Link Account
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {integration.helpVideoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(integration.helpVideoUrl, '_blank')}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Watch Tutorial
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Step-by-Step Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedIntegration.icon}
                  Connect {selectedIntegration.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedIntegration.simpleDescription}
                </DialogDescription>
              </DialogHeader>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2",
                      wizardStep >= step 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : "border-gray-300 text-gray-400"
                    )}>
                      {wizardStep > step ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{step}</span>
                      )}
                    </div>
                    {step < 3 && (
                      <div className={cn(
                        "flex-1 h-0.5 mx-2",
                        wizardStep > step ? "bg-blue-600" : "bg-gray-300"
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Buy Account (if applicable) */}
              {wizardStep === 1 && selectedIntegration.buyUrl && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>Step 1: Get Your Account</AlertTitle>
                    <AlertDescription>
                      Don't have a {selectedIntegration.name} account yet? No problem! We'll help you get one.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">What you'll do:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                        <li>Click "Open Signup Page" below</li>
                        <li>Create your account (takes 2-3 minutes)</li>
                        <li>Get your credentials from your dashboard</li>
                        <li>Come back here and click "I Have My Account"</li>
                      </ol>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => {
                          window.open(selectedIntegration.buyUrl, '_blank')
                          toast.info('Opened signup page', {
                            description: 'After you create your account, come back and click "I Have My Account"',
                          })
                        }}
                      >
                        Open Signup Page
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setWizardStep(2)}
                      >
                        I Have My Account
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Enter Credentials */}
              {(wizardStep === 2 || (!selectedIntegration.buyUrl && wizardStep === 1)) && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>Step {selectedIntegration.buyUrl ? 2 : 1}: Enter Your Credentials</AlertTitle>
                    <AlertDescription>
                      Don't worry - we'll help you find these! Each field has a help icon.
                    </AlertDescription>
                  </Alert>

                  {selectedIntegration.type === 'twilio_sms' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>{getFieldLabels('twilio_sms', 'accountSid').label}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{getFieldLabels('twilio_sms', 'accountSid').help}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          placeholder={getFieldLabels('twilio_sms', 'accountSid').placeholder}
                          value={apiKeyData.accountSid || ''}
                          onChange={(e) => setApiKeyData({ ...apiKeyData, accountSid: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>{getFieldLabels('twilio_sms', 'authToken').label}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{getFieldLabels('twilio_sms', 'authToken').help}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder={getFieldLabels('twilio_sms', 'authToken').placeholder}
                            value={apiKeyData.authToken || ''}
                            onChange={(e) => setApiKeyData({ ...apiKeyData, authToken: e.target.value })}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const input = document.querySelector('input[type="password"]') as HTMLInputElement
                              if (input) input.type = input.type === 'password' ? 'text' : 'password'
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>{getFieldLabels('twilio_sms', 'fromNumber').label}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{getFieldLabels('twilio_sms', 'fromNumber').help}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          placeholder={getFieldLabels('twilio_sms', 'fromNumber').placeholder}
                          value={apiKeyData.fromNumber || ''}
                          onChange={(e) => setApiKeyData({ ...apiKeyData, fromNumber: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {selectedIntegration.type === 'sendgrid' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>{getFieldLabels('sendgrid', 'apiKey').label}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{getFieldLabels('sendgrid', 'apiKey').help}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          type="password"
                          placeholder={getFieldLabels('sendgrid', 'apiKey').placeholder}
                          value={apiKeyData.apiKey || ''}
                          onChange={(e) => setApiKeyData({ ...apiKeyData, apiKey: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>{getFieldLabels('sendgrid', 'fromEmail').label}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{getFieldLabels('sendgrid', 'fromEmail').help}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          type="email"
                          placeholder={getFieldLabels('sendgrid', 'fromEmail').placeholder}
                          value={apiKeyData.fromEmail || ''}
                          onChange={(e) => setApiKeyData({ ...apiKeyData, fromEmail: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Test Connection Button */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="flex-1"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSaveApiKey}
                      disabled={testingConnection || connectionTestResult === 'error'}
                      className="flex-1"
                    >
                      Save & Connect
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>

                  {connectionTestResult === 'success' && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-900">Connection Successful!</AlertTitle>
                      <AlertDescription className="text-green-800">
                        Your credentials are correct. Click "Save & Connect" to finish.
                      </AlertDescription>
                    </Alert>
                  )}

                  {connectionTestResult === 'error' && (
                    <Alert className="border-red-200 bg-red-50">
                      <X className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-900">Connection Failed</AlertTitle>
                      <AlertDescription className="text-red-800">
                        Please check your credentials. Make sure you copied them correctly from your account dashboard.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

