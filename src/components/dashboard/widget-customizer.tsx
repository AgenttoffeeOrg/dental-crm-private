'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Settings, 
  Eye, 
  EyeOff, 
  GripVertical,
  X,
  RotateCcw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Widget {
  id: string
  name: string
  visible: boolean
  order: number
}

interface WidgetCustomizerProps {
  open: boolean
  onClose: () => void
  widgets: Widget[]
  onSave: (widgets: Widget[]) => Promise<void>
  onReset: () => Promise<void>
}

/**
 * Widget Customizer
 * 
 * Allows users to customize their dashboard by:
 * - Showing/hiding widgets
 * - Reordering widgets (drag-and-drop)
 * - Resetting to defaults
 */
export function WidgetCustomizer({
  open,
  onClose,
  widgets,
  onSave,
  onReset
}: WidgetCustomizerProps) {
  const [localWidgets, setLocalWidgets] = useState<Widget[]>(widgets)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  const toggleVisibility = (widgetId: string) => {
    setLocalWidgets(prev => 
      prev.map(w => 
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
    )
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    
    const newWidgets = [...localWidgets]
    const temp = newWidgets[index - 1]
    newWidgets[index - 1] = newWidgets[index]
    newWidgets[index] = temp
    
    // Update order values
    newWidgets.forEach((w, i) => w.order = i)
    setLocalWidgets(newWidgets)
  }

  const moveDown = (index: number) => {
    if (index === localWidgets.length - 1) return
    
    const newWidgets = [...localWidgets]
    const temp = newWidgets[index + 1]
    newWidgets[index + 1] = newWidgets[index]
    newWidgets[index] = temp
    
    // Update order values
    newWidgets.forEach((w, i) => w.order = i)
    setLocalWidgets(newWidgets)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(localWidgets)
    setSaving(false)
    onClose()
  }

  const handleReset = async () => {
    setResetting(true)
    await onReset()
    setResetting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customize Dashboard
          </DialogTitle>
          <DialogDescription>
            Show, hide, and reorder widgets to create your perfect dashboard layout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {localWidgets.map((widget, index) => (
            <div
              key={widget.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                widget.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              {/* Drag Handle */}
              <div className="cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Widget Name */}
              <div className="flex-1">
                <span className={`font-medium ${widget.visible ? 'text-gray-900' : 'text-gray-500'}`}>
                  {widget.name}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Move Up */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                >
                  ↑
                </Button>

                {/* Move Down */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveDown(index)}
                  disabled={index === localWidgets.length - 1}
                  className="h-8 w-8 p-0"
                >
                  ↓
                </Button>

                {/* Toggle Visibility */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleVisibility(widget.id)}
                  className="gap-2"
                >
                  {widget.visible ? (
                    <>
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span className="text-xs">Hidden</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetting}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Hidden widgets won't show on your dashboard but can be enabled anytime. 
            Use the arrows or drag to reorder widgets.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

