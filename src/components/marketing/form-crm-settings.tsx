/**
 * FORM CRM SETTINGS
 * Configure auto-create deal rules for marketing forms
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

interface FormCRMSettingsProps {
  formId: string;
  tenantId: string;
  pipelines?: Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }>;
  users?: Array<{ id: string; full_name: string }>;
}

export function FormCRMSettings({ formId, tenantId, pipelines = [], users = [] }: FormCRMSettingsProps) {
  const [autoCreateDeal, setAutoCreateDeal] = useState(false);
  const [targetPipelineId, setTargetPipelineId] = useState('');
  const [defaultStageId, setDefaultStageId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [autoAssignOwner, setAutoAssignOwner] = useState(false);
  const [assignmentRule, setAssignmentRule] = useState<'round_robin' | 'tag_based' | 'territory_based'>('round_robin');
  const [tagBasedConfig, setTagBasedConfig] = useState('{}');
  const [territoryConfig, setTerritoryConfig] = useState('{}');
  const [saving, setSaving] = useState(false);

  const selectedPipeline = pipelines.find(p => p.id === targetPipelineId);

  async function handleSave() {
    setSaving(true);

    try {
      // Save to database or local storage
      const settings = {
        autoCreateDeal,
        targetPipelineId,
        defaultStageId,
        dealValue: dealValue ? parseFloat(dealValue) : undefined,
        autoAssignOwner,
        assignmentRule,
        assignmentConfig: assignmentRule === 'tag_based' ? JSON.parse(tagBasedConfig) : 
                         assignmentRule === 'territory_based' ? JSON.parse(territoryConfig) : {},
      };

      // Store in form settings (you can save to DB here)
      localStorage.setItem(`form_crm_settings_${formId}`, JSON.stringify(settings));

      toast.success('Form CRM settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-blue-600" />
          CRM Integration Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-create Deal Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-create-deal">Auto-create Deal</Label>
            <div className="text-sm text-gray-500">
              Automatically create a deal when this form is submitted
            </div>
          </div>
          <Switch
            id="auto-create-deal"
            checked={autoCreateDeal}
            onCheckedChange={setAutoCreateDeal}
          />
        </div>

        {autoCreateDeal && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            {/* Target Pipeline */}
            <div className="space-y-2">
              <Label htmlFor="target-pipeline">Target Pipeline *</Label>
              <Select value={targetPipelineId} onValueChange={setTargetPipelineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Default Stage */}
            {selectedPipeline && (
              <div className="space-y-2">
                <Label htmlFor="default-stage">Default Stage *</Label>
                <Select value={defaultStageId} onValueChange={setDefaultStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPipeline.stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Deal Value */}
            <div className="space-y-2">
              <Label htmlFor="deal-value">Default Deal Value (optional)</Label>
              <Input
                id="deal-value"
                type="number"
                placeholder="e.g., 1500"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
              />
              <div className="text-xs text-gray-500">
                Leave blank to create deal with no value
              </div>
            </div>

            {/* Auto-assign Owner */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-assign">Auto-assign Owner</Label>
                <div className="text-sm text-gray-500">
                  Automatically assign deals to team members
                </div>
              </div>
              <Switch
                id="auto-assign"
                checked={autoAssignOwner}
                onCheckedChange={setAutoAssignOwner}
              />
            </div>

            {/* Assignment Rule */}
            {autoAssignOwner && (
              <div className="space-y-4 pl-4 border-l-2 border-green-200">
                <div className="space-y-2">
                  <Label htmlFor="assignment-rule">Assignment Strategy</Label>
                  <Select value={assignmentRule} onValueChange={(v: any) => setAssignmentRule(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">Round Robin (rotate through team)</SelectItem>
                      <SelectItem value="tag_based">Tag-Based (assign by contact tags)</SelectItem>
                      <SelectItem value="territory_based">Territory-Based (assign by location)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assignmentRule === 'tag_based' && (
                  <div className="space-y-2">
                    <Label htmlFor="tag-config">Tag Assignment Rules (JSON)</Label>
                    <Input
                      id="tag-config"
                      placeholder='{"vip": "user-id-here", "urgent": "user-id-here"}'
                      value={tagBasedConfig}
                      onChange={(e) => setTagBasedConfig(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <div className="text-xs text-gray-500">
                      Map tags to user IDs: {`{"tag_name": "user_id"}`}
                    </div>
                  </div>
                )}

                {assignmentRule === 'territory_based' && (
                  <div className="space-y-2">
                    <Label htmlFor="territory-config">Territory Assignment Rules (JSON)</Label>
                    <Input
                      id="territory-config"
                      placeholder='{"London": "user-id-here", "Manchester": "user-id-here"}'
                      value={territoryConfig}
                      onChange={(e) => setTerritoryConfig(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <div className="text-xs text-gray-500">
                      Map cities/regions to user IDs: {`{"city": "user_id"}`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            'Saving...'
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save CRM Settings
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg">
          <strong>Note:</strong> When a form is submitted with these settings, the system will:
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Create/update a CRM contact</li>
            {autoCreateDeal && <li>Create a deal in the selected pipeline</li>}
            {autoCreateDeal && autoAssignOwner && <li>Assign the deal using {assignmentRule.replace('_', ' ')} strategy</li>}
            {autoCreateDeal && autoAssignOwner && <li>Create a follow-up task for the assigned owner</li>}
            <li>Track first-touch attribution</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


