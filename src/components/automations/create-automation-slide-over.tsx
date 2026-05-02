'use client'

/**
 * CREATE AUTOMATION SLIDE-OVER
 * 
 * Right-side slide-over panel for creating automations.
 * Matches CRM pattern (like create-contact, create-deal, etc.)
 * 
 * Supports all 4 categories: Deal, Pipeline, Task, Marketing
 */

import { useState, useEffect } from 'react'
import { X, Save, Play, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { toast } from 'sonner'
import { useFeatureFlags } from '@/lib/hooks/use-feature-flags'

type Category = 'deal' | 'pipeline' | 'task' | 'marketing'

interface CreateAutomationSlideOverProps {
  open: boolean
  onClose: () => void
  onAutomationCreated: () => void
  initialCategory?: Category
  tenantId?: string
}

const CATEGORY_CONFIG = {
  deal: {
    label: 'Deal Automation',
    description: 'Automate deal workflows, stage transitions, and sales processes',
    color: 'blue',
    icon: '💼',
    examples: ['Deal won → send thank-you', 'High-value deal → notify senior closer', 'Deal aging → send reminder']
  },
  pipeline: {
    label: 'Pipeline Automation',
    description: 'Automate pipeline management, capacity monitoring, and health checks',
    color: 'green',
    icon: '📊',
    examples: ['Pipeline at 80% → pause intake', 'Bottleneck detected → alert manager', 'Slow velocity → generate report']
  },
  task: {
    label: 'Task Automation',
    description: 'Automate task creation, escalations, reminders, and dependencies',
    color: 'orange',
    icon: '✅',
    examples: ['Task overdue 24h → escalate to manager', 'Task completed → create next task', 'Due in 1h → send reminder']
  },
  marketing: {
    label: 'Marketing Automation',
    description: 'Automate marketing workflows, nurture sequences, and campaigns',
    color: 'purple',
    icon: '📧',
    examples: ['Form submitted → welcome series', 'Email opened → send follow-up', 'Contact inactive → win-back campaign']
  },
}

export function CreateAutomationSlideOver({
  open,
  onClose,
  onAutomationCreated,
  initialCategory = 'deal',
  tenantId,
}: CreateAutomationSlideOverProps) {
  const [category, setCategory] = useState<Category>(initialCategory)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [availableTriggers, setAvailableTriggers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTriggers, setLoadingTriggers] = useState(false)
  
  const supabase = createClient()
  const { featureFlags } = useFeatureFlags()
  const isMarketingEnabled = featureFlags?.marketing?.enabled ?? false

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setCategory(initialCategory)
      setName('')
      setDescription('')
      setTriggerType('')
      loadAvailableTriggers(initialCategory)
    }
  }, [open, initialCategory])

  // Load triggers when category changes
  useEffect(() => {
    if (category) {
      loadAvailableTriggers(category)
    }
  }, [category])

  const loadAvailableTriggers = async (cat: Category) => {
    setLoadingTriggers(true)
    try {
      const { data, error } = await supabase
        .rpc('get_automation_triggers_by_category', {
          p_category: cat
        })

      if (error) throw error
      setAvailableTriggers(data || [])
    } catch (error) {
      console.error('Error loading triggers:', error)
      toast.error('Failed to load triggers')
    } finally {
      setLoadingTriggers(false)
    }
  }

  const handleSubmit = async (shouldActivate: boolean = false) => {
    // Validation
    if (!name.trim()) {
      toast.error('Please enter an automation name')
      return
    }

    if (!triggerType) {
      toast.error('Please select a trigger')
      return
    }

    // Check marketing permission
    if (category === 'marketing' && !isMarketingEnabled) {
      toast.error('Marketing module is not enabled')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('automations')
        .insert({
          tenant_id: tenantId,
          category,
          name,
          description: description || null,
          trigger_type: triggerType,
          status: shouldActivate ? 'active' : 'draft',
          graph_json: {
            nodes: [],
            edges: [],
          },
          ...(shouldActivate && { activated_at: new Date().toISOString() }),
        })
        .select()
        .single()

      if (error) throw error

      toast.success(
        shouldActivate 
          ? '✅ Automation created and activated!' 
          : '✅ Automation created as draft'
      )
      
      onAutomationCreated()
      onClose()
      
      // Reset form
      setName('')
      setDescription('')
      setTriggerType('')
    } catch (error) {
      console.error('Error creating automation:', error)
      toast.error('Failed to create automation')
    } finally {
      setLoading(false)
    }
  }

  const config = CATEGORY_CONFIG[category]

  // Don't render if not open
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close automation creation panel"
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {config.icon} Create {config.label}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Category Selector */}
          <div className="space-y-2">
            <Label>Automation Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deal">
                  <span className="flex items-center gap-2">
                    💼 Deal Automation
                  </span>
                </SelectItem>
                <SelectItem value="pipeline">
                  <span className="flex items-center gap-2">
                    📊 Pipeline Automation
                  </span>
                </SelectItem>
                <SelectItem value="task">
                  <span className="flex items-center gap-2">
                    ✅ Task Automation
                  </span>
                </SelectItem>
                <SelectItem value="marketing" disabled={!isMarketingEnabled}>
                  <span className="flex items-center gap-2">
                    📧 Marketing Automation
                    {!isMarketingEnabled && <span className="text-xs text-gray-500">(Premium)</span>}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Automation Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., "${config.examples[0]}"`}
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this automation does..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Trigger Selector */}
          <div className="space-y-2">
            <Label>
              Trigger Event <span className="text-red-500">*</span>
            </Label>
            <Select value={triggerType} onValueChange={setTriggerType} disabled={loadingTriggers}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingTriggers ? "Loading triggers..." : "Select when this automation should run..."} />
              </SelectTrigger>
              <SelectContent>
                {availableTriggers.map(trigger => (
                  <SelectItem key={trigger.trigger_type} value={trigger.trigger_type}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{trigger.display_name}</span>
                      <span className="text-xs text-gray-500">{trigger.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {triggerType && (
              <p className="text-xs text-gray-500 mt-1">
                ✓ Automation will trigger when this event occurs
              </p>
            )}
          </div>

          {/* Examples */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Example Workflows</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {config.examples.map((example, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Marketing Locked Warning */}
          {category === 'marketing' && !isMarketingEnabled && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-purple-900 mb-1">Marketing Module Required</h4>
                  <p className="text-sm text-purple-800">
                    Marketing automations require the Marketing module to be enabled.
                    Enable it in Settings to unlock this feature.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">After Creating:</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Click the automation to open the visual builder</li>
              <li>Add actions (send email, create task, etc.)</li>
              <li>Test with simulation mode</li>
              <li>Activate when ready</li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(false)}
              disabled={loading || !name.trim() || !triggerType}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button 
              onClick={() => handleSubmit(true)}
              disabled={loading || !name.trim() || !triggerType}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create & Activate'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

