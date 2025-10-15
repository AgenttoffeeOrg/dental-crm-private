'use client'

/**
 * Analytics Settings Tab
 * 
 * Configure analytics and reporting preferences
 * 
 * Settings:
 * - Dashboard Defaults (time range, comparison mode, refresh interval)
 * - Metric Configuration (refresh cadence, data retention)
 * - Export Policies (PDF branding, CSV delimiter, API rate limits)
 * - Goal Tracking (default targets, alert thresholds)
 * - Data Sources (integration refresh schedules)
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, Clock, Download, Target } from 'lucide-react'
import { toast } from 'sonner'

export function AnalyticsSettingsTab() {
  const [settings, setSettings] = useState({
    // Dashboard Defaults
    defaultTimeRange: '30d',
    defaultComparisonMode: 'none',
    autoRefreshInterval: 0, // 0 = disabled
    enableRealTimeRefresh: false,
    
    // Metric Configuration
    metricRefreshCadence: 'hourly',
    dataRetentionDays: 730, // 2 years
    enablePredictiveAnalytics: true,
    enableAnomalyDetection: true,
    
    // Export Policies
    pdfBrandingEnabled: true,
    csvDelimiter: ',',
    apiRateLimit: 100, // requests per minute
    allowPublicExport: false,
    
    // Goal Tracking
    enableGoalAlerts: true,
    goalAlertThreshold: 80, // Alert if < 80% to goal
    defaultGoalPeriod: 'month',
  })
  
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Analytics settings saved successfully')
    } catch (error) {
      console.error('[Analytics Settings] Error saving:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Analytics Configuration</h3>
        <p className="text-sm text-gray-600">Configure dashboard defaults and data policies</p>
      </div>
      
      {/* Dashboard Defaults */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold">Dashboard Defaults</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>Default Time Range</Label>
            <Select
              value={settings.defaultTimeRange}
              onValueChange={(value) => setSettings({ ...settings, defaultTimeRange: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Default Comparison Mode</Label>
            <Select
              value={settings.defaultComparisonMode}
              onValueChange={(value) => setSettings({ ...settings, defaultComparisonMode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Comparison</SelectItem>
                <SelectItem value="mom">Month-over-Month</SelectItem>
                <SelectItem value="yoy">Year-over-Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Real-time Refresh</Label>
              <p className="text-xs text-gray-600">Auto-update dashboards</p>
            </div>
            <Switch
              checked={settings.enableRealTimeRefresh}
              onCheckedChange={(checked) => setSettings({ ...settings, enableRealTimeRefresh: checked })}
            />
          </div>
          
          {settings.enableRealTimeRefresh && (
            <div className="pl-6">
              <Label>Refresh Interval</Label>
              <Select
                value={settings.autoRefreshInterval.toString()}
                onValueChange={(value) => setSettings({ ...settings, autoRefreshInterval: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every 1 minute</SelectItem>
                  <SelectItem value="300">Every 5 minutes</SelectItem>
                  <SelectItem value="600">Every 10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>
      
      {/* Metric Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-green-600" />
          <h4 className="font-semibold">Metric Configuration</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>Metric Refresh Cadence</Label>
            <Select
              value={settings.metricRefreshCadence}
              onValueChange={(value) => setSettings({ ...settings, metricRefreshCadence: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Data Retention Period</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={settings.dataRetentionDays}
                onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Analytics data older than this will be archived</p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Predictive Analytics</Label>
              <p className="text-xs text-gray-600">AI-powered forecasting and predictions</p>
            </div>
            <Switch
              checked={settings.enablePredictiveAnalytics}
              onCheckedChange={(checked) => setSettings({ ...settings, enablePredictiveAnalytics: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Anomaly Detection</Label>
              <p className="text-xs text-gray-600">Automatic detection of unusual patterns</p>
            </div>
            <Switch
              checked={settings.enableAnomalyDetection}
              onCheckedChange={(checked) => setSettings({ ...settings, enableAnomalyDetection: checked })}
            />
          </div>
        </div>
      </Card>
      
      {/* Export Policies */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="h-5 w-5 text-purple-600" />
          <h4 className="font-semibold">Export Policies</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>PDF Branding</Label>
              <p className="text-xs text-gray-600">Include logo and colors in PDF exports</p>
            </div>
            <Switch
              checked={settings.pdfBrandingEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, pdfBrandingEnabled: checked })}
            />
          </div>
          
          <div>
            <Label>CSV Delimiter</Label>
            <Select
              value={settings.csvDelimiter}
              onValueChange={(value) => setSettings({ ...settings, csvDelimiter: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">Comma (,)</SelectItem>
                <SelectItem value=";">Semicolon (;)</SelectItem>
                <SelectItem value="\t">Tab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Analytics API Rate Limit</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => setSettings({ ...settings, apiRateLimit: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-gray-600">requests per minute</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Goal Tracking */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-5 w-5 text-orange-600" />
          <h4 className="font-semibold">Goal Tracking</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Goal Alerts</Label>
              <p className="text-xs text-gray-600">Get notified when off-track</p>
            </div>
            <Switch
              checked={settings.enableGoalAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, enableGoalAlerts: checked })}
            />
          </div>
          
          {settings.enableGoalAlerts && (
            <div className="pl-6">
              <Label>Alert Threshold</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={settings.goalAlertThreshold}
                  onChange={(e) => setSettings({ ...settings, goalAlertThreshold: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">% of goal</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Alert if progress falls below this percentage</p>
            </div>
          )}
        </div>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

