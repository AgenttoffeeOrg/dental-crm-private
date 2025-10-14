'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Mail, 
  MessageSquare, 
  Phone,
  Users,
  Layout,
  GitBranch,
  Send,
  Plus,
  BarChart3,
  Settings,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface CommandItem {
  id: string
  title: string
  subtitle: string
  icon: any
  action: () => void
  category: 'create' | 'navigate' | 'recent' | 'search'
}

export function MarketingCommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [commands, setCommands] = useState<CommandItem[]>([])
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([])
  const [recentTemplates, setRecentTemplates] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      loadRecent()
      buildCommands()
    }
  }, [open])

  useEffect(() => {
    buildCommands()
  }, [query, recentCampaigns, recentTemplates])

  const loadRecent = async () => {
    try {
      const supabase = createClient()
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'

      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: templates } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(5)

      setRecentCampaigns(campaigns || [])
      setRecentTemplates(templates || [])
    } catch (error) {
      console.error('[COMMAND] Error loading recent:', error)
    }
  }

  const buildCommands = () => {
    const allCommands: CommandItem[] = [
      // Create actions
      {
        id: 'create-email',
        title: 'Create Email Campaign',
        subtitle: 'Start a new email campaign',
        icon: Mail,
        action: () => {
          router.push('/marketing/campaigns/create?channel=email')
          onOpenChange(false)
        },
        category: 'create'
      },
      {
        id: 'create-sms',
        title: 'Create SMS Campaign',
        subtitle: 'Start a new SMS campaign',
        icon: MessageSquare,
        action: () => {
          router.push('/marketing/campaigns/create?channel=sms')
          onOpenChange(false)
        },
        category: 'create'
      },
      {
        id: 'create-whatsapp',
        title: 'Create WhatsApp Campaign',
        subtitle: 'Start a new WhatsApp campaign',
        icon: Phone,
        action: () => {
          router.push('/marketing/campaigns/create?channel=whatsapp')
          onOpenChange(false)
        },
        category: 'create'
      },
      {
        id: 'create-template',
        title: 'Create Template',
        subtitle: 'Design a new message template',
        icon: Layout,
        action: () => {
          router.push('/marketing/templates/create')
          onOpenChange(false)
        },
        category: 'create'
      },
      {
        id: 'create-segment',
        title: 'Create Audience Segment',
        subtitle: 'Build a targeted contact list',
        icon: Users,
        action: () => {
          router.push('/marketing/audiences')
          onOpenChange(false)
        },
        category: 'create'
      },
      {
        id: 'create-journey',
        title: 'Create Automation Journey',
        subtitle: 'Build an automated workflow',
        icon: GitBranch,
        action: () => {
          router.push('/marketing/journeys/create')
          onOpenChange(false)
        },
        category: 'create'
      },
      // Navigation
      {
        id: 'nav-campaigns',
        title: 'View Campaigns',
        subtitle: 'See all marketing campaigns',
        icon: Send,
        action: () => {
          router.push('/marketing/campaigns')
          onOpenChange(false)
        },
        category: 'navigate'
      },
      {
        id: 'nav-templates',
        title: 'View Templates',
        subtitle: 'Browse template library',
        icon: Layout,
        action: () => {
          router.push('/marketing/templates')
          onOpenChange(false)
        },
        category: 'navigate'
      },
      {
        id: 'nav-audiences',
        title: 'View Audiences',
        subtitle: 'Manage contact segments',
        icon: Users,
        action: () => {
          router.push('/marketing/audiences')
          onOpenChange(false)
        },
        category: 'navigate'
      },
      {
        id: 'nav-reports',
        title: 'View Reports',
        subtitle: 'Analytics and insights',
        icon: BarChart3,
        action: () => {
          router.push('/marketing/reports')
          onOpenChange(false)
        },
        category: 'navigate'
      },
    ]

    // Add recent campaigns
    recentCampaigns.forEach(campaign => {
      allCommands.push({
        id: `recent-campaign-${campaign.id}`,
        title: campaign.name,
        subtitle: `${campaign.channel} campaign • ${campaign.status}`,
        icon: campaign.channel === 'email' ? Mail : campaign.channel === 'sms' ? MessageSquare : Phone,
        action: () => {
          router.push(`/marketing/campaigns/${campaign.id}`)
          onOpenChange(false)
        },
        category: 'recent'
      })
    })

    // Add recent templates
    recentTemplates.forEach(template => {
      allCommands.push({
        id: `recent-template-${template.id}`,
        title: template.name,
        subtitle: `${template.channel} template • ${template.category}`,
        icon: Layout,
        action: () => {
          router.push(`/marketing/templates/${template.id}`)
          onOpenChange(false)
        },
        category: 'recent'
      })
    })

    // Filter by query
    const filtered = query
      ? allCommands.filter(cmd =>
          cmd.title.toLowerCase().includes(query.toLowerCase()) ||
          cmd.subtitle.toLowerCase().includes(query.toLowerCase())
        )
      : allCommands

    setCommands(filtered)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  const groupedCommands = {
    create: commands.filter(c => c.category === 'create'),
    navigate: commands.filter(c => c.category === 'navigate'),
    recent: commands.filter(c => c.category === 'recent'),
    search: commands.filter(c => c.category === 'search'),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search campaigns, templates, or create new..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-6 px-2 items-center gap-1 rounded bg-gray-100 text-xs text-gray-600">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {groupedCommands.create.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                <Plus className="h-3 w-3 inline mr-1" />
                Create New
              </p>
              {groupedCommands.create.map(cmd => (
                <CommandButton key={cmd.id} command={cmd} />
              ))}
            </div>
          )}

          {groupedCommands.navigate.length > 0 && !query && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                <Search className="h-3 w-3 inline mr-1" />
                Navigate
              </p>
              {groupedCommands.navigate.map(cmd => (
                <CommandButton key={cmd.id} command={cmd} />
              ))}
            </div>
          )}

          {groupedCommands.recent.length > 0 && !query && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                <Clock className="h-3 w-3 inline mr-1" />
                Recent
              </p>
              {groupedCommands.recent.slice(0, 5).map(cmd => (
                <CommandButton key={cmd.id} command={cmd} />
              ))}
            </div>
          )}

          {commands.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-2 py-1 bg-white rounded border">↑</kbd>
              <kbd className="px-2 py-1 bg-white rounded border ml-1">↓</kbd>
              <span className="ml-1">to navigate</span>
            </span>
            <span>
              <kbd className="px-2 py-1 bg-white rounded border">↵</kbd>
              <span className="ml-1">to select</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Marketing Command Palette</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandButton({ command }: { command: CommandItem }) {
  const Icon = command.icon

  return (
    <button
      onClick={command.action}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left group"
    >
      <div className="h-10 w-10 rounded-lg bg-gray-100 group-hover:bg-white flex items-center justify-center shrink-0 border border-gray-200">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{command.title}</p>
        <p className="text-xs text-gray-600 truncate">{command.subtitle}</p>
      </div>
    </button>
  )
}



