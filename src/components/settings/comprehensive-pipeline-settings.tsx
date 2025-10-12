'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Settings, Save, AlertTriangle } from 'lucide-react'
import type { Pipeline, PipelineSettings, PipelineStage } from '@/types/database'

interface ComprehensivePipelineSettingsProps {
  pipelineId: string
  tenantId: string
}

export function ComprehensivePipelineSettings({ pipelineId, tenantId }: ComprehensivePipelineSettingsProps) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [settings, setSettings] = useState<Partial<PipelineSettings>>({})
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [pipelineId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .single()

      if (pipelineError) throw pipelineError
      setPipeline(pipelineData)

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('pipeline_settings')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') { // Not found is ok
        throw settingsError
      }

      setSettings(settingsData || {
        visibility: 'everyone',
        auto_assignment_enabled: false,
        enforce_stage_order: false,
        notify_on_stage_change: false,
        notify_on_stuck_deal: true,
        stuck_deal_threshold_days: 14,
        duplicate_prevention: true,
        require_treatment_tags: false
      })

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position')

      if (stagesError) throw stagesError
      setStages(stagesData || [])

    } catch (error) {
      console.error('Error loading pipeline settings:', error)
      toast.error('Failed to load pipeline settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: keyof PipelineSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('pipeline_settings')
        .upsert({
          pipeline_id: pipelineId,
          tenant_id: tenantId,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Pipeline settings saved successfully')
      setHasChanges(false)
      loadData()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !pipeline) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{pipeline.name} Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive configuration for this pipeline
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        )}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="stages">Stage Rules</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* GENERAL SETTINGS */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility & Access</CardTitle>
              <CardDescription>Control who can see this pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pipeline Visibility</Label>
                <Select
                  value={settings.visibility || 'everyone'}
                  onValueChange={(value) => updateSetting('visibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone (All team members)</SelectItem>
                    <SelectItem value="admins_only">Administrators Only</SelectItem>
                    <SelectItem value="specific_roles">Specific Roles...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pipeline Icon & Color</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Icon emoji"
                    value={settings.icon || ''}
                    onChange={(e) => updateSetting('icon', e.target.value)}
                    className="w-24"
                    maxLength={2}
                  />
                  <Input
                    type="color"
                    value={settings.color || '#6366f1'}
                    onChange={(e) => updateSetting('color', e.target.value)}
                    className="w-24 p-1"
                  />
                  <Input
                    value={settings.color || '#6366f1'}
                    onChange={(e) => updateSetting('color', e.target.value)}
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Validation</CardTitle>
              <CardDescription>Rules for deals in this pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Duplicate Prevention</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Warn before creating duplicate deals
                  </p>
                </div>
                <Switch
                  checked={settings.duplicate_prevention ?? true}
                  onCheckedChange={(checked) => updateSetting('duplicate_prevention', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Require Treatment Tags</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    All deals must have at least one treatment tag
                  </p>
                </div>
                <Switch
                  checked={settings.require_treatment_tags ?? false}
                  onCheckedChange={(checked) => updateSetting('require_treatment_tags', checked)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Deal Value (£)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={(settings.value_min_threshold_cents || 0) / 100}
                    onChange={(e) => updateSetting('value_min_threshold_cents', parseFloat(e.target.value || '0') * 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Deal Value (£)</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={(settings.value_max_threshold_cents || 0) / 100 || ''}
                    onChange={(e) => updateSetting('value_max_threshold_cents', e.target.value ? parseFloat(e.target.value) * 100 : null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTOMATION SETTINGS */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Assignment</CardTitle>
              <CardDescription>Automatically assign new deals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable Auto-Assignment</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    New deals will be automatically assigned
                  </p>
                </div>
                <Switch
                  checked={settings.auto_assignment_enabled ?? false}
                  onCheckedChange={(checked) => updateSetting('auto_assignment_enabled', checked)}
                />
              </div>

              {settings.auto_assignment_enabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      <strong>Auto-assignment rules</strong> let you define complex logic like:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>Deals > £10k → Senior dentist</li>
                      <li>Emergency deals → On-call staff</li>
                      <li>Referrals → Specific coordinator</li>
                      <li>Round-robin for new leads</li>
                    </ul>
                    <Button variant="outline" size="sm" className="mt-3">
                      Configure Rules (Coming Soon)
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhooks</CardTitle>
              <CardDescription>Trigger external systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://your-system.com/webhook"
                  value={settings.webhook_url || ''}
                  onChange={(e) => updateSetting('webhook_url', e.target.value)}
                />
              </div>
              <div className="text-xs text-gray-600">
                <strong>Webhook will be triggered on:</strong> Deal created, stage changed, deal won, deal lost
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STAGE RULES */}
        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Behavior</CardTitle>
              <CardDescription>Control how deals move through stages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enforce Stage Order</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Prevent deals from skipping stages (e.g., can't jump from New Lead to Closed Won)
                  </p>
                </div>
                <Switch
                  checked={settings.enforce_stage_order ?? false}
                  onCheckedChange={(checked) => updateSetting('enforce_stage_order', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Time Limits (SLA)</CardTitle>
              <CardDescription>Alert when deals stay too long in a stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.map(stage => (
                <div key={stage.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{stage.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="No limit"
                      className="w-24 h-8 text-sm"
                      value={(settings.stage_time_limits as any)?.[stage.id] || ''}
                      onChange={(e) => {
                        const limits = { ...(settings.stage_time_limits || {}) }
                        limits[stage.id] = e.target.value ? parseInt(e.target.value) : null
                        updateSetting('stage_time_limits', limits)
                      }}
                    />
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required Fields Per Stage</CardTitle>
              <CardDescription>Fields that must be filled before advancing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Example configuration:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>New Lead → Require: Phone, Email</li>
                  <li>Consultation → Require: Treatment tags, Value estimate</li>
                  <li>Treatment Plan → Require: Value, Payment method</li>
                  <li>Closed Won → Require: Final value, Completion date</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-3">
                  Configure Field Requirements (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Change Notifications</CardTitle>
              <CardDescription>Alert team when deals move</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Notify on Stage Change</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Send notification when deal moves to different stage
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_stage_change ?? false}
                  onCheckedChange={(checked) => updateSetting('notify_on_stage_change', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stuck Deal Alerts</CardTitle>
              <CardDescription>Get notified about stagnant deals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable Stuck Deal Alerts</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Alert when deals have no activity
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_stuck_deal ?? true}
                  onCheckedChange={(checked) => updateSetting('notify_on_stuck_deal', checked)}
                />
              </div>

              {settings.notify_on_stuck_deal && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Alert After (Days)</Label>
                  <Input
                    type="number"
                    value={settings.stuck_deal_threshold_days || 14}
                    onChange={(e) => updateSetting('stuck_deal_threshold_days', parseInt(e.target.value || '14'))}
                    className="w-32"
                  />
                  <p className="text-xs text-gray-600">
                    Alert if no activity for this many days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Templates Per Stage</CardTitle>
              <CardDescription>Auto-send emails when deals reach stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Email automation</strong> lets you automatically send:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Welcome email when deal is created</li>
                  <li>Consultation confirmation when appointment booked</li>
                  <li>Treatment plan when moved to proposal stage</li>
                  <li>Thank you email when deal is won</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-3">
                  Configure Email Templates (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED */}
        <TabsContent value="advanced" className="space-y-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base text-yellow-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Advanced Settings
              </CardTitle>
              <CardDescription className="text-yellow-700">
                These settings affect pipeline behavior. Change with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pipeline ID (Read-only)</Label>
                <code className="block p-2 bg-white rounded text-xs border">{pipelineId}</code>
              </div>

              <div className="space-y-2">
                <Label>Tenant ID (Read-only)</Label>
                <code className="block p-2 bg-white rounded text-xs border">{tenantId}</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white">Unsaved Changes</Badge>
              <span className="text-sm">You have unsaved pipeline settings</span>
            </div>
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

