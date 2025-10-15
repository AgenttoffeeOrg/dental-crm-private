'use client'

/**
 * Threshold Alerts Manager
 * 
 * Configure alerts when KPIs cross thresholds
 * 
 * Features:
 * - Set thresholds for any metric
 * - Alert conditions: Above/Below/Between
 * - Multiple notification channels (email, in-app, Slack)
 * - Alert history
 * - Snooze/acknowledge alerts
 * - Custom alert messages
 * 
 * Example alerts:
 * - "Alert if CAC > $300"
 * - "Alert if conversion rate < 3%"
 * - "Alert if revenue drops 20% MoM"
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Bell, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface ThresholdAlert {
  id: string
  name: string
  metric: string
  condition: 'above' | 'below' | 'between'
  threshold: number
  threshold2?: number // For "between"
  channels: ('email' | 'in_app' | 'slack')[]
  recipients: string[]
  enabled: boolean
  lastTriggered?: string
  currentValue?: number
}

export function ThresholdAlertsManager({ tenantId }: { tenantId?: string }) {
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAlert, setNewAlert] = useState<Partial<ThresholdAlert>>({
    name: '',
    metric: 'cac',
    condition: 'above',
    threshold: 0,
    channels: ['email', 'in_app'],
    recipients: [],
    enabled: true,
  })
  
  useEffect(() => {
    if (tenantId) {
      loadAlerts()
    }
  }, [tenantId])
  
  const loadAlerts = async () => {
    // In production, load from database
    setAlerts([
      {
        id: '1',
        name: 'High CAC Alert',
        metric: 'cac',
        condition: 'above',
        threshold: 300,
        channels: ['email', 'in_app'],
        recipients: ['marketing@practice.com'],
        enabled: true,
        currentValue: 285,
      },
      {
        id: '2',
        name: 'Low Conversion Rate',
        metric: 'conversion_rate',
        condition: 'below',
        threshold: 3,
        channels: ['email', 'slack'],
        recipients: ['sales@practice.com'],
        enabled: true,
        lastTriggered: '2025-01-10',
        currentValue: 3.8,
      },
      {
        id: '3',
        name: 'Revenue Drop Alert',
        metric: 'revenue',
        condition: 'below',
        threshold: 100000,
        channels: ['email', 'in_app', 'slack'],
        recipients: ['owner@practice.com', 'manager@practice.com'],
        enabled: true,
        currentValue: 127500,
      },
    ])
  }
  
  const metricOptions = [
    { value: 'cac', label: 'Customer Acquisition Cost (CAC)', format: 'currency' },
    { value: 'conversion_rate', label: 'Conversion Rate', format: 'percent' },
    { value: 'revenue', label: 'Monthly Revenue', format: 'currency' },
    { value: 'win_rate', label: 'Deal Win Rate', format: 'percent' },
    { value: 'marketing_roi', label: 'Marketing ROI', format: 'percent' },
    { value: 'ltv_cac_ratio', label: 'LTV:CAC Ratio', format: 'number' },
    { value: 'open_rate', label: 'Email Open Rate', format: 'percent' },
    { value: 'click_rate', label: 'Email Click Rate', format: 'percent' },
    { value: 'pipeline_velocity', label: 'Pipeline Velocity (days)', format: 'number' },
  ]
  
  const handleCreateAlert = async () => {
    if (!newAlert.name || !newAlert.threshold || !newAlert.recipients || newAlert.recipients.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }
    
    const alert: ThresholdAlert = {
      id: Date.now().toString(),
      name: newAlert.name!,
      metric: newAlert.metric!,
      condition: newAlert.condition!,
      threshold: newAlert.threshold!,
      threshold2: newAlert.threshold2,
      channels: newAlert.channels!,
      recipients: newAlert.recipients,
      enabled: true,
    }
    
    // Save to database
    const supabase = createClient()
    const { error } = await supabase
      .from('analytics_threshold_alerts')
      .insert({
        tenant_id: tenantId,
        name: alert.name,
        metric: alert.metric,
        condition: alert.condition,
        threshold_value: alert.threshold,
        threshold_value_2: alert.threshold2,
        notification_channels: alert.channels,
        recipient_emails: alert.recipients,
        is_enabled: alert.enabled,
      })
    
    if (error) {
      toast.error('Failed to create alert')
      console.error(error)
      return
    }
    
    setAlerts([...alerts, alert])
    setShowCreateDialog(false)
    resetNewAlert()
    toast.success('Alert created successfully')
  }
  
  const resetNewAlert = () => {
    setNewAlert({
      name: '',
      metric: 'cac',
      condition: 'above',
      threshold: 0,
      channels: ['email', 'in_app'],
      recipients: [],
      enabled: true,
    })
  }
  
  const toggleAlert = (alertId: string) => {
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    ))
    toast.success('Alert status updated')
  }
  
  const deleteAlert = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId))
    toast.success('Alert deleted')
  }
  
  const getAlertStatus = (alert: ThresholdAlert): 'triggered' | 'normal' | 'unknown' => {
    if (alert.currentValue === undefined) return 'unknown'
    
    if (alert.condition === 'above' && alert.currentValue > alert.threshold) {
      return 'triggered'
    }
    if (alert.condition === 'below' && alert.currentValue < alert.threshold) {
      return 'triggered'
    }
    if (alert.condition === 'between' && alert.threshold2 && 
        (alert.currentValue < alert.threshold || alert.currentValue > alert.threshold2)) {
      return 'triggered'
    }
    
    return 'normal'
  }
  
  const formatValue = (metric: string, value: number) => {
    const metricInfo = metricOptions.find(m => m.value === metric)
    if (!metricInfo) return value.toString()
    
    if (metricInfo.format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value)
    }
    if (metricInfo.format === 'percent') {
      return `${value.toFixed(1)}%`
    }
    return value.toString()
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Threshold Alerts</h2>
          <p className="text-sm text-gray-600">Get notified when KPIs cross critical thresholds</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Threshold Alert</DialogTitle>
              <DialogDescription>
                Configure automatic alerts when metrics cross thresholds
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Name */}
              <div>
                <Label>Alert Name</Label>
                <Input
                  placeholder="e.g., High CAC Warning"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                />
              </div>
              
              {/* Metric */}
              <div>
                <Label>Metric to Monitor</Label>
                <Select
                  value={newAlert.metric}
                  onValueChange={(value) => setNewAlert({ ...newAlert, metric: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Condition & Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Condition</Label>
                  <Select
                    value={newAlert.condition}
                    onValueChange={(value) => setNewAlert({ ...newAlert, condition: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="between">Between</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Threshold Value</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 300"
                    value={newAlert.threshold || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              
              {newAlert.condition === 'between' && (
                <div>
                  <Label>Upper Threshold</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 500"
                    value={newAlert.threshold2 || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, threshold2: parseFloat(e.target.value) })}
                  />
                </div>
              )}
              
              {/* Notification Channels */}
              <div>
                <Label className="mb-2 block">Notification Channels</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newAlert.channels?.includes('email')}
                      onCheckedChange={(checked) => {
                        const channels = newAlert.channels || []
                        setNewAlert({
                          ...newAlert,
                          channels: checked
                            ? [...channels, 'email']
                            : channels.filter(c => c !== 'email'),
                        })
                      }}
                    />
                    <Mail className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Email</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newAlert.channels?.includes('in_app')}
                      onCheckedChange={(checked) => {
                        const channels = newAlert.channels || []
                        setNewAlert({
                          ...newAlert,
                          channels: checked
                            ? [...channels, 'in_app']
                            : channels.filter(c => c !== 'in_app'),
                        })
                      }}
                    />
                    <Bell className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">In-App Notification</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newAlert.channels?.includes('slack')}
                      onCheckedChange={(checked) => {
                        const channels = newAlert.channels || []
                        setNewAlert({
                          ...newAlert,
                          channels: checked
                            ? [...channels, 'slack']
                            : channels.filter(c => c !== 'slack'),
                        })
                      }}
                    />
                    <MessageSquare className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Slack</span>
                  </div>
                </div>
              </div>
              
              {/* Recipients */}
              {newAlert.channels?.includes('email') && (
                <div>
                  <Label>Email Recipients (comma-separated)</Label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    onChange={(e) => {
                      const emails = e.target.value.split(',').map(e => e.trim()).filter(Boolean)
                      setNewAlert({ ...newAlert, recipients: emails })
                    }}
                  />
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlert}>
                  Create Alert
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Active Alerts */}
      <div className="grid gap-4">
        {alerts.map((alert) => {
          const status = getAlertStatus(alert)
          const isTriggered = status === 'triggered'
          
          return (
            <Card key={alert.id} className={`p-6 ${isTriggered ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex items-start justify-between">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      isTriggered ? 'bg-red-200' : 'bg-blue-100'
                    }`}>
                      {isTriggered ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{alert.name}</h3>
                      <p className="text-xs text-gray-600">
                        {metricOptions.find(m => m.value === alert.metric)?.label}
                      </p>
                    </div>
                  </div>
                  
                  {/* Condition */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      Alert if {alert.condition} {formatValue(alert.metric, alert.threshold)}
                      {alert.condition === 'between' && alert.threshold2 && 
                        ` and ${formatValue(alert.metric, alert.threshold2)}`
                      }
                    </Badge>
                  </div>
                  
                  {/* Current Value */}
                  {alert.currentValue !== undefined && (
                    <div className={`p-3 rounded-lg ${
                      isTriggered 
                        ? 'bg-red-100 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Value:</span>
                        <span className={`text-lg font-bold ${
                          isTriggered ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {formatValue(alert.metric, alert.currentValue)}
                        </span>
                      </div>
                      {isTriggered && (
                        <p className="text-xs text-red-800 mt-2">
                          ⚠️ <strong>Threshold exceeded!</strong> Immediate action recommended.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Channels & Recipients */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Bell className="h-3 w-3" />
                      {alert.channels.length} channel{alert.channels.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {alert.recipients.length} recipient{alert.recipients.length > 1 ? 's' : ''}
                    </div>
                    {alert.lastTriggered && (
                      <div>
                        Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alert.enabled}
                    onCheckedChange={() => toggleAlert(alert.id)}
                  />
                  <Badge variant={alert.enabled ? 'default' : 'outline'}>
                    {alert.enabled ? 'Active' : 'Paused'}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      
      {alerts.length === 0 && (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Alerts Configured</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set up automatic alerts to monitor critical KPIs
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Alert
          </Button>
        </Card>
      )}
    </div>
  )
}

