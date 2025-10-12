'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Bot, Plus, X, Save, Sparkles, Mail, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface AIPreferences {
  response_style: string
  ai_model: string
  auto_actions: string[]
  focus_areas: string[]
  custom_rules: string[]
  email_draft_settings: {
    opening: string
    closing: string
    tone: string
  }
  notification_preferences: {
    cold_leads_days: number
    high_value_threshold: number
  }
}

export function AIAssistantSettingsTab({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [preferences, setPreferences] = useState<AIPreferences>({
    response_style: 'friendly',
    ai_model: 'gpt-4-turbo-preview',
    auto_actions: ['draft_emails', 'suggest_tasks', 'detect_cold_leads'],
    focus_areas: ['closing_deals', 'patient_satisfaction'],
    custom_rules: [
      "For deals over £5,000, always mention payment plan options",
      "If patient mentions anxiety, emphasize sedation and comfort options"
    ],
    email_draft_settings: {
      opening: 'warm',
      closing: 'warm_regards',
      tone: 'professional_friendly'
    },
    notification_preferences: {
      cold_leads_days: 7,
      high_value_threshold: 5000
    }
  })
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_assistant_preferences')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (!error && data) {
        setPreferences({
          response_style: data.response_style,
          ai_model: data.ai_model,
          auto_actions: data.auto_actions,
          focus_areas: data.focus_areas,
          custom_rules: data.custom_rules,
          email_draft_settings: data.email_draft_settings,
          notification_preferences: data.notification_preferences
        })
      }
    } catch (error) {
      console.error('Error loading AI preferences:', JSON.stringify(error, null, 2))
      // Use defaults
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('ai_assistant_preferences')
        .upsert({
          tenant_id: tenantId,
          user_id: '550e8400-e29b-41d4-a716-446655440000', // TODO: Get from auth
          response_style: preferences.response_style,
          ai_model: preferences.ai_model,
          auto_actions: preferences.auto_actions,
          focus_areas: preferences.focus_areas,
          custom_rules: preferences.custom_rules,
          email_draft_settings: preferences.email_draft_settings,
          notification_preferences: preferences.notification_preferences,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('AI settings saved successfully!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save AI settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleAutoAction = (action: string) => {
    setPreferences(prev => ({
      ...prev,
      auto_actions: prev.auto_actions.includes(action)
        ? prev.auto_actions.filter(a => a !== action)
        : [...prev.auto_actions, action]
    }))
  }

  const toggleFocusArea = (area: string) => {
    setPreferences(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area]
    }))
  }

  const addCustomRule = () => {
    if (!newRule.trim()) return
    
    setPreferences(prev => ({
      ...prev,
      custom_rules: [...prev.custom_rules, newRule.trim()]
    }))
    setNewRule('')
    toast.success('Custom rule added!')
  }

  const removeCustomRule = (index: number) => {
    setPreferences(prev => ({
      ...prev,
      custom_rules: prev.custom_rules.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          AI Assistant Configuration
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Customize how your AI assistant behaves and what it does automatically
        </p>
      </div>

      {/* Response Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response Style</CardTitle>
          <CardDescription>How should the AI communicate?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={preferences.response_style}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, response_style: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional & Formal</SelectItem>
              <SelectItem value="friendly">Friendly & Conversational</SelectItem>
              <SelectItem value="concise">Concise & Direct</SelectItem>
              <SelectItem value="detailed">Detailed & Thorough</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* AI Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Model</CardTitle>
          <CardDescription>Choose the AI model (affects cost and quality)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={preferences.ai_model}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, ai_model: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4-turbo-preview">
                GPT-4 Turbo (Smartest, ~£0.04/query) ⭐ Recommended
              </SelectItem>
              <SelectItem value="gpt-4">
                GPT-4 (Very Smart, ~£0.08/query)
              </SelectItem>
              <SelectItem value="gpt-3.5-turbo">
                GPT-3.5 Turbo (Fast, ~£0.002/query)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Auto-Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automatic Actions
          </CardTitle>
          <CardDescription>What should AI do automatically without asking?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'draft_emails', label: 'Auto-draft email responses', desc: 'Generate draft when email received' },
            { id: 'suggest_tasks', label: 'Suggest follow-up tasks', desc: 'Create task suggestions based on conversations' },
            { id: 'detect_cold_leads', label: 'Detect and alert cold leads', desc: 'Notify when deal inactive >7 days' },
            { id: 'analyze_sentiment', label: 'Monitor sentiment changes', desc: 'Alert when patient sentiment turns negative' },
            { id: 'identify_opportunities', label: 'Highlight high-value opportunities', desc: 'Flag deals >£10k that need attention' },
            { id: 'generate_daily_briefing', label: 'Generate daily briefing', desc: 'Morning summary of priority deals' }
          ].map(action => (
            <div key={action.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label className="cursor-pointer font-medium">{action.label}</Label>
                <p className="text-xs text-gray-600 mt-1">{action.desc}</p>
              </div>
              <Switch
                checked={preferences.auto_actions.includes(action.id)}
                onCheckedChange={() => toggleAutoAction(action.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Focus Areas</CardTitle>
          <CardDescription>What should AI prioritize when giving advice?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'closing_deals', label: 'Maximizing Close Rates' },
            { id: 'deal_value', label: 'Increasing Deal Value' },
            { id: 'patient_satisfaction', label: 'Patient Satisfaction' },
            { id: 'response_time', label: 'Fast Response Times' },
            { id: 'payment_plans', label: 'Payment Plan Optimization' }
          ].map(area => (
            <div key={area.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="cursor-pointer">{area.label}</Label>
              <Switch
                checked={preferences.focus_areas.includes(area.id)}
                onCheckedChange={() => toggleFocusArea(area.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Custom AI Rules
          </CardTitle>
          <CardDescription>Teach the AI your specific practices and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Rules */}
          <div className="space-y-2">
            {preferences.custom_rules.map((rule, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="flex-1 text-sm text-gray-900">{rule}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomRule(index)}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Rule */}
          <div className="flex gap-2">
            <Textarea
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="e.g., 'For orthodontic deals, always mention financing options and treatment timeline'"
              rows={2}
              className="flex-1"
            />
            <Button onClick={addCustomRule} disabled={!newRule.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            💡 Examples: "Always ask about insurance for deals &gt;£3k", "Mention sedation for anxious patients", "Include video links for complex treatments"
          </p>
        </CardContent>
      </Card>

      {/* Email Draft Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Draft Preferences
          </CardTitle>
          <CardDescription>Customize AI-generated email style</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Opening Style</Label>
              <Select
                value={preferences.email_draft_settings.opening}
                onValueChange={(value) => setPreferences(prev => ({
                  ...prev,
                  email_draft_settings: { ...prev.email_draft_settings, opening: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm">Warm ("Thank you for your email")</SelectItem>
                  <SelectItem value="professional">Professional ("I appreciate your inquiry")</SelectItem>
                  <SelectItem value="brief">Brief ("Hi [Name],")</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Closing Style</Label>
              <Select
                value={preferences.email_draft_settings.closing}
                onValueChange={(value) => setPreferences(prev => ({
                  ...prev,
                  email_draft_settings: { ...prev.email_draft_settings, closing: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm_regards">Warm regards,</SelectItem>
                  <SelectItem value="best_regards">Best regards,</SelectItem>
                  <SelectItem value="thanks">Thanks,</SelectItem>
                  <SelectItem value="sincerely">Sincerely,</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Overall Tone</Label>
            <Select
              value={preferences.email_draft_settings.tone}
              onValueChange={(value) => setPreferences(prev => ({
                ...prev,
                email_draft_settings: { ...prev.email_draft_settings, tone: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional_friendly">Professional & Friendly</SelectItem>
                <SelectItem value="strictly_professional">Strictly Professional</SelectItem>
                <SelectItem value="casual_warm">Casual & Warm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proactive Notifications</CardTitle>
          <CardDescription>When should AI alert you?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Alert for Cold Leads After (Days)</Label>
            <Input
              type="number"
              min="1"
              max="30"
              value={preferences.notification_preferences.cold_leads_days}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                notification_preferences: {
                  ...prev.notification_preferences,
                  cold_leads_days: parseInt(e.target.value) || 7
                }
              }))}
            />
          </div>

          <div>
            <Label>High-Value Deal Threshold (£)</Label>
            <Input
              type="number"
              min="1000"
              step="1000"
              value={preferences.notification_preferences.high_value_threshold}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                notification_preferences: {
                  ...prev.notification_preferences,
                  high_value_threshold: parseInt(e.target.value) || 5000
                }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save AI Configuration'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            What Your AI Assistant Can Do
          </h4>
          <ul className="space-y-2 text-sm text-blue-900">
            <li>✓ Answer questions about any deal or patient instantly</li>
            <li>✓ Analyze all 20+ conversations to give you smart insights</li>
            <li>✓ Auto-draft professional email responses</li>
            <li>✓ Suggest next best actions based on data</li>
            <li>✓ Identify hot leads and cold leads automatically</li>
            <li>✓ Monitor sentiment and alert on changes</li>
            <li>✓ Help you prioritize your day for maximum conversions</li>
            <li>✓ Learn from your custom rules and preferences</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

