'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Settings, Save, DollarSign, Tag, Archive, AlertTriangle } from 'lucide-react'
import type { DealSettings } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

export function ComprehensiveDealSettings({ tenantId }: { tenantId?: string }) {
  const [settings, setSettings] = useState<Partial<DealSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [tenantId])

  const loadSettings = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('deal_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error
      }

      setSettings(data || {
        required_fields: ['title', 'contact_id', 'pipeline_id'],
        value_min_cents: 0,
        allow_zero_value: true,
        currency_options: ['GBP', 'USD', 'EUR'],
        default_currency: 'GBP',
        duplicate_detection_enabled: true,
        duplicate_check_fields: ['contact_id', 'title'],
        required_treatment_tags: false,
        min_treatment_tags: 0,
        allow_unassigned: true,
        auto_assign_new_deals: false,
        assignment_method: 'manual'
      })
    } catch (error) {
      console.error('Error loading deal settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: keyof DealSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('deal_settings')
        .upsert({
          tenant_id: tenantId,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Deal settings saved successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save deal settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Deal Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure default rules and validation for all deals
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="validation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="values">Values & Currency</TabsTrigger>
          <TabsTrigger value="tags">Tags & Categorization</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>

        {/* VALIDATION */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required Fields</CardTitle>
              <CardDescription>Fields that must be filled when creating a deal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {['title', 'contact_id', 'pipeline_id', 'stage_id', 'value_estimate_cents', 'treatment_tags', 'source'].map(field => (
                <div key={field} className="flex items-center justify-between p-2">
                  <Label className="capitalize cursor-pointer" htmlFor={`field-${field}`}>
                    {field.replace(/_/g, ' ')}
                  </Label>
                  <Switch
                    id={`field-${field}`}
                    checked={settings.required_fields?.includes(field) ?? false}
                    onCheckedChange={(checked) => {
                      const fields = settings.required_fields || []
                      if (checked) {
                        updateSetting('required_fields', [...fields, field])
                      } else {
                        updateSetting('required_fields', fields.filter(f => f !== field))
                      }
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Duplicate Detection</CardTitle>
              <CardDescription>Prevent duplicate deals from being created</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable Duplicate Detection</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Warn before creating deals with same contact + title
                  </p>
                </div>
                <Switch
                  checked={settings.duplicate_detection_enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('duplicate_detection_enabled', checked)}
                />
              </div>

              {settings.duplicate_detection_enabled && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Check For Duplicates Using</Label>
                  <div className="space-y-2">
                    {['contact_id', 'title', 'value_estimate_cents', 'treatment_tags'].map(field => (
                      <div key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`dup-${field}`}
                          checked={settings.duplicate_check_fields?.includes(field) ?? false}
                          onChange={(e) => {
                            const fields = settings.duplicate_check_fields || []
                            if (e.target.checked) {
                              updateSetting('duplicate_check_fields', [...fields, field])
                            } else {
                              updateSetting('duplicate_check_fields', fields.filter(f => f !== field))
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`dup-${field}`} className="capitalize text-sm cursor-pointer">
                          {field.replace(/_/g, ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VALUES & CURRENCY */}
        <TabsContent value="values" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Currency Settings</CardTitle>
              <CardDescription>Configure currency options and defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select
                  value={settings.default_currency || 'GBP'}
                  onValueChange={(value) => updateSetting('default_currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Allow Zero Value Deals</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Permit deals with £0 value estimate
                  </p>
                </div>
                <Switch
                  checked={settings.allow_zero_value ?? true}
                  onCheckedChange={(checked) => updateSetting('allow_zero_value', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Value Range Validation</CardTitle>
              <CardDescription>Set acceptable deal value ranges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Value (£)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={(settings.value_min_cents || 0) / 100}
                    onChange={(e) => updateSetting('value_min_cents', parseFloat(e.target.value || '0') * 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Value (£)</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={(settings.value_max_cents || 0) / 100 || ''}
                    onChange={(e) => updateSetting('value_max_cents', e.target.value ? parseFloat(e.target.value) * 100 : null)}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Deals outside this range will show a warning
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAGS & CATEGORIZATION */}
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treatment Tag Rules</CardTitle>
              <CardDescription>Configure how treatment tags work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Require Treatment Tags</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    All deals must have at least one treatment tag
                  </p>
                </div>
                <Switch
                  checked={settings.required_treatment_tags ?? false}
                  onCheckedChange={(checked) => updateSetting('required_treatment_tags', checked)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Tags Required</Label>
                  <Input
                    type="number"
                    value={settings.min_treatment_tags || 0}
                    onChange={(e) => updateSetting('min_treatment_tags', parseInt(e.target.value || '0'))}
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Tags Allowed</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={settings.max_treatment_tags || ''}
                    onChange={(e) => updateSetting('max_treatment_tags', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSIGNMENT */}
        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Assignment Rules</CardTitle>
              <CardDescription>Control how deals are assigned to team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Allow Unassigned Deals</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Deals can exist without an owner
                  </p>
                </div>
                <Switch
                  checked={settings.allow_unassigned ?? true}
                  onCheckedChange={(checked) => updateSetting('allow_unassigned', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Auto-Assign New Deals</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Automatically assign deals when created
                  </p>
                </div>
                <Switch
                  checked={settings.auto_assign_new_deals ?? false}
                  onCheckedChange={(checked) => updateSetting('auto_assign_new_deals', checked)}
                />
              </div>

              {settings.auto_assign_new_deals && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Assignment Method</Label>
                  <Select
                    value={settings.assignment_method || 'manual'}
                    onValueChange={(value) => updateSetting('assignment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (No auto-assign)</SelectItem>
                      <SelectItem value="round_robin">Round Robin (Distribute evenly)</SelectItem>
                      <SelectItem value="by_value">By Value (High value → Senior staff)</SelectItem>
                      <SelectItem value="by_source">By Source (Referral → Specific person)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIFECYCLE */}
        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Archive Settings</CardTitle>
              <CardDescription>Automatically clean up old deals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Auto-Archive After (Days)</Label>
                <Input
                  type="number"
                  placeholder="Never (leave empty)"
                  value={settings.auto_archive_after_days || ''}
                  onChange={(e) => updateSetting('auto_archive_after_days', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-48"
                />
                <p className="text-xs text-gray-600">
                  Deals with no activity will be archived automatically
                </p>
              </div>

              <div className="space-y-2">
                <Label>Auto-Close Lost Deals After (Days)</Label>
                <Input
                  type="number"
                  placeholder="Never (leave empty)"
                  value={settings.auto_close_lost_after_days || ''}
                  onChange={(e) => updateSetting('auto_close_lost_after_days', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-48"
                />
                <p className="text-xs text-gray-600">
                  Stale deals will automatically move to lost stage
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base text-yellow-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Win/Loss Stage Configuration
              </CardTitle>
              <CardDescription className="text-yellow-700">
                Define which stages count as "won" or "lost" for analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">
                  This setting helps calculate win rates and conversion metrics. Mark stages that represent:
                </p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li><strong>Won:</strong> Treatment accepted, payment received, etc.</li>
                  <li><strong>Lost:</strong> Declined, no response, went elsewhere, etc.</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-4">
                  Configure Won/Lost Stages (Coming Soon)
                </Button>
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
              <span className="text-sm">You have unsaved deal settings</span>
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


