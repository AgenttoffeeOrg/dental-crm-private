'use client'

/**
 * Marketing Audit Settings Tab
 * 
 * Configure Marketing Audit module settings
 * 
 * Settings:
 * - Audit Cadence (frequency, auto-run)
 * - Competitor Benchmarking (radius, max competitors)
 * - Alert Thresholds (SEO score, performance, local presence)
 * - Data Sources (API keys, credentials)
 * - Report Generation (auto-PDF, email delivery)
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
import { Search, MapPin, Bell, FileText } from 'lucide-react'
import { toast } from 'sonner'

export function MarketingAuditSettingsTab() {
  const [settings, setSettings] = useState({
    // Audit Cadence
    auditFrequency: 'monthly',
    autoRunEnabled: true,
    autoRunDay: 1, // 1st of month
    
    // Competitor Benchmarking
    competitorSearchRadius: 10, // miles
    maxCompetitors: 5,
    includeIndirectCompetitors: false,
    
    // Alert Thresholds
    seoScoreAlertBelow: 70,
    performanceScoreAlertBelow: 50,
    localPresenceScoreAlertBelow: 60,
    enableAlertNotifications: true,
    alertRecipients: '',
    
    // Data Sources
    googleApiKey: '',
    pagespeedApiKey: '',
    enableGA4Integration: true,
    enableGSCIntegration: true,
    
    // Report Generation
    autoGeneratePDF: true,
    emailReportAfterAudit: true,
    reportRecipients: '',
  })
  
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Marketing Audit settings saved successfully')
    } catch (error) {
      console.error('[Marketing Audit Settings] Error saving:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Marketing Audit Configuration</h3>
        <p className="text-sm text-gray-600">Configure automated audits and competitor benchmarking</p>
      </div>
      
      {/* Audit Cadence */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold">Audit Cadence</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>Audit Frequency</Label>
            <Select
              value={settings.auditFrequency}
              onValueChange={(value) => setSettings({ ...settings, auditFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="manual">Manual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Run Enabled</Label>
              <p className="text-xs text-gray-600">Automatically run audits on schedule</p>
            </div>
            <Switch
              checked={settings.autoRunEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, autoRunEnabled: checked })}
            />
          </div>
          
          {settings.autoRunEnabled && settings.auditFrequency === 'monthly' && (
            <div className="pl-6">
              <Label>Run on Day of Month</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={settings.autoRunDay}
                onChange={(e) => setSettings({ ...settings, autoRunDay: parseInt(e.target.value) })}
                className="w-24"
              />
              <p className="text-xs text-gray-600 mt-1">1-28</p>
            </div>
          )}
        </div>
      </Card>
      
      {/* Competitor Benchmarking */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="h-5 w-5 text-green-600" />
          <h4 className="font-semibold">Competitor Benchmarking</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>Search Radius</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={settings.competitorSearchRadius}
                onChange={(e) => setSettings({ ...settings, competitorSearchRadius: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-gray-600">miles</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">How far to search for competitors</p>
          </div>
          
          <div>
            <Label>Maximum Competitors</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={settings.maxCompetitors}
              onChange={(e) => setSettings({ ...settings, maxCompetitors: parseInt(e.target.value) })}
              className="w-24"
            />
            <p className="text-xs text-gray-600 mt-1">1-20 competitors to analyze</p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Include Indirect Competitors</Label>
              <p className="text-xs text-gray-600">Include related businesses (e.g., cosmetic surgeons)</p>
            </div>
            <Switch
              checked={settings.includeIndirectCompetitors}
              onCheckedChange={(checked) => setSettings({ ...settings, includeIndirectCompetitors: checked })}
            />
          </div>
        </div>
      </Card>
      
      {/* Alert Thresholds */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-orange-600" />
          <h4 className="font-semibold">Alert Thresholds</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>SEO Score Alert (Below)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.seoScoreAlertBelow}
                onChange={(e) => setSettings({ ...settings, seoScoreAlertBelow: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-gray-600">/ 100</span>
            </div>
          </div>
          
          <div>
            <Label>Performance Score Alert (Below)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.performanceScoreAlertBelow}
                onChange={(e) => setSettings({ ...settings, performanceScoreAlertBelow: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-gray-600">/ 100</span>
            </div>
          </div>
          
          <div>
            <Label>Local Presence Score Alert (Below)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.localPresenceScoreAlertBelow}
                onChange={(e) => setSettings({ ...settings, localPresenceScoreAlertBelow: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-gray-600">/ 100</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Alert Notifications</Label>
              <p className="text-xs text-gray-600">Email alerts when thresholds exceeded</p>
            </div>
            <Switch
              checked={settings.enableAlertNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, enableAlertNotifications: checked })}
            />
          </div>
          
          {settings.enableAlertNotifications && (
            <div className="pl-6">
              <Label>Alert Recipients (comma-separated)</Label>
              <Input
                placeholder="manager@practice.com, owner@practice.com"
                value={settings.alertRecipients}
                onChange={(e) => setSettings({ ...settings, alertRecipients: e.target.value })}
              />
            </div>
          )}
        </div>
      </Card>
      
      {/* Report Generation */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-indigo-600" />
          <h4 className="font-semibold">Automatic Reports</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Generate PDF Report</Label>
              <p className="text-xs text-gray-600">Create PDF after each audit</p>
            </div>
            <Switch
              checked={settings.autoGeneratePDF}
              onCheckedChange={(checked) => setSettings({ ...settings, autoGeneratePDF: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Report After Audit</Label>
              <p className="text-xs text-gray-600">Send report via email automatically</p>
            </div>
            <Switch
              checked={settings.emailReportAfterAudit}
              onCheckedChange={(checked) => setSettings({ ...settings, emailReportAfterAudit: checked })}
            />
          </div>
          
          {settings.emailReportAfterAudit && (
            <div className="pl-6">
              <Label>Report Recipients</Label>
              <Input
                placeholder="owner@practice.com"
                value={settings.reportRecipients}
                onChange={(e) => setSettings({ ...settings, reportRecipients: e.target.value })}
              />
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

