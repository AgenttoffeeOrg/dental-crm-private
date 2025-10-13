'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export function TaskAutomationSettings() {
  const [stages, setStages] = useState<any[]>([])
  const [taskTemplates, setTaskTemplates] = useState<any[]>([])
  const [automations, setAutomations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Load pipeline stages
      const { data: stagesData } = await supabase
        .from('pipeline_stages')
        .select('*, pipeline:pipelines(name)')
        .order('position')
      
      setStages(stagesData || [])

      // Load task templates
      const { data: templatesData } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      setTaskTemplates(templatesData || [])

      // Load existing automations
      const { data: automationsData } = await supabase
        .from('task_templates')
        .select('*')
        .not('trigger_stage_id', 'is', null)
        .eq('is_active', true)
      
      setAutomations(automationsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addAutomation = async (templateId: string, stageId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('task_templates')
        .update({ trigger_stage_id: stageId })
        .eq('id', templateId)

      if (error) throw error
      toast.success('Automation added!')
      await loadData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to add automation')
    }
  }

  const removeAutomation = async (templateId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('task_templates')
        .update({ trigger_stage_id: null })
        .eq('id', templateId)

      if (error) throw error
      toast.success('Automation removed')
      await loadData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to remove automation')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Task Automation</h2>
        <p className="text-gray-500 mt-1">Auto-create tasks when deals move between stages</p>
      </div>

      {/* Active Automations */}
      <Card>
        <CardHeader>
          <CardTitle>Active Automations</CardTitle>
          <CardDescription>
            Tasks that are automatically created when deals enter specific stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {automations.map((automation) => {
            const stage = stages.find(s => s.id === automation.trigger_stage_id)
            
            return (
              <div key={automation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {automation.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      When deal enters: <Badge variant="outline" className="ml-1">{stage?.name || 'Unknown Stage'}</Badge>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAutomation(automation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}

          {automations.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No automations configured yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create New Automation */}
      <Card>
        <CardHeader>
          <CardTitle>Create Automation Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Task Template</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {taskTemplates.filter(t => !t.trigger_stage_id).map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trigger When Deal Enters</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.pipeline?.name} → {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Assignment Rules</CardTitle>
          <CardDescription>Automatically assign tasks to users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Assign to Deal Owner</p>
              <p className="text-xs text-gray-500">Auto-assign tasks to whoever owns the associated deal</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Round-Robin Assignment</p>
              <p className="text-xs text-gray-500">Distribute tasks evenly across team members</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Based on Availability</p>
              <p className="text-xs text-gray-500">Assign to users with lightest task load</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


