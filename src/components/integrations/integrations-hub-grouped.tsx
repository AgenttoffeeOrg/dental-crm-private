'use client'

/**
 * Grouped Integration Hub
 * 
 * Shows integrations grouped by provider (Google, Facebook, Microsoft)
 * One connection per provider = All services from that provider
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  ShoppingCart,
  Link2,
  Settings,
  Trash2,
  RefreshCw,
  PlayCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ServiceStatusBadge } from './service-status-badge'
import { INTEGRATION_GROUPS } from '@/lib/integrations/unified-scopes'
import { formatErrorForUser } from '@/lib/integrations/error-handler'

interface Service {
  id: string
  type: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'connected' | 'pending_verification' | 'missing_scopes' | 'available'
}

interface ProviderGroup {
  id: string
  name: string
  provider: string
  icon: React.ReactNode
  services: Service[]
  connected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error'
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google: <Settings className="h-5 w-5" />,
  facebook: <MessageSquare className="h-5 w-5" />,
  microsoft: <Mail className="h-5 w-5" />,
}

export function IntegrationsHubGrouped() {
  const { appUser } = useAuth()
  const [groups, setGroups] = useState<ProviderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    loadIntegrations()
  }, [appUser])

  const loadIntegrations = async () => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) return

    setLoading(true)
    const supabase = createClient()
    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

    try {
      // Load all connections
      const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('tenant_id', tenantId)

      // Build provider groups
      const providerGroups: ProviderGroup[] = Object.entries(INTEGRATION_GROUPS).map(([key, group]) => {
        const groupConnections = connections?.filter(c => 
          group.services.includes(c.integration_type)
        ) || []

        const services: Service[] = group.services.map(serviceType => {
          const connection = groupConnections.find(c => c.integration_type === serviceType)
          
          // Map service types to names and icons
          const serviceInfo: Record<string, { name: string; icon: React.ReactNode; description: string }> = {
            gmail: { name: 'Gmail', icon: <Mail className="h-4 w-4" />, description: 'Send emails' },
            google_analytics: { name: 'Analytics', icon: <Settings className="h-4 w-4" />, description: 'Track website' },
            google_ads: { name: 'Ads', icon: <Settings className="h-4 w-4" />, description: 'Manage campaigns' },
            google_calendar: { name: 'Calendar', icon: <Settings className="h-4 w-4" />, description: 'Schedule appointments' },
            facebook_pages: { name: 'Pages', icon: <MessageSquare className="h-4 w-4" />, description: 'Manage pages' },
            facebook_ads: { name: 'Ads', icon: <MessageSquare className="h-4 w-4" />, description: 'Run ads' },
            instagram: { name: 'Instagram', icon: <MessageSquare className="h-4 w-4" />, description: 'Post content' },
            outlook: { name: 'Outlook', icon: <Mail className="h-4 w-4" />, description: 'Send emails' },
            onedrive: { name: 'OneDrive', icon: <Settings className="h-4 w-4" />, description: 'Store files' },
            microsoft_calendar: { name: 'Calendar', icon: <Settings className="h-4 w-4" />, description: 'Schedule appointments' },
          }

          const info = serviceInfo[serviceType] || { name: serviceType, icon: <Settings className="h-4 w-4" />, description: '' }

          return {
            id: serviceType,
            type: serviceType,
            name: info.name,
            description: info.description,
            icon: info.icon,
            status: connection?.is_active 
              ? 'connected' 
              : connection?.status === 'error'
              ? 'missing_scopes'
              : 'available',
          }
        })

        const hasConnection = groupConnections.some(c => c.is_active)
        const connectionStatus = hasConnection ? 'connected' : 'disconnected'

        return {
          id: key,
          name: group.name,
          provider: group.provider,
          icon: PROVIDER_ICONS[group.provider] || <Settings className="h-5 w-5" />,
          services,
          connected: hasConnection,
          connectionStatus,
        }
      })

      setGroups(providerGroups)
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectProvider = async (provider: string) => {
    if (!appUser?.active_tenant_id && !appUser?.tenant_id) {
      toast.error('Please select an organization first')
      return
    }

    const group = INTEGRATION_GROUPS[provider]
    if (!group) return

    // Use the first service type to initiate OAuth
    // Unified OAuth will request all scopes
    const firstService = group.services[0]

    toast.info(`Connecting ${group.name}...`, {
      description: 'You\'ll be redirected to approve access. Just click "Allow" and you\'ll be back!',
      duration: 3000,
    })

    try {
      const response = await fetch(`/api/integrations/${firstService}/oauth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tenantId: appUser?.active_tenant_id || appUser?.tenant_id 
        }),
      })

      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        const errorMessage = formatErrorForUser(data.error || error)
        toast.error('Connection failed', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('OAuth initiation error:', error)
      const errorMessage = formatErrorForUser(error)
      toast.error('Connection failed', {
        description: errorMessage,
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Connect Your Tools</AlertTitle>
        <AlertDescription className="text-blue-800">
          Connect once per provider to access all their services. One approval = multiple services ready!
        </AlertDescription>
      </Alert>

      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Connect your accounts. Each provider connection gives you access to all their services.
        </p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id)
          const connectedServices = group.services.filter(s => s.status === 'connected').length
          const totalServices = group.services.length

          return (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {group.icon}
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {group.connected 
                          ? `${connectedServices} of ${totalServices} services connected`
                          : `Connect once to access ${totalServices} services`
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
                      {group.services.map((service) => (
                        <div 
                          key={service.id} 
                          className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            {service.icon}
                            <div>
                              <div className="text-sm font-medium">{service.name}</div>
                              <div className="text-xs text-muted-foreground">{service.description}</div>
                            </div>
                          </div>
                          <ServiceStatusBadge status={service.status} />
                        </div>
                      ))}
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
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnectProvider(group.provider)}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect {group.name}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

