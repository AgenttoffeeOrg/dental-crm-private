'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Zap,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Users,
  Calendar,
  Star,
  MapPin,
  Camera,
  Video,
  Smartphone,
  Monitor,
  Headphones,
  FileText,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import type { LeadSource } from '@/types/database'

interface IntegrationConfig {
  id: string
  name: string
  description: string
  category: 'advertising' | 'social' | 'communication' | 'website' | 'review' | 'scheduling' | 'other'
  icon: React.ReactNode
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  popularity: 'high' | 'medium' | 'low'
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'password' | 'url' | 'select' | 'textarea'
    placeholder?: string
    required?: boolean
    options?: string[]
    description?: string
  }>
  webhookUrl?: string
  documentation?: string
  features: string[]
  estimatedSetupTime: string
  difficulty: 'easy' | 'medium' | 'advanced'
}

const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  // Advertising Platforms
  {
    id: 'facebook_ads',
    name: 'Facebook Ads',
    description: 'Capture leads from Facebook advertising campaigns automatically',
    category: 'advertising',
    icon: <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">f</div>,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '10-15 minutes',
    difficulty: 'medium',
    features: ['Lead forms', 'Campaign tracking', 'Auto-categorization', 'Cost per lead'],
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'Long-lived access token from Facebook Business' },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true, placeholder: 'act_1234567890' },
      { key: 'page_id', label: 'Facebook Page ID', type: 'text', required: true },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'text', required: true, description: 'Custom token for webhook verification' }
    ],
    webhookUrl: '/api/webhooks/facebook-ads',
    documentation: 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads'
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Import leads from Google Ads campaigns and track conversions',
    category: 'advertising',
    icon: <Search className="w-8 h-8 text-blue-500" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '15-20 minutes',
    difficulty: 'advanced',
    features: ['Lead extensions', 'Conversion tracking', 'Keyword analysis', 'Quality score'],
    fields: [
      { key: 'customer_id', label: 'Customer ID', type: 'text', required: true, placeholder: '123-456-7890' },
      { key: 'developer_token', label: 'Developer Token', type: 'password', required: true },
      { key: 'client_id', label: 'OAuth Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ],
    webhookUrl: '/api/webhooks/google-ads',
    documentation: 'https://developers.google.com/google-ads/api/docs/start'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Capture leads from Instagram ads and direct messages',
    category: 'social',
    icon: <Camera className="w-8 h-8 text-pink-500" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '10 minutes',
    difficulty: 'medium',
    features: ['Lead ads', 'DM automation', 'Story leads', 'Profile visits'],
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', required: true },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'text', required: true }
    ],
    webhookUrl: '/api/webhooks/instagram',
    documentation: 'https://developers.facebook.com/docs/instagram-api/'
  },

  // Communication Platforms
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business',
    description: 'Manage patient communications and capture leads via WhatsApp',
    category: 'communication',
    icon: <MessageSquare className="w-8 h-8 text-green-500" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '20-30 minutes',
    difficulty: 'advanced',
    features: ['Message automation', 'Appointment reminders', 'Lead qualification', 'Media sharing'],
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'text', required: true },
      { key: 'business_account_id', label: 'WhatsApp Business Account ID', type: 'text', required: true }
    ],
    webhookUrl: '/api/webhooks/whatsapp',
    documentation: 'https://developers.facebook.com/docs/whatsapp/cloud-api'
  },
  {
    id: 'email_marketing',
    name: 'Email Marketing',
    description: 'Connect with Mailchimp, Constant Contact, or custom SMTP',
    category: 'communication',
    icon: <Mail className="w-8 h-8 text-blue-600" />,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '5-10 minutes',
    difficulty: 'easy',
    features: ['Newsletter signups', 'Drip campaigns', 'Email tracking', 'Segmentation'],
    fields: [
      { key: 'provider', label: 'Email Provider', type: 'select', required: true, options: ['Mailchimp', 'Constant Contact', 'SendGrid', 'Custom SMTP'] },
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'list_id', label: 'Mailing List ID', type: 'text', required: false },
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: false, placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'text', required: false, placeholder: '587' }
    ],
    documentation: 'https://mailchimp.com/developer/marketing/api/'
  },
  {
    id: 'sms_marketing',
    name: 'SMS Marketing',
    description: 'Connect with Twilio, TextMagic, or other SMS providers',
    category: 'communication',
    icon: <Smartphone className="w-8 h-8 text-purple-500" />,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '10 minutes',
    difficulty: 'easy',
    features: ['Appointment reminders', 'Marketing campaigns', 'Two-way messaging', 'Opt-out management'],
    fields: [
      { key: 'provider', label: 'SMS Provider', type: 'select', required: true, options: ['Twilio', 'TextMagic', 'Clickatell', 'MessageBird'] },
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'phone_number', label: 'SMS Phone Number', type: 'text', required: true, placeholder: '+1234567890' }
    ],
    documentation: 'https://www.twilio.com/docs/sms'
  },

  // Website & Forms
  {
    id: 'website_forms',
    name: 'Website Contact Forms',
    description: 'Capture leads from your website contact forms automatically',
    category: 'website',
    icon: <Globe className="w-8 h-8 text-green-600" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '5 minutes',
    difficulty: 'easy',
    features: ['Form submissions', 'Page tracking', 'UTM parameters', 'Spam filtering'],
    fields: [
      { key: 'website_url', label: 'Website URL', type: 'url', required: true, placeholder: 'https://yourpractice.com' },
      { key: 'form_selectors', label: 'Form CSS Selectors', type: 'textarea', required: false, description: 'CSS selectors for contact forms (optional)' }
    ],
    webhookUrl: '/api/webhooks/website-forms'
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Connect with WordPress sites using Contact Form 7, Gravity Forms, etc.',
    category: 'website',
    icon: <Monitor className="w-8 h-8 text-blue-700" />,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '10 minutes',
    difficulty: 'easy',
    features: ['Plugin integration', 'Form builder support', 'SEO tracking', 'Content management'],
    fields: [
      { key: 'site_url', label: 'WordPress Site URL', type: 'url', required: true },
      { key: 'api_key', label: 'REST API Key', type: 'password', required: true },
      { key: 'form_plugin', label: 'Form Plugin', type: 'select', required: true, options: ['Contact Form 7', 'Gravity Forms', 'WPForms', 'Ninja Forms'] }
    ],
    documentation: 'https://developer.wordpress.org/rest-api/'
  },

  // Review Platforms
  {
    id: 'google_reviews',
    name: 'Google Reviews',
    description: 'Monitor and respond to Google Business reviews automatically',
    category: 'review',
    icon: <Star className="w-8 h-8 text-amber-500" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '15 minutes',
    difficulty: 'medium',
    features: ['Review monitoring', 'Response automation', 'Rating alerts', 'Reputation tracking'],
    fields: [
      { key: 'business_account_id', label: 'Google Business Account ID', type: 'text', required: true },
      { key: 'location_id', label: 'Location ID', type: 'text', required: true },
      { key: 'service_account_key', label: 'Service Account Key (JSON)', type: 'textarea', required: true }
    ],
    documentation: 'https://developers.google.com/my-business/reference/rest'
  },
  {
    id: 'facebook_reviews',
    name: 'Facebook Reviews',
    description: 'Track Facebook page reviews and recommendations',
    category: 'review',
    icon: <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">f</div>,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '10 minutes',
    difficulty: 'easy',
    features: ['Page reviews', 'Recommendations', 'Check-ins', 'Social proof'],
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', type: 'password', required: true },
      { key: 'page_id', label: 'Facebook Page ID', type: 'text', required: true }
    ],
    documentation: 'https://developers.facebook.com/docs/pages/access-tokens'
  },

  // Scheduling Platforms
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Sync appointment bookings and capture lead information',
    category: 'scheduling',
    icon: <Calendar className="w-8 h-8 text-blue-500" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '5 minutes',
    difficulty: 'easy',
    features: ['Appointment sync', 'Lead capture', 'Automated reminders', 'No-show tracking'],
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'organization_uri', label: 'Organization URI', type: 'text', required: true, placeholder: 'https://api.calendly.com/organizations/AAAA' }
    ],
    webhookUrl: '/api/webhooks/calendly',
    documentation: 'https://developer.calendly.com/api-docs'
  },
  {
    id: 'acuity_scheduling',
    name: 'Acuity Scheduling',
    description: 'Connect with Acuity for advanced appointment management',
    category: 'scheduling',
    icon: <Calendar className="w-8 h-8 text-purple-500" />,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '10 minutes',
    difficulty: 'medium',
    features: ['Advanced scheduling', 'Package bookings', 'Payment integration', 'Custom forms'],
    fields: [
      { key: 'user_id', label: 'User ID', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ],
    webhookUrl: '/api/webhooks/acuity',
    documentation: 'https://developers.acuityscheduling.com/'
  },

  // Other Platforms
  {
    id: 'tiktok_ads',
    name: 'TikTok Ads',
    description: 'Capture leads from TikTok advertising campaigns',
    category: 'advertising',
    icon: <Video className="w-8 h-8 text-black" />,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '15 minutes',
    difficulty: 'medium',
    features: ['Video ad leads', 'Spark ads', 'Brand takeovers', 'Hashtag challenges'],
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'advertiser_id', label: 'Advertiser ID', type: 'text', required: true },
      { key: 'app_id', label: 'App ID', type: 'text', required: true }
    ],
    documentation: 'https://ads.tiktok.com/marketing_api/docs'
  },
  {
    id: 'linkedin_ads',
    name: 'LinkedIn Ads',
    description: 'Professional network advertising for dental services',
    category: 'advertising',
    icon: <Users className="w-8 h-8 text-blue-700" />,
    status: 'disconnected',
    popularity: 'low',
    estimatedSetupTime: '20 minutes',
    difficulty: 'advanced',
    features: ['Professional targeting', 'Lead gen forms', 'Sponsored content', 'Message ads'],
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true },
      { key: 'organization_id', label: 'Organization ID', type: 'text', required: true }
    ],
    documentation: 'https://docs.microsoft.com/en-us/linkedin/marketing/'
  },
  {
    id: 'yelp',
    name: 'Yelp Business',
    description: 'Monitor Yelp reviews and capture business inquiries',
    category: 'review',
    icon: <MapPin className="w-8 h-8 text-red-500" />,
    status: 'disconnected',
    popularity: 'medium',
    estimatedSetupTime: '10 minutes',
    difficulty: 'easy',
    features: ['Review monitoring', 'Business messages', 'Check-ins', 'Photos'],
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'business_id', label: 'Business ID', type: 'text', required: true }
    ],
    documentation: 'https://www.yelp.com/developers/documentation/v3'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps through Zapier automation',
    category: 'other',
    icon: <Zap className="w-8 h-8 text-orange-500" />,
    status: 'disconnected',
    popularity: 'high',
    estimatedSetupTime: '5 minutes',
    difficulty: 'easy',
    features: ['5000+ app connections', 'Custom workflows', 'Multi-step automation', 'Conditional logic'],
    fields: [
      { key: 'webhook_url', label: 'Zapier Webhook URL', type: 'url', required: true, description: 'Create a webhook trigger in Zapier and paste the URL here' }
    ],
    documentation: 'https://zapier.com/developer/documentation/v2/reference/'
  },
  {
    id: 'microsoft_ads',
    name: 'Microsoft Advertising',
    description: 'Bing Ads lead capture and conversion tracking',
    category: 'advertising',
    icon: <Search className="w-8 h-8 text-blue-600" />,
    status: 'disconnected',
    popularity: 'low',
    estimatedSetupTime: '15 minutes',
    difficulty: 'medium',
    features: ['Bing search ads', 'Audience targeting', 'Conversion tracking', 'Shopping campaigns'],
    fields: [
      { key: 'developer_token', label: 'Developer Token', type: 'password', required: true },
      { key: 'customer_id', label: 'Customer ID', type: 'text', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', required: true }
    ],
    documentation: 'https://docs.microsoft.com/en-us/advertising/guides/'
  }
]

interface IntegrationsHubProps {
  tenantId?: string
}

export function IntegrationsHub({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: IntegrationsHubProps) {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(INTEGRATION_CONFIGS)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null)
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  const categories = [
    { id: 'all', name: 'All Integrations', count: integrations.length },
    { id: 'advertising', name: 'Advertising', count: integrations.filter(i => i.category === 'advertising').length },
    { id: 'social', name: 'Social Media', count: integrations.filter(i => i.category === 'social').length },
    { id: 'communication', name: 'Communication', count: integrations.filter(i => i.category === 'communication').length },
    { id: 'website', name: 'Website', count: integrations.filter(i => i.category === 'website').length },
    { id: 'review', name: 'Reviews', count: integrations.filter(i => i.category === 'review').length },
    { id: 'scheduling', name: 'Scheduling', count: integrations.filter(i => i.category === 'scheduling').length },
    { id: 'other', name: 'Other', count: integrations.filter(i => i.category === 'other').length },
  ]

  const filteredIntegrations = integrations.filter(integration => {
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory
    const matchesSearch = !searchQuery || 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.features.some(feature => feature.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.disconnected}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPriorityBadge = (popularity: string) => {
    const variants = {
      high: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge variant="outline" className={variants[popularity as keyof typeof variants]}>
        {popularity === 'high' ? '🔥 Popular' : popularity === 'medium' ? '⭐ Recommended' : '💡 Available'}
      </Badge>
    )
  }

  const copyWebhookUrl = (webhookUrl: string) => {
    try {
      const fullUrl = `${window.location.origin}${webhookUrl}`
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl)
        toast.success('Webhook URL copied to clipboard')
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = fullUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast.success('Webhook URL copied to clipboard')
      }
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error)
      toast.error('Failed to copy URL')
    }
  }

  const handleConnect = (integration: IntegrationConfig) => {
    setSelectedIntegration(integration)
  }

  const handleSaveIntegration = async (integrationId: string, config: Record<string, string>) => {
    setLoading(true)
    try {
      // Here you would save the integration configuration
      // For now, we'll just update the local state
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, status: 'connected' as const }
            : integration
        )
      )
      
      toast.success('Integration configured successfully!')
      setSelectedIntegration(null)
    } catch (error) {
      toast.error('Failed to save integration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Integrations Hub</h2>
          <p className="text-gray-600">Connect with all the platforms your dental practice uses to capture leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {integrations.filter(i => i.status === 'connected').length} Connected
          </Badge>
          <Badge variant="outline">
            {integrations.length} Total Available
          </Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs">
              {category.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {category.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map(integration => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(integration.status)}
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>
                    </div>
                    {getPriorityBadge(integration.popularity)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{integration.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Setup time: {integration.estimatedSetupTime}</span>
                      <span className="capitalize">Difficulty: {integration.difficulty}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Key Features:</Label>
                    <div className="flex flex-wrap gap-1">
                      {integration.features.slice(0, 3).map(feature => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {integration.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{integration.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant={integration.status === 'connected' ? 'outline' : 'default'}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {integration.status === 'connected' ? 'Configure' : 'Connect'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {integration.icon}
                            Connect {integration.name}
                          </DialogTitle>
                          <DialogDescription>
                            {integration.description}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Features */}
                          <div>
                            <Label className="text-sm font-medium">Features you'll get:</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {integration.features.map(feature => (
                                <div key={feature} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Webhook URL */}
                          {integration.webhookUrl && (
                            <div>
                              <Label className="text-sm font-medium">Webhook URL:</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input 
                                  value={typeof window !== 'undefined' ? `${window.location.origin}${integration.webhookUrl}` : integration.webhookUrl}
                                  readOnly
                                  className="text-xs"
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => copyWebhookUrl(integration.webhookUrl!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Configuration Fields */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Configuration:</Label>
                            {integration.fields.map(field => (
                              <div key={field.key} className="space-y-1">
                                <Label htmlFor={field.key} className="text-sm">
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {field.type === 'select' ? (
                                  <select className="w-full p-2 border rounded-md text-sm">
                                    <option value="">Select {field.label}</option>
                                    {field.options?.map(option => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : field.type === 'textarea' ? (
                                  <textarea 
                                    id={field.key}
                                    placeholder={field.placeholder}
                                    className="w-full p-2 border rounded-md text-sm h-20 resize-none"
                                  />
                                ) : (
                                  <Input
                                    id={field.key}
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    className="text-sm"
                                  />
                                )}
                                {field.description && (
                                  <p className="text-xs text-gray-500">{field.description}</p>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t">
                            <div className="flex items-center gap-2">
                              {integration.documentation && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={integration.documentation} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Documentation
                                  </a>
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  toast.info('Testing connection...')
                                  setTimeout(() => {
                                    toast.success('Connection test successful!')
                                  }, 1500)
                                }}
                              >
                                Test Connection
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleSaveIntegration(integration.id, {})}
                                disabled={loading}
                              >
                                {loading && <RefreshCw className="h-4 w-4 mr-1 animate-spin" />}
                                Save Configuration
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {integration.documentation && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={integration.documentation} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No integrations found</h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
