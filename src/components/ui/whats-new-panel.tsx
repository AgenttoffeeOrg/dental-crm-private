'use client'

/**
 * What's New Panel
 * 
 * Announces new features to users
 * Badge on nav when unread items exist
 */

import { useState, useEffect } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { Card } from './card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog'
import { Sparkles, X } from 'lucide-react'

interface Feature {
  id: string
  title: string
  description: string
  category: 'new' | 'improved' | 'fixed'
  date: string
  icon?: string
}

const RECENT_FEATURES: Feature[] = [
  {
    id: 'calendar-module',
    title: '🗓️ Calendar & Scheduling',
    description: 'View all your tasks, calls, meetings, and deals in a unified calendar. Connect external booking tools (Calendly, Cal.com) and sync with Google/Outlook calendars.',
    category: 'new',
    date: 'October 16, 2025',
    icon: '🗓️',
  },
  {
    id: 'automations-exposed',
    title: '🤖 Automations Now Visible!',
    description: 'Build automated workflows with triggers (form submit, deal won, etc.) and actions (send email/SMS, create tasks, add tags). Now in main navigation!',
    category: 'new',
    date: 'October 16, 2025',
    icon: '🤖',
  },
  {
    id: 'notifications-system',
    title: '🔔 Real-Time Notifications',
    description: 'Get instant alerts for deals, tasks, campaigns, and integrations. Configure per-event preferences, quiet hours, and digests.',
    category: 'new',
    date: 'October 16, 2025',
    icon: '🔔',
  },
  {
    id: 'settings-search',
    title: '⚙️ Settings Search (⌘K)',
    description: 'Instantly find any setting with fuzzy search. Press ⌘K in Settings to jump to any configuration.',
    category: 'new',
    date: 'October 16, 2025',
    icon: '🔍',
  },
  {
    id: 'multi-location',
    title: '📍 Multi-Location Support',
    description: 'Manage multiple practice locations with location-specific settings and staff assignments.',
    category: 'new',
    date: 'October 16, 2025',
    icon: '📍',
  },
  {
    id: 'settings-versioning',
    title: '↩️ Settings Rollback',
    description: 'View complete version history of all settings changes. One-click rollback to previous values.',
    category: 'new',
    date: 'October 16, 2025',
    icon: '↩️',
  },
  {
    id: 'metrics-dictionary',
    title: '📖 Metrics Dictionary',
    description: 'Learn what every KPI means with formulas and context. Click "Metrics Dictionary" on Analytics page.',
    category: 'new',
    date: 'October 16, 2025',
    icon: '📖',
  },
]

export function WhatsNewPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [lastViewed, setLastViewed] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)
  
  useEffect(() => {
    const stored = localStorage.getItem('whats-new-last-viewed')
    setLastViewed(stored)
    
    // Check if there are new items since last viewed
    if (stored) {
      const lastDate = new Date(stored)
      const hasNew = RECENT_FEATURES.some(f => new Date(f.date) > lastDate)
      setHasUnread(hasNew)
    } else {
      setHasUnread(true)
    }
  }, [])
  
  const handleOpen = () => {
    setIsOpen(true)
    setHasUnread(false)
    localStorage.setItem('whats-new-last-viewed', new Date().toISOString())
  }
  
  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="relative"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        What's New
        {hasUnread && (
          <Badge className="ml-2 bg-purple-600 h-5 px-1.5 text-[10px]">
            NEW
          </Badge>
        )}
      </Button>
      
      {/* Panel */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              What's New
            </DialogTitle>
            <DialogDescription>
              Recent updates and new features
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {RECENT_FEATURES.map((feature) => (
              <Card key={feature.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{feature.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                      <Badge 
                        variant={feature.category === 'new' ? 'default' : 'outline'}
                        className="capitalize text-xs"
                      >
                        {feature.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
                    <p className="text-xs text-gray-500">{feature.date}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

