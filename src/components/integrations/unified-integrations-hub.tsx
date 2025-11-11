'use client'

/**
 * Unified Integrations Hub
 * 
 * SINGLE PLACE for ALL integrations
 * Replaces all scattered integration components
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2,
  ShoppingCart,
  Link2,
  Settings,
  Trash2,
  RefreshCw,
  PlayCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  TrendingUp,
  DollarSign,
  Filter,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ServiceStatusBadge } from './service-status-badge'
import { formatErrorForUser } from '@/lib/integrations/error-handler'
import { 
  ALL_INTEGRATIONS, 
  getIntegrationsByProvider, 
  getIntegrationsByCategory,
  getAllProviders,
  getAllCategories,
  getIntegrationIcon,
  type UnifiedIntegration 
} from '@/lib/integrations/integration-registry'
import { INTEGRATION_GROUPS } from '@/lib/integrations/unified-scopes'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, Eye, EyeOff } from 'lucide-react'

interface ProviderGroup {
  id: string
  name: string
  provider: string
  iconName: string
  integrations: UnifiedIntegration[]
  connected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error'
}

const PROVIDER_ICONS: Record<string, string> = {
  google: 'Settings',
  facebook: 'MessageSquare',
  microsoft: 'Mail',
  twilio: 'Phone',
  sendgrid: 'Mail',
  tiktok: 'PlayCircle',
}

export function UnifiedIntegrationsHub() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedIntegration, setSelectedIntegration] = useState<UnifiedIntegration | null>(null)
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

      // Update integration statuses
      const updatedIntegrations = ALL_INTEGRATIONS.map(integration => {
        const connection = connections?.find(c => c.integration_type === integration.type)
        if (connection) {
          return {
            ...integration,
            status: connection.status as UnifiedIntegration['status'],
            configured: connection.is_active,
          }
        }
        return integration
      })

      // Build provider groups
      const providers = getAllProviders()
      const providerGroups: ProviderGroup[] = providers.map(provider => {
        const providerIntegrations = getIntegrationsByProvider(provider)
        const groupConnections = connections?.filter(c => 
          providerIntegrations.some(i => i.type === c.integration_type)
        ) || []

        const hasConnection = groupConnections.some(c => c.is_active)
        const connectionStatus = hasConnection ? 'connected' : 'disconnected'

        return {
          id: provider,
          name: provider.charAt(0).toUpperCase() + provider.slice(1),
          provider,
          iconName: PROVIDER_ICONS[provider] || 'Settings',
          integrations: providerIntegrations.map(i => {
            const conn = groupConnections.find(c => c.integration_type === i.type)
            return {
              ...i,
              status: conn?.is_active ? 'connected' : 'disconnected',
              configured: conn?.is_active || false,
            }
          }),
          connected: hasConnection,
          connectionStatus,
        }
      })

      setProviderGroups(providerGroups)
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([])

  // Filter integrations based on search and category
  const filteredGroups = providerGroups.filter(group => {
    if (selectedCategory !== 'all') {
      const categoryIntegrations = getIntegrationsByCategory(selectedCategory as UnifiedIntegration['category'])
      const hasCategoryIntegration = group.integrations.some(i => 
        categoryIntegrations.some(ci => ci.id === i.id)
      )
      if (!hasCategoryIntegration) return false
    }

    if (searchQuery) {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.integrations.some(i => 
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      if (!matchesSearch) return false
    }

    return true
  })

  const handleConnectOAuth = async (integration: UnifiedIntegration) => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) {
      toast.error('Please select an organization first')
      return
    }

    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

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

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = formatErrorForUser(data.error || data)
        toast.error('Connection failed', {
          description: errorMessage,
          duration: 5000,
        })
        return
      }

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        const errorMessage = formatErrorForUser(data.error || 'Unknown error')
        toast.error('Connection failed', {
          description: errorMessage,
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('OAuth initiation error:', error)
      const errorMessage = formatErrorForUser(error)
      toast.error('Connection failed', {
        description: errorMessage,
        duration: 5000,
      })
    }
  }

  const handleConnectApiKey = (integration: UnifiedIntegration) => {
    setSelectedIntegration(integration)
    setWizardStep(1)
    setShowWizard(true)
    setApiKeyData({})
    setConnectionTestResult(null)
  }

  const testConnection = async () => {
    if (!selectedIntegration) return

    setTestingConnection(true)
    setConnectionTestResult(null)

    try {
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

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const categories = getAllCategories()
  const totalConnected = providerGroups.reduce((sum, group) => 
    sum + group.integrations.filter(i => i.configured).length, 0
  )
  const totalAvailable = ALL_INTEGRATIONS.length

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Unified Integration Hub</AlertTitle>
        <AlertDescription className="text-blue-800">
          Connect all your tools in one place. One connection per provider = All services from that provider ready to use!
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground mt-1">
            {totalConnected} of {totalAvailable} integrations connected
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Provider Groups */}
      <div className="space-y-4">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id)
          const connectedServices = group.integrations.filter(i => i.configured).length
          const totalServices = group.integrations.length

          return (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComponent = getIntegrationIcon(group.iconName)
                      return <IconComponent className="h-5 w-5" />
                    })()}
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {group.connected 
                          ? `${connectedServices} of ${totalServices} services connected`
                          : `${totalServices} services available - Connect once to access all`
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.connected ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Services List */}
                  {isExpanded && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Services:</h4>
                      {group.integrations.map((integration) => {
                        const IconComponent = getIntegrationIcon(integration.iconName)
                        return (
                        <div 
                          key={integration.id} 
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-5 w-5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{integration.name}</div>
                              <div className="text-xs text-muted-foreground">{integration.simpleDescription}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ServiceStatusBadge status={integration.status} />
                            {!integration.configured && (
                              integration.authMethod === 'oauth' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConnectOAuth(integration)}
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Connect
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConnectApiKey(integration)}
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Setup
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {group.connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGroup(group.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Hide Services
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              View Services
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadIntegrations()}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Check if provider has OAuth group */}
                        {INTEGRATION_GROUPS[group.provider] ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              // Use first OAuth integration
                              const oauthIntegration = group.integrations.find(i => i.authMethod === 'oauth')
                              if (oauthIntegration) {
                                handleConnectOAuth(oauthIntegration)
                              }
                            }}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Connect {group.name} (One-Click)
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => toggleGroup(group.id)}
                          >
                            <ChevronDown className="h-4 w-4 mr-2" />
                            View Services
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* API Key Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = getIntegrationIcon(selectedIntegration.iconName)
                    return <IconComponent className="h-5 w-5" />
                  })()}
                  Connect {selectedIntegration.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedIntegration.simpleDescription}
                </DialogDescription>
              </DialogHeader>

              {/* Wizard Steps */}
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
                        <CheckCircle2 className="h-4 w-4" />
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
                      Don't have a {selectedIntegration.name} account yet? No problem!
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
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Enter Credentials */}
              {(wizardStep === 2 || (!selectedIntegration.buyUrl && wizardStep === 1)) && selectedIntegration.apiKeyFields && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>Step {selectedIntegration.buyUrl ? 2 : 1}: Enter Your Credentials</AlertTitle>
                    <AlertDescription>
                      Don't worry - we'll help you find these! Each field has a help icon.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {selectedIntegration.apiKeyFields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>{field.label}</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{field.help}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {field.type === 'password' ? (
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder={field.placeholder}
                              value={apiKeyData[field.key] || ''}
                              onChange={(e) => setApiKeyData({ ...apiKeyData, [field.key]: e.target.value })}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const input = document.querySelector(`input[type="password"][placeholder="${field.placeholder}"]`) as HTMLInputElement
                                if (input) input.type = input.type === 'password' ? 'text' : 'password'
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Input
                            type={field.type || 'text'}
                            placeholder={field.placeholder}
                            value={apiKeyData[field.key] || ''}
                            onChange={(e) => setApiKeyData({ ...apiKeyData, [field.key]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Webhook Instructions */}
                  {selectedIntegration.webhookUrl && (
                    <Alert className="border-purple-200 bg-purple-50">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                      <AlertTitle className="text-purple-900">Webhook Setup Required</AlertTitle>
                      <AlertDescription className="text-purple-800">
                        <p className="mb-2">Set this webhook URL in your {selectedIntegration.name} dashboard:</p>
                        <code className="bg-purple-100 px-2 py-1 rounded text-sm">
                          {typeof window !== 'undefined' ? window.location.origin : ''}{selectedIntegration.webhookUrl}
                        </code>
                        {selectedIntegration.webhookInstructions && (
                          <p className="mt-2 text-xs">{selectedIntegration.webhookInstructions}</p>
                        )}
                      </AlertDescription>
                    </Alert>
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
                      <CheckCircle2 className="h-4 w-4 ml-2" />
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
                      <AlertCircle className="h-4 w-4 text-red-600" />
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

