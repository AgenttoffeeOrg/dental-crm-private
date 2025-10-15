'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'
import { DEFAULT_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = Object.values(DEFAULT_SHORTCUTS)
  const categories = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    actions: shortcuts.filter(s => s.category === 'actions'),
    system: shortcuts.filter(s => s.category === 'system')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster through the dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Actions */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {categories.actions.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Navigation</h3>
            <div className="space-y-2">
              {categories.navigation.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* System */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3">System</h3>
            <div className="space-y-2">
              {categories.system.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Shortcuts don't work when you're typing in an input field. 
            Press <kbd className="px-1 py-0.5 text-xs bg-white border border-blue-300 rounded">Esc</kbd> first to exit input mode.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

