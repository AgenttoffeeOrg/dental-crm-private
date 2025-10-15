'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['J', '↓'], description: 'Navigate to next deal' },
        { keys: ['K', '↑'], description: 'Navigate to previous deal' },
        { keys: ['Enter'], description: 'Open selected deal' },
        { keys: ['/'], description: 'Focus search' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['N'], description: 'Create new deal' },
        { keys: ['E'], description: 'Edit selected deal' },
        { keys: ['M'], description: 'Move deal to another stage' },
        { keys: ['Shift', 'Del'], description: 'Delete selected deal' },
        { keys: ['R'], description: 'Refresh data' },
      ],
    },
    {
      category: 'General',
      items: [
        { keys: ['?'], description: 'Show this help dialog' },
        { keys: ['Esc'], description: 'Close dialogs' },
      ],
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and manage deals faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs px-2 py-0.5"
                          >
                            {key}
                          </Badge>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-xs text-gray-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 text-center pb-2">
          Press <Badge variant="outline" className="font-mono text-xs">?</Badge> anytime to see this help
        </div>
      </DialogContent>
    </Dialog>
  )
}

