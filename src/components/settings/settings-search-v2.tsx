'use client'

/**
 * Settings Search Component - Updated for 2-Level Navigation
 * 
 * Search across all settings with section + tab navigation
 * 
 * Features:
 * - Keyboard shortcut: ⌘K (Mac) or Ctrl+K (Windows)
 * - Navigate to section and tab
 * - Fuzzy matching
 * - Recent searches
 */

import { useState, useEffect } from 'react'
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
import { Search, Command, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface SearchableItem {
  id: string
  label: string
  description: string
  section: string  // e.g., 'account', 'team', 'workflow'
  tab: string      // e.g., 'profile', 'members', 'pipelines'
  keywords: string[]
  category: string
}

// Comprehensive searchable settings index (updated for 2-level structure)
const SEARCHABLE_SETTINGS: SearchableItem[] = [
  // ACCOUNT SECTION
  { id: 'profile-name', label: 'My Profile', description: 'Edit your personal information', section: 'account', tab: 'profile', keywords: ['name', 'email', 'photo', 'user'], category: 'Account' },
  { id: 'org-info', label: 'Organization', description: 'Manage organization details', section: 'account', tab: 'organization', keywords: ['organization', 'company', 'business'], category: 'Account' },
  { id: 'locations', label: 'Locations', description: 'Manage practice locations', section: 'account', tab: 'locations', keywords: ['location', 'practice', 'office'], category: 'Account' },
  { id: 'billing', label: 'Billing', description: 'Subscription and payment settings', section: 'account', tab: 'billing', keywords: ['billing', 'subscription', 'payment'], category: 'Account' },
  
  // TEAM SECTION
  { id: 'team-members', label: 'Team Members', description: 'Invite and manage team members', section: 'team', tab: 'members', keywords: ['team', 'user', 'invite', 'member'], category: 'Team' },
  { id: 'roles', label: 'Roles & Permissions', description: 'Configure user roles', section: 'team', tab: 'roles', keywords: ['role', 'permission', 'access', 'rbac'], category: 'Team' },
  { id: 'onboarding', label: 'Onboarding Config', description: 'Configure onboarding fields', section: 'team', tab: 'onboarding-config', keywords: ['onboarding', 'setup', 'fields'], category: 'Team' },
  
  // WORKFLOW SECTION
  { id: 'pipelines', label: 'Pipeline Settings', description: 'Configure pipeline display', section: 'workflow', tab: 'pipelines', keywords: ['pipeline', 'view', 'board', 'list'], category: 'Workflow' },
  { id: 'deals', label: 'Deal Settings', description: 'Configure deal validation rules', section: 'workflow', tab: 'deals', keywords: ['deal', 'validation', 'required'], category: 'Workflow' },
  { id: 'treatment-tags', label: 'Treatment Tags', description: 'Manage treatment tags and routing', section: 'workflow', tab: 'treatment-tags', keywords: ['treatment', 'tag', 'routing'], category: 'Workflow' },
  { id: 'pipeline-mapping', label: 'Pipeline Mapping', description: 'Map treatments to pipelines', section: 'workflow', tab: 'pipeline-mapping', keywords: ['pipeline', 'mapping', 'treatment'], category: 'Workflow' },
  { id: 'custom-fields', label: 'Custom Fields', description: 'Create custom fields', section: 'workflow', tab: 'custom-fields', keywords: ['custom', 'field', 'property'], category: 'Workflow' },
  { id: 'tags-sources', label: 'Tags & Sources', description: 'Manage tags and lead sources', section: 'workflow', tab: 'tags-sources', keywords: ['tag', 'lead', 'source'], category: 'Workflow' },
  
  // COMMUNICATIONS SECTION
  { id: 'email', label: 'Email Configuration', description: 'Configure email settings', section: 'communications', tab: 'email', keywords: ['email', 'smtp', 'provider'], category: 'Communications' },
  { id: 'sms', label: 'SMS Configuration', description: 'Configure SMS settings', section: 'communications', tab: 'sms', keywords: ['sms', 'twilio', 'text'], category: 'Communications' },
  { id: 'whatsapp', label: 'WhatsApp Configuration', description: 'Configure WhatsApp messaging', section: 'communications', tab: 'whatsapp', keywords: ['whatsapp', 'messaging'], category: 'Communications' },
  { id: 'notifications', label: 'Notifications', description: 'Configure notification preferences', section: 'communications', tab: 'notifications', keywords: ['notification', 'alert', 'bell'], category: 'Communications' },
  { id: 'calendar', label: 'Calendar Integration', description: 'Connect calendar services', section: 'communications', tab: 'calendar', keywords: ['calendar', 'schedule', 'sync'], category: 'Communications' },
  
  // AI & AUTOMATION SECTION
  { id: 'ai-assistant', label: 'AI Assistant', description: 'Configure AI chat assistant', section: 'ai', tab: 'ai-assistant', keywords: ['ai', 'assistant', 'chat'], category: 'AI' },
  { id: 'ai-analytics', label: 'AI Analytics', description: 'AI-powered insights', section: 'ai', tab: 'ai-analytics', keywords: ['ai', 'analytics', 'insights'], category: 'AI' },
  { id: 'marketing', label: 'Marketing & Forms', description: 'Marketing campaigns and forms', section: 'ai', tab: 'marketing', keywords: ['marketing', 'campaign', 'form'], category: 'AI' },
  
  // INTEGRATIONS SECTION
  { id: 'connected-apps', label: 'Connected Apps', description: 'Manage integrations', section: 'integrations', tab: 'connected-apps', keywords: ['integration', 'oauth', 'connect'], category: 'Integrations' },
  { id: 'api', label: 'API & Developers', description: 'API keys and webhooks', section: 'integrations', tab: 'api', keywords: ['api', 'key', 'webhook', 'developer'], category: 'Integrations' },
  { id: 'branding', label: 'Branding', description: 'Logo and brand colors', section: 'integrations', tab: 'branding', keywords: ['branding', 'logo', 'color'], category: 'Integrations' },
  
  // SYSTEM SECTION
  { id: 'security-privacy', label: 'Security & Privacy', description: 'Security and privacy settings', section: 'system', tab: 'security-privacy', keywords: ['security', 'privacy', 'gdpr', '2fa'], category: 'System' },
  { id: 'analytics', label: 'Analytics', description: 'Analytics configuration', section: 'system', tab: 'analytics', keywords: ['analytics', 'tracking'], category: 'System' },
  { id: 'audit', label: 'Audit Trail', description: 'View system activity logs', section: 'system', tab: 'audit', keywords: ['audit', 'log', 'activity'], category: 'System' },
]

interface SettingsSearchProps {
  onNavigate: (section: string, tab: string) => void
  currentSection?: string
  currentTab?: string
}

export function SettingsSearch({ onNavigate, currentSection, currentTab }: SettingsSearchProps) {
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
        item.section,
        item.tab,
        ...item.keywords,
      ].join(' ').toLowerCase()
      
      const queryWords = query.split(' ')
      return queryWords.every(word => searchableText.includes(word))
    })
    
    setResults(filtered.slice(0, 10))
    setSelectedIndex(0)
  }, [searchQuery])
  
  // Handle navigation
  const handleNavigate = (item: SearchableItem) => {
    onNavigate(item.section, item.tab)
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
                placeholder="Type to search... (e.g., 'email', 'team', 'pipeline')"
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
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.section}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
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
                <p className="text-sm">Try: "email", "team members", "pipeline", "api keys"</p>
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

