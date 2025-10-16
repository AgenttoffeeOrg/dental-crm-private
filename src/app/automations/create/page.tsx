'use client'

/**
 * CREATE AUTOMATION PAGE
 * 
 * Unified creation page for all 4 automation categories.
 * Category is selected via query param: ?category=deal|pipeline|task|marketing
 * 
 * This is standalone - NOT under Marketing module.
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Play, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { AutomationCanvas } from '@/components/automations/automation-canvas'
import { useFeatureFlags } from '@/lib/hooks/use-feature-flags'

type Category = 'deal' | 'pipeline' | 'task' | 'marketing'

const CATEGORY_CONFIG = {
  deal: {
    label: 'Deal Automation',
    description: 'Automate deal workflows, stage transitions, and sales processes',
    color: 'blue',
    icon: '💼',
  },
  pipeline: {
    label: 'Pipeline Automation',
    description: 'Automate pipeline management, capacity monitoring, and health checks',
    color: 'green',
    icon: '📊',
  },
  task: {
    label: 'Task Automation',
    description: 'Automate task creation, escalations, reminders, and dependencies',
    color: 'orange',
    icon: '✅',
  },
  marketing: {
    label: 'Marketing Automation',
    description: 'Automate marketing workflows, nurture sequences, and campaigns',
    color: 'purple',
    icon: '📧',
  },
}

export default function CreateAutomationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { featureFlags } = useFeatureFlags()
  
  const [category, setCategory] = useState<Category>((searchParams.get('category') as Category) || 'deal')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableTriggers, setAvailableTriggers] = useState<any[]>([])
  
  const supabase = createClient()

  // Check if marketing is enabled
  const isMarketingEnabled = featureFlags?.marketing?.enabled ?? false

  // Redirect if trying to create marketing automation without feature enabled
  useEffect(() => {
    if (category === 'marketing' && !isMarketingEnabled) {
      toast.error('Marketing module is not enabled')
      router.push('/automations?tab=deal')
    }
  }, [category, isMarketingEnabled])

  // Load available triggers for selected category
  useEffect(() => {
    loadAvailableTriggers()
  }, [category])

  const loadAvailableTriggers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_automation_triggers_by_category', {
          p_category: category
        })

      if (error) throw error
      setAvailableTriggers(data || [])
    } catch (error) {
      console.error('Error loading triggers:', error)
    }
  }

  const handleSave = async (nodes: any[], edges: any[], shouldActivate: boolean = false) => {
    if (!name.trim()) {
      toast.error('Please enter an automation name')
      return
    }

    if (!triggerType) {
      toast.error('Please select a trigger')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('automations')
        .insert({
          tenant_id: appUser.tenant_id,
          category,
          name,
          description,
          trigger_type: triggerType,
          status: shouldActivate ? 'active' : 'draft',
          graph_json: {
            nodes,
            edges,
          },
          ...(shouldActivate && { activated_at: new Date().toISOString() }),
        })
        .select()
        .single()

      if (error) throw error

      toast.success(shouldActivate ? 'Automation created and activated!' : 'Automation created as draft')
      router.push('/automations')
    } catch (error) {
      console.error('Error creating automation:', error)
      toast.error('Failed to create automation')
    } finally {
      setLoading(false)
    }
  }

  const config = CATEGORY_CONFIG[category]

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/automations">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              
              <div className="flex-1 space-y-3">
                {/* Category Selector */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Category:</span>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger className="w-64">
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
                          {!isMarketingEnabled && <span className="text-xs">(Premium)</span>}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>

                {/* Name & Description */}
                <div className="space-y-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`${config.label} Name (e.g., "Deal Won → Thank You Series")`}
                    className="text-lg font-semibold"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>

                {/* Trigger Selector */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Trigger:</span>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger className="w-96">
                      <SelectValue placeholder="Select trigger event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTriggers.map(trigger => (
                        <SelectItem key={trigger.trigger_type} value={trigger.trigger_type}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{trigger.display_name}</span>
                            <span className="text-xs text-gray-500">- {trigger.description}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleSave([], [], false)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading}
                  onClick={() => handleSave([], [], true)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Save & Activate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          {triggerType ? (
            <AutomationCanvas 
              category={category}
              onSave={(nodes, edges) => handleSave(nodes, edges, false)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <Card className="p-12 text-center">
                <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Trigger to Begin
                </h3>
                <p className="text-gray-600">
                  Choose what event should start this automation
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

