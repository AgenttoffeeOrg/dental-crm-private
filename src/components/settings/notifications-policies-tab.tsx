'use client'

/**
 * Notification Policies Tab (ADMIN ONLY)
 * 
 * Org-level notification governance:
 * - Role defaults (what each role receives by default)
 * - Escalation rules (auto-escalate unread notifications)
 * - Rate limits (prevent notification spam)
 * - Data retention (auto-delete old notifications)
 * - Compliance settings (GDPR/CCPA)
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Users, TrendingUp, Clock, Save, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'

export function NotificationsPoliciesTab() {
  const { appUser, tenant } = useAuth()
  const [policies, setPolicies] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Only admins/owners can access
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'owner'
  
  useEffect(() => {
    if (tenant?.id && isAdmin) {
      loadPolicies()
    }
  }, [tenant?.id, isAdmin])
  
  const loadPolicies = async () => {
    if (!tenant?.id) return
    
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('notification_policies')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      // Set defaults if no policies exist
      setPolicies(data || {
        role_defaults: {
          owner: { channels: ['in_app', 'email', 'sms'], events: ['*'] },
          admin: { channels: ['in_app', 'email'], events: ['*'] },
          manager: { channels: ['in_app', 'email'], events: ['deal.*', 'task.*', 'contact.*'] },
          staff: { channels: ['in_app'], events: ['task.assigned', 'deal.assigned'] },
          marketing: { channels: ['in_app', 'email'], events: ['campaign.*', 'form.*', 'audit.*'] },
        },
        escalation_rules: [],
        rate_limits: {
          max_per_hour: 50,
          max_emails_per_day: 100,
          max_sms_per_day: 10,
          batch_delay_minutes: 5,
        },
        retention_days: 90,
        require_email_opt_in: false,
        require_sms_opt_in: true,
        allow_notification_export: true,
      })
    } catch (error) {
      console.error('[Policies] Error loading:', error)
      toast.error('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSave = async () => {
    if (!tenant?.id) return
    
    setSaving(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('notification_policies')
        .upsert({
          tenant_id: tenant.id,
          ...policies,
        })
      
      if (error) throw error
      
      toast.success('Notification policies saved')
    } catch (error) {
      console.error('[Policies] Error saving:', error)
      toast.error('Failed to save policies')
    } finally {
      setSaving(false)
    }
  }
  
  if (!isAdmin) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Only admins can manage notification policies</p>
      </Card>
    )
  }
  
  if (loading || !policies) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Notification Policies</h3>
        <p className="text-sm text-gray-600">Organization-wide notification governance</p>
      </div>
      
      {/* Role Defaults */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold">Role Defaults</h4>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          New users will inherit these notification settings based on their role
        </p>
        
        <div className="space-y-4">
          {Object.entries(policies.role_defaults || {}).map(([role, config]: [string, any]) => (
            <div key={role} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Badge className="capitalize text-sm">{role}</Badge>
                <p className="text-xs text-gray-600">
                  {config.channels?.join(', ')} • {config.events?.length || 0} events
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Channels</Label>
                  <p className="text-xs text-gray-700 mt-1">
                    {config.channels?.join(', ') || 'None'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Events</Label>
                  <p className="text-xs text-gray-700 mt-1">
                    {config.events?.[0] === '*' ? 'All events' : `${config.events?.length || 0} events`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Rate Limits */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <h4 className="font-semibold">Rate Limits (Anti-Spam)</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max Notifications Per Hour (Per User)</Label>
            <Input
              type="number"
              value={policies.rate_limits?.max_per_hour || 50}
              onChange={(e) => setPolicies({
                ...policies,
                rate_limits: { ...policies.rate_limits, max_per_hour: parseInt(e.target.value) }
              })}
            />
            <p className="text-xs text-gray-600 mt-1">Prevents notification spam</p>
          </div>
          
          <div>
            <Label>Max Emails Per Day (Per User)</Label>
            <Input
              type="number"
              value={policies.rate_limits?.max_emails_per_day || 100}
              onChange={(e) => setPolicies({
                ...policies,
                rate_limits: { ...policies.rate_limits, max_emails_per_day: parseInt(e.target.value) }
              })}
            />
          </div>
          
          <div>
            <Label>Max SMS Per Day (Per User)</Label>
            <Input
              type="number"
              value={policies.rate_limits?.max_sms_per_day || 10}
              onChange={(e) => setPolicies({
                ...policies,
                rate_limits: { ...policies.rate_limits, max_sms_per_day: parseInt(e.target.value) }
              })}
            />
          </div>
          
          <div>
            <Label>Batch Delay (Minutes)</Label>
            <Input
              type="number"
              value={policies.rate_limits?.batch_delay_minutes || 5}
              onChange={(e) => setPolicies({
                ...policies,
                rate_limits: { ...policies.rate_limits, batch_delay_minutes: parseInt(e.target.value) }
              })}
            />
            <p className="text-xs text-gray-600 mt-1">Batch similar notifications</p>
          </div>
        </div>
      </Card>
      
      {/* Data Retention */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-indigo-600" />
          <h4 className="font-semibold">Data Retention</h4>
        </div>
        
        <div>
          <Label>Auto-Delete After (Days)</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={policies.retention_days || 90}
              onChange={(e) => setPolicies({ ...policies, retention_days: parseInt(e.target.value) })}
              className="w-32"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Notifications older than this will be automatically deleted
          </p>
        </div>
      </Card>
      
      {/* Compliance */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-green-600" />
          <h4 className="font-semibold">Compliance (GDPR/CCPA)</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Email Opt-In</Label>
              <p className="text-xs text-gray-600">Users must explicitly consent to email notifications</p>
            </div>
            <Switch
              checked={policies.require_email_opt_in}
              onCheckedChange={(checked) => setPolicies({ ...policies, require_email_opt_in: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Require SMS Opt-In</Label>
              <p className="text-xs text-gray-600">Users must explicitly consent to SMS (recommended for compliance)</p>
            </div>
            <Switch
              checked={policies.require_sms_opt_in}
              onCheckedChange={(checked) => setPolicies({ ...policies, require_sms_opt_in: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Notification Export</Label>
              <p className="text-xs text-gray-600">Users can export their notification history (GDPR right to access)</p>
            </div>
            <Switch
              checked={policies.allow_notification_export}
              onCheckedChange={(checked) => setPolicies({ ...policies, allow_notification_export: checked })}
            />
          </div>
        </div>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadPolicies}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Policies'}
        </Button>
      </div>
    </div>
  )
}

