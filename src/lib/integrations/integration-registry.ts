/**
 * Unified Integration Registry
 * 
 * SINGLE SOURCE OF TRUTH for ALL integrations
 * Every integration in the system is cataloged here
 */

import type { LucideIcon } from 'lucide-react'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Settings, 
  Calendar,
  TrendingUp,
  Camera,
  Video,
  FileText,
  Globe,
  Search,
  Smartphone,
  Headphones,
  DollarSign,
  Zap,
  Users,
  MapPin,
  Star,
  Monitor,
  PlayCircle,
} from 'lucide-react'

export interface UnifiedIntegration {
  id: string
  name: string
  provider: string // 'google', 'facebook', 'twilio', 'sendgrid', 'microsoft', etc.
  category: 'communications' | 'marketing' | 'calendar' | 'analytics' | 'storage' | 'other'
  type: string // 'gmail', 'twilio_sms', 'sendgrid', etc.
  
  // Connection method
  authMethod: 'oauth' | 'api_key' | 'webhook' | 'both'
  
  // OAuth info (if applicable)
  oauthScopes?: string[]
  oauthGroup?: string // Which OAuth group this belongs to
  
  // API key info (if applicable)
  apiKeyFields?: Array<{
    key: string
    label: string
    help: string
    placeholder?: string
    required: boolean
    type?: 'text' | 'password' | 'email' | 'url' | 'select'
    options?: string[]
  }>
  
  // Status
  status: 'connected' | 'disconnected' | 'error' | 'pending_verification'
  configured: boolean
  
  // UI - Use icon name instead of JSX
  iconName: string // 'Mail', 'MessageSquare', 'Phone', etc.
  description: string
  simpleDescription: string
  helpVideoUrl?: string
  buyUrl?: string
  docsUrl?: string
  
  // Features
  features: string[]
  estimatedSetupTime: string
  difficulty: 'easy' | 'medium' | 'advanced'
  
  // Webhook (if applicable)
  webhookUrl?: string
  webhookInstructions?: string
}

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  Mail,
  MessageSquare,
  Phone,
  Settings,
  Calendar,
  TrendingUp,
  Camera,
  Video,
  FileText,
  Globe,
  Search,
  Smartphone,
  Headphones,
  DollarSign,
  Zap,
  Users,
  MapPin,
  Star,
  Monitor,
  PlayCircle,
}

export function getIntegrationIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Settings
}

/**
 * COMPLETE INTEGRATION CATALOG
 * Every integration in the system
 */
export const ALL_INTEGRATIONS: UnifiedIntegration[] = [
  // ============================================
  // COMMUNICATIONS - EMAIL
  // ============================================
  {
    id: 'gmail',
    name: 'Gmail',
    provider: 'google',
    category: 'communications',
    type: 'gmail',
    authMethod: 'oauth',
    oauthScopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    oauthGroup: 'google',
    iconName: 'Mail',
    description: 'Send and receive emails via Gmail',
    simpleDescription: 'Use your Gmail account to send emails from the CRM',
    features: ['Send emails', 'Receive emails', 'Thread management'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'outlook',
    name: 'Outlook',
    provider: 'microsoft',
    category: 'communications',
    type: 'outlook',
    authMethod: 'oauth',
    oauthScopes: [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.Read',
    ],
    oauthGroup: 'microsoft',
    iconName: 'Mail',
    description: 'Send and receive emails via Outlook',
    simpleDescription: 'Use your Outlook account to send emails from the CRM',
    features: ['Send emails', 'Receive emails', 'Calendar integration'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    provider: 'sendgrid',
    category: 'communications',
    type: 'sendgrid',
    authMethod: 'api_key',
    apiKeyFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        help: 'Create one in SendGrid: Settings → API Keys → Create API Key. Give it "Full Access".',
        placeholder: 'SG.xxxxxxxxxxxx',
        required: true,
        type: 'password',
      },
      {
        key: 'fromEmail',
        label: 'From Email Address',
        help: 'The email address you want to send from (e.g., noreply@yourpractice.com)',
        placeholder: 'noreply@yourpractice.com',
        required: true,
        type: 'email',
      },
    ],
    buyUrl: 'https://signup.sendgrid.com/',
    iconName: 'Mail',
    description: 'Send transactional and marketing emails',
    simpleDescription: 'Send professional emails to patients - appointment reminders, newsletters, and more',
    features: ['Transactional emails', 'Marketing campaigns', 'Email tracking', 'Templates'],
    estimatedSetupTime: '5 minutes',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  
  // ============================================
  // COMMUNICATIONS - SMS
  // ============================================
  {
    id: 'twilio_sms',
    name: 'Twilio SMS',
    provider: 'twilio',
    category: 'communications',
    type: 'twilio_sms',
    authMethod: 'api_key',
    apiKeyFields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        help: 'This is like your username. Find it in your Twilio dashboard under Account Info.',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        type: 'text',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        help: 'This is like your password. Keep it secret! Find it in your Twilio dashboard.',
        placeholder: 'Your secret key',
        required: true,
        type: 'password',
      },
      {
        key: 'fromNumber',
        label: 'Phone Number',
        help: 'The phone number you bought from Twilio. Format: +1234567890',
        placeholder: '+1234567890',
        required: true,
        type: 'text',
      },
    ],
    buyUrl: 'https://www.twilio.com/try-twilio',
    webhookUrl: '/api/webhooks/sms',
    webhookInstructions: 'In Twilio Console → Phone Numbers → Your Number → Messaging → A MESSAGE COMES IN → Set to this URL',
    iconName: 'MessageSquare',
    description: 'Send and receive SMS messages',
    simpleDescription: 'Send text messages to your patients directly from the CRM',
    features: ['Send SMS', 'Receive SMS', 'Two-way messaging', 'Appointment reminders'],
    estimatedSetupTime: '10 minutes',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  
  // ============================================
  // COMMUNICATIONS - WHATSAPP
  // ============================================
  {
    id: 'twilio_whatsapp',
    name: 'Twilio WhatsApp',
    provider: 'twilio',
    category: 'communications',
    type: 'twilio_whatsapp',
    authMethod: 'api_key',
    apiKeyFields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        help: 'Find this in your Twilio dashboard under Account Info.',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        type: 'text',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        help: 'Keep this secret! Find it in your Twilio dashboard.',
        placeholder: 'Your secret key',
        required: true,
        type: 'password',
      },
      {
        key: 'whatsappNumber',
        label: 'WhatsApp Number',
        help: 'Format: whatsapp:+1234567890 (include the "whatsapp:" prefix)',
        placeholder: 'whatsapp:+1234567890',
        required: true,
        type: 'text',
      },
    ],
    buyUrl: 'https://www.twilio.com/whatsapp',
    webhookUrl: '/api/webhooks/whatsapp',
    webhookInstructions: 'In Twilio Console → Messaging → WhatsApp Senders → Your Sender → Webhook URL → Set to this URL',
    iconName: 'MessageSquare',
    description: 'Send WhatsApp Business messages',
    simpleDescription: 'Send WhatsApp messages to patients - they prefer this over SMS!',
    features: ['Send WhatsApp', 'Receive WhatsApp', 'Media sharing', 'Rich messaging'],
    estimatedSetupTime: '15 minutes',
    difficulty: 'medium',
    status: 'disconnected',
    configured: false,
  },
  
  // ============================================
  // COMMUNICATIONS - VOICE
  // ============================================
  {
    id: 'twilio_voice',
    name: 'Twilio Voice',
    provider: 'twilio',
    category: 'communications',
    type: 'twilio_voice',
    authMethod: 'api_key',
    apiKeyFields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        help: 'Find this in your Twilio dashboard under Account Info.',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required: true,
        type: 'text',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        help: 'Keep this secret! Find it in your Twilio dashboard.',
        placeholder: 'Your secret key',
        required: true,
        type: 'password',
      },
      {
        key: 'fromNumber',
        label: 'Phone Number',
        help: 'The phone number you bought from Twilio for making calls.',
        placeholder: '+1234567890',
        required: true,
        type: 'text',
      },
    ],
    buyUrl: 'https://www.twilio.com/voice',
    webhookUrl: '/api/webhooks/voice',
    webhookInstructions: 'In Twilio Console → Phone Numbers → Your Number → Voice & Fax → STATUS CALLBACK URL → Set to this URL',
    iconName: 'Phone',
    description: 'Make and receive phone calls',
    simpleDescription: 'Make phone calls directly from the CRM - no need to use your phone!',
    features: ['Make calls', 'Receive calls', 'Call recording', 'Call analytics'],
    estimatedSetupTime: '10 minutes',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  
  // ============================================
  // MARKETING - ADS
  // ============================================
  {
    id: 'google_ads',
    name: 'Google Ads',
    provider: 'google',
    category: 'marketing',
    type: 'google_ads',
    authMethod: 'oauth',
    oauthScopes: [
      'https://www.googleapis.com/auth/adwords',
    ],
    oauthGroup: 'google',
    iconName: 'DollarSign',
    description: 'Manage Google Ads campaigns',
    simpleDescription: 'See how your Google Ads are performing and which ones bring in patients',
    features: ['Campaign management', 'Lead tracking', 'Conversion tracking', 'ROI analysis'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'facebook_ads',
    name: 'Facebook Ads',
    provider: 'facebook',
    category: 'marketing',
    type: 'facebook_ads',
    authMethod: 'oauth',
    oauthScopes: [
      'ads_management',
      'ads_read',
    ],
    oauthGroup: 'facebook',
    iconName: 'DollarSign',
    description: 'Manage Facebook ad campaigns',
    simpleDescription: 'Track Facebook ad performance and capture leads automatically',
    features: ['Campaign management', 'Lead ads', 'Conversion tracking', 'Audience insights'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'facebook_pages',
    name: 'Facebook Pages',
    provider: 'facebook',
    category: 'marketing',
    type: 'facebook_pages',
    authMethod: 'oauth',
    oauthScopes: [
      'pages_manage_posts',
      'pages_read_engagement',
    ],
    oauthGroup: 'facebook',
    iconName: 'MessageSquare',
    description: 'Manage Facebook pages and posts',
    simpleDescription: 'Post to your Facebook page and manage ads - all from one place',
    features: ['Post scheduling', 'Page management', 'Engagement tracking'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    provider: 'facebook',
    category: 'marketing',
    type: 'instagram',
    authMethod: 'oauth',
    oauthScopes: [
      'instagram_basic',
      'instagram_manage_messages',
      'pages_read_engagement',
    ],
    oauthGroup: 'facebook',
    iconName: 'Camera',
    description: 'Manage Instagram business account',
    simpleDescription: 'Post to Instagram and respond to messages - grow your social presence',
    features: ['Post scheduling', 'Story management', 'DM automation', 'Analytics'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    provider: 'tiktok',
    category: 'marketing',
    type: 'tiktok',
    authMethod: 'oauth',
    oauthScopes: [
      'user.info.basic',
      'user.info.profile',
    ],
    iconName: 'Video',
    description: 'Manage TikTok business account',
    simpleDescription: 'Manage your TikTok content and engage with followers',
    features: ['Content management', 'Analytics', 'Lead generation'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  
  // ============================================
  // CALENDAR
  // ============================================
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    provider: 'google',
    category: 'calendar',
    type: 'google_calendar',
    authMethod: 'oauth',
    oauthScopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    oauthGroup: 'google',
    iconName: 'Calendar',
    description: 'Sync appointments with Google Calendar',
    simpleDescription: 'Schedule appointments and sync them with Google Calendar automatically',
    features: ['Two-way sync', 'Appointment reminders', 'Availability management'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  {
    id: 'microsoft_calendar',
    name: 'Microsoft Calendar',
    provider: 'microsoft',
    category: 'calendar',
    type: 'microsoft_calendar',
    authMethod: 'oauth',
    oauthScopes: [
      'https://graph.microsoft.com/Calendars.ReadWrite',
    ],
    oauthGroup: 'microsoft',
    iconName: 'Calendar',
    description: 'Sync appointments with Outlook Calendar',
    simpleDescription: 'Schedule appointments and sync them with Outlook Calendar automatically',
    features: ['Two-way sync', 'Appointment reminders', 'Teams integration'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
  
  // ============================================
  // ANALYTICS
  // ============================================
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    provider: 'google',
    category: 'analytics',
    type: 'google_analytics',
    authMethod: 'oauth',
    oauthScopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
    oauthGroup: 'google',
    iconName: 'TrendingUp',
    description: 'Track website analytics',
    simpleDescription: 'See how many people visit your website and what they do there',
    features: ['Website traffic', 'User behavior', 'Conversion tracking', 'Reports'],
    estimatedSetupTime: '30 seconds',
    difficulty: 'easy',
    status: 'disconnected',
    configured: false,
  },
]

/**
 * Get integration by ID
 */
export function getIntegration(id: string): UnifiedIntegration | undefined {
  return ALL_INTEGRATIONS.find(i => i.id === id)
}

/**
 * Get integrations by provider
 */
export function getIntegrationsByProvider(provider: string): UnifiedIntegration[] {
  return ALL_INTEGRATIONS.filter(i => i.provider === provider)
}

/**
 * Get integrations by category
 */
export function getIntegrationsByCategory(category: UnifiedIntegration['category']): UnifiedIntegration[] {
  return ALL_INTEGRATIONS.filter(i => i.category === category)
}

/**
 * Get all providers
 */
export function getAllProviders(): string[] {
  return Array.from(new Set(ALL_INTEGRATIONS.map(i => i.provider)))
}

/**
 * Get all categories
 */
export function getAllCategories(): UnifiedIntegration['category'][] {
  return Array.from(new Set(ALL_INTEGRATIONS.map(i => i.category))) as UnifiedIntegration['category'][]
}

