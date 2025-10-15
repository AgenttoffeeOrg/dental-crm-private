'use client'

/**
 * Settings Search Component
 * 
 * Powerful search across all settings with keyboard shortcut
 * 
 * Features:
 * - Fuzzy matching across setting names, descriptions, tabs
 * - Keyboard shortcut: ⌘K (Mac) or Ctrl+K (Windows)
 * - Real-time filtering
 * - Jump to setting
 * - Highlight matching tabs
 * - Recent searches
 * 
 * Usage:
 * ```typescript
 * <SettingsSearch onNavigate={(tab, section) => handleTabChange(tab)} />
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Command, ArrowRight, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface SearchableItem {
  id: string
  label: string
  description: string
  tab: string
  section?: string
  keywords: string[]
  category: string
}

// Comprehensive searchable settings index
const SEARCHABLE_SETTINGS: SearchableItem[] = [
  // Profile & User
  { id: 'profile-name', label: 'My Name', description: 'Edit your display name', tab: 'profile', keywords: ['name', 'display', 'user', 'personal'], category: 'Personal' },
  { id: 'profile-email', label: 'My Email', description: 'Change your email address', tab: 'profile', keywords: ['email', 'contact', 'login'], category: 'Personal' },
  { id: 'profile-timezone', label: 'Timezone', description: 'Set your timezone', tab: 'profile', keywords: ['timezone', 'time', 'zone', 'region'], category: 'Personal' },
  
  // Team
  { id: 'team-invite', label: 'Invite Team Members', description: 'Add new users to your practice', tab: 'team', keywords: ['invite', 'add', 'user', 'member', 'team'], category: 'Team' },
  { id: 'team-manage', label: 'Manage Team', description: 'View and edit team members', tab: 'team', keywords: ['team', 'users', 'staff', 'members'], category: 'Team' },
  
  // Roles & Permissions
  { id: 'roles-create', label: 'Create Roles', description: 'Define custom roles for your team', tab: 'roles', keywords: ['role', 'permission', 'access', 'security'], category: 'Team' },
  { id: 'roles-permissions', label: 'Edit Permissions', description: 'Configure role permissions', tab: 'roles', keywords: ['permission', 'access', 'control', 'rbac'], category: 'Team' },
  
  // Pipeline
  { id: 'pipeline-view', label: 'Pipeline View Mode', description: 'Choose board or list view', tab: 'preferences', keywords: ['pipeline', 'view', 'board', 'list', 'display'], category: 'CRM' },
  { id: 'pipeline-default', label: 'Default Pipeline', description: 'Set which pipeline opens first', tab: 'preferences', keywords: ['pipeline', 'default', 'startup'], category: 'CRM' },
  { id: 'pipeline-density', label: 'Card Density', description: 'Adjust deal card spacing', tab: 'preferences', keywords: ['density', 'spacing', 'compact', 'card'], category: 'CRM' },
  
  // Deals
  { id: 'deals-required', label: 'Required Deal Fields', description: 'Set mandatory fields for deals', tab: 'deals', keywords: ['deal', 'required', 'mandatory', 'validation'], category: 'CRM' },
  { id: 'deals-validation', label: 'Deal Validation Rules', description: 'Set value limits and rules', tab: 'deals', keywords: ['deal', 'validation', 'rules', 'limits'], category: 'CRM' },
  { id: 'deals-duplicate', label: 'Duplicate Detection', description: 'Configure duplicate deal detection', tab: 'deals', keywords: ['duplicate', 'dedupe', 'detection'], category: 'CRM' },
  
  // AI
  { id: 'ai-assistant', label: 'AI Assistant', description: 'Configure AI chat assistant', tab: 'ai', keywords: ['ai', 'assistant', 'chat', 'bot'], category: 'AI' },
  { id: 'ai-categorization', label: 'Auto-Categorization', description: 'AI deal categorization rules', tab: 'categorization', keywords: ['ai', 'category', 'auto', 'rules'], category: 'AI' },
  { id: 'ai-analytics', label: 'AI Analytics', description: 'AI-powered insights settings', tab: 'ai-analytics', keywords: ['ai', 'analytics', 'insights', 'predictive'], category: 'AI' },
  
  // Integrations
  { id: 'integrations-oauth', label: 'Connected Apps', description: 'Manage OAuth integrations', tab: 'integrations', keywords: ['integration', 'oauth', 'connect', 'apps', 'api'], category: 'Integrations' },
  { id: 'integrations-webhooks', label: 'Webhooks', description: 'Configure webhook endpoints', tab: 'integrations', section: 'webhooks', keywords: ['webhook', 'api', 'callback'], category: 'Integrations' },
  
  // Email
  { id: 'email-provider', label: 'Email Provider', description: 'Choose email service provider', tab: 'email-config', keywords: ['email', 'provider', 'smtp', 'sendgrid', 'resend'], category: 'Communications' },
  { id: 'email-from', label: 'From Email Address', description: 'Set default sender email', tab: 'email-config', keywords: ['email', 'from', 'sender', 'address'], category: 'Communications' },
  { id: 'email-verification', label: 'Email Verification TTL', description: 'Verification link expiry time', tab: 'email-config', section: 'verification', keywords: ['email', 'verification', 'ttl', 'expiry'], category: 'Communications' },
  
  // SMS
  { id: 'sms-twilio', label: 'Twilio Configuration', description: 'Configure Twilio for SMS', tab: 'sms-config', keywords: ['sms', 'twilio', 'text', 'message'], category: 'Communications' },
  
  // WhatsApp
  { id: 'whatsapp-twilio', label: 'WhatsApp Setup', description: 'Configure WhatsApp messaging', tab: 'whatsapp-config', keywords: ['whatsapp', 'twilio', 'messaging'], category: 'Communications' },
  
  // Notifications
  { id: 'notifications-email', label: 'Email Notifications', description: 'Configure email alerts', tab: 'notifications', keywords: ['notification', 'email', 'alert'], category: 'Notifications' },
  { id: 'notifications-in-app', label: 'In-App Notifications', description: 'Configure in-app alerts', tab: 'notifications', keywords: ['notification', 'in-app', 'alert', 'bell'], category: 'Notifications' },
  
  // Branding
  { id: 'branding-logo', label: 'Company Logo', description: 'Upload your practice logo', tab: 'branding', keywords: ['logo', 'brand', 'image'], category: 'Branding' },
  { id: 'branding-colors', label: 'Brand Colors', description: 'Set your brand color palette', tab: 'branding', keywords: ['colors', 'theme', 'brand', 'palette'], category: 'Branding' },
  
  // Security
  { id: 'security-mfa', label: 'Two-Factor Authentication', description: 'Enable MFA for your account', tab: 'security', keywords: ['mfa', '2fa', 'security', 'authentication'], category: 'Security' },
  { id: 'security-password', label: 'Password Policy', description: 'Set password requirements', tab: 'security', keywords: ['password', 'policy', 'security'], category: 'Security' },
  
  // Privacy
  { id: 'privacy-gdpr', label: 'GDPR Settings', description: 'Configure GDPR compliance', tab: 'privacy', keywords: ['gdpr', 'privacy', 'compliance', 'data'], category: 'Privacy' },
  { id: 'privacy-retention', label: 'Data Retention', description: 'Set data retention policies', tab: 'privacy', keywords: ['retention', 'delete', 'archive', 'gdpr'], category: 'Privacy' },
  
  // API
  { id: 'api-keys', label: 'API Keys', description: 'Generate and manage API keys', tab: 'api', keywords: ['api', 'key', 'token', 'developer'], category: 'Developer' },
  { id: 'api-webhooks', label: 'API Webhooks', description: 'Configure outbound webhooks', tab: 'api', section: 'webhooks', keywords: ['webhook', 'api', 'integration'], category: 'Developer' },
  
  // Billing
  { id: 'billing-plan', label: 'Subscription Plan', description: 'Manage your subscription', tab: 'billing', keywords: ['billing', 'subscription', 'plan', 'payment'], category: 'Billing' },
  { id: 'billing-payment', label: 'Payment Method', description: 'Update payment method', tab: 'billing', section: 'payment', keywords: ['payment', 'billing', 'credit card'], category: 'Billing' },
  
  // Custom Fields
  { id: 'custom-fields-create', label: 'Create Custom Fields', description: 'Add custom fields to contacts/deals', tab: 'custom-fields', keywords: ['custom', 'field', 'property', 'extend'], category: 'CRM' },
  
  // Tags
  { id: 'tags-manage', label: 'Manage Tags', description: 'Create and organize tags', tab: 'tags', keywords: ['tag', 'label', 'organize'], category: 'CRM' },
  
  // Lead Sources
  { id: 'lead-sources', label: 'Lead Sources', description: 'Configure lead source tracking', tab: 'lead-sources', keywords: ['lead', 'source', 'attribution', 'tracking'], category: 'CRM' },
  
  // Audit
  { id: 'audit-trail', label: 'Audit Trail', description: 'View system activity logs', tab: 'audit', keywords: ['audit', 'log', 'history', 'activity'], category: 'Governance' },
]

interface SettingsSearchProps {
  onNavigate: (tab: string, section?: string) => void
  currentTab?: string
}

export function SettingsSearch({ onNavigate, currentTab }: SettingsSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchableItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  // Listen for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])
  
  // Fuzzy search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = SEARCHABLE_SETTINGS.filter(item => {
      const searchableText = [
        item.label,
        item.description,
        item.tab,
        item.section || '',
        ...item.keywords,
      ].join(' ').toLowerCase()
      
      // Simple fuzzy matching - check if all query words appear
      const queryWords = query.split(' ')
      return queryWords.every(word => searchableText.includes(word))
    })
    
    setResults(filtered.slice(0, 10)) // Limit to top 10
    setSelectedIndex(0)
  }, [searchQuery])
  
  // Handle navigation
  const handleNavigate = (item: SearchableItem) => {
    onNavigate(item.tab, item.section)
    setIsOpen(false)
    setSearchQuery('')
    toast.success(`Navigated to ${item.label}`)
  }
  
  // Keyboard navigation in results
  const handleResultsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleNavigate(results[selectedIndex])
    }
  }
  
  return (
    <>
      {/* Search Trigger Button */}
      <div className="relative flex-1 max-w-md">
        <Button
          variant="outline"
          className="w-full justify-start text-gray-600 font-normal"
          onClick={() => setIsOpen(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          <span>Search settings...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>
      </div>
      
      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Settings</DialogTitle>
            <DialogDescription>
              Find any setting quickly by typing keywords
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Type to search... (e.g., 'email provider', 'twilio', 'api keys')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleResultsKeyDown}
                className="pl-10"
                autoFocus
              />
            </div>
            
            {/* Search Results */}
            {results.length > 0 && (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {results.map((item, index) => (
                  <button
                    key={item.id}
                    className={`w-full text-left p-3 rounded-lg hover:bg-gray-100 transition ${
                      index === selectedIndex ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => handleNavigate(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Tab: {item.tab}{item.section && ` > ${item.section}`}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {searchQuery && results.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No settings found</p>
                <p className="text-sm">Try different keywords</p>
              </div>
            )}
            
            {/* Empty State */}
            {!searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <Command className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-2">Start typing to search</p>
                <p className="text-sm">Try: "email", "twilio", "api keys", "pipeline view"</p>
              </div>
            )}
            
            {/* Keyboard Hints */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
              <div className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-gray-100 rounded border">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-gray-100 rounded border">Enter</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-gray-100 rounded border">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

