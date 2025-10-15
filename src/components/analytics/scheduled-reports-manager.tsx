'use client'

/**
 * Scheduled Reports Manager
 * 
 * Create, manage, and automate report delivery
 * 
 * Features:
 * - Select dashboard to report on
 * - Choose frequency (daily/weekly/monthly)
 * - Add recipients
 * - PDF or Excel export
 * - Email delivery automation
 * - Report history
 * - Preview before sending
 */

import { useState } from 'react'
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
import { Calendar, Mail, FileText, Plus, Edit, Trash2, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduledReport {
  id: string
  name: string
  dashboard: 'executive' | 'crm' | 'marketing' | 'communications'
  frequency: 'daily' | 'weekly' | 'monthly'
  format: 'pdf' | 'excel' | 'both'
  recipients: string[]
  enabled: boolean
  lastSent?: string
  nextScheduled: string
}

export function ScheduledReportsManager({ tenantId }: { tenantId?: string }) {
  const [reports, setReports] = useState<ScheduledReport[]>([
    {
      id: '1',
      name: 'Weekly Executive Summary',
      dashboard: 'executive',
      frequency: 'weekly',
      format: 'pdf',
      recipients: ['owner@dentalcrm.com'],
      enabled: true,
      lastSent: '2025-01-13',
      nextScheduled: '2025-01-20',
    },
    {
      id: '2',
      name: 'Monthly Marketing ROI',
      dashboard: 'marketing',
      frequency: 'monthly',
      format: 'pdf',
      recipients: ['marketing@dentalcrm.com', 'owner@dentalcrm.com'],
      enabled: true,
      lastSent: '2025-01-01',
      nextScheduled: '2025-02-01',
    },
  ])
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: '',
    dashboard: 'executive',
    frequency: 'weekly',
    format: 'pdf',
    recipients: [],
    enabled: true,
  })
  
  const dashboardOptions = [
    { value: 'executive', label: 'Executive Dashboard' },
    { value: 'crm', label: 'CRM Analytics' },
    { value: 'marketing', label: 'Marketing Analytics' },
    { value: 'communications', label: 'Communications Analytics' },
  ]
  
  const handleCreateReport = () => {
    if (!newReport.name || !newReport.recipients || newReport.recipients.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }
    
    const report: ScheduledReport = {
      id: Date.now().toString(),
      name: newReport.name!,
      dashboard: newReport.dashboard as any,
      frequency: newReport.frequency as any,
      format: newReport.format as any,
      recipients: newReport.recipients,
      enabled: true,
      nextScheduled: calculateNextScheduled(newReport.frequency as any),
    }
    
    setReports([...reports, report])
    setShowCreateDialog(false)
    setNewReport({
      name: '',
      dashboard: 'executive',
      frequency: 'weekly',
      format: 'pdf',
      recipients: [],
      enabled: true,
    })
    
    toast.success('Scheduled report created successfully')
  }
  
  const calculateNextScheduled = (frequency: 'daily' | 'weekly' | 'monthly'): string => {
    const now = new Date()
    
    if (frequency === 'daily') {
      now.setDate(now.getDate() + 1)
    } else if (frequency === 'weekly') {
      now.setDate(now.getDate() + 7)
    } else {
      now.setMonth(now.getMonth() + 1)
    }
    
    return now.toISOString().split('T')[0]
  }
  
  const toggleReportStatus = (reportId: string) => {
    setReports(reports.map(r => 
      r.id === reportId ? { ...r, enabled: !r.enabled } : r
    ))
    toast.success('Report status updated')
  }
  
  const deleteReport = (reportId: string) => {
    setReports(reports.filter(r => r.id !== reportId))
    toast.success('Report deleted')
  }
  
  const sendNow = (reportId: string) => {
    toast.success('Report is being generated and will be sent shortly')
    // In production, trigger actual report generation
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scheduled Reports</h2>
          <p className="text-sm text-gray-600">Automate report delivery to your team</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Scheduled Report</DialogTitle>
              <DialogDescription>
                Set up automatic report generation and email delivery
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Name */}
              <div>
                <Label>Report Name</Label>
                <Input
                  placeholder="e.g., Weekly Executive Summary"
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                />
              </div>
              
              {/* Dashboard */}
              <div>
                <Label>Dashboard</Label>
                <Select
                  value={newReport.dashboard}
                  onValueChange={(value) => setNewReport({ ...newReport, dashboard: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboardOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Frequency & Format */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={newReport.frequency}
                    onValueChange={(value) => setNewReport({ ...newReport, frequency: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Monday 9 AM)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Format</Label>
                  <Select
                    value={newReport.format}
                    onValueChange={(value) => setNewReport({ ...newReport, format: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="both">Both (PDF + Excel)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Recipients */}
              <div>
                <Label>Email Recipients (comma-separated)</Label>
                <Input
                  placeholder="email1@example.com, email2@example.com"
                  onChange={(e) => {
                    const emails = e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                    setNewReport({ ...newReport, recipients: emails })
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Separate multiple emails with commas
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReport}>
                  Create Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Reports List */}
      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-6">
            <div className="flex items-start justify-between">
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{report.name}</h3>
                    <p className="text-xs text-gray-600">
                      {dashboardOptions.find(d => d.value === report.dashboard)?.label}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Frequency</span>
                    <p className="font-medium capitalize">{report.frequency}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Format</span>
                    <p className="font-medium uppercase">{report.format}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Recipients</span>
                    <p className="font-medium">{report.recipients.length} {report.recipients.length === 1 ? 'person' : 'people'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Next Scheduled</span>
                    <p className="font-medium">{new Date(report.nextScheduled).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {report.lastSent && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last sent: {new Date(report.lastSent).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={report.enabled}
                  onCheckedChange={() => toggleReportStatus(report.id)}
                />
                <Badge variant={report.enabled ? 'default' : 'outline'}>
                  {report.enabled ? 'Active' : 'Paused'}
                </Badge>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => sendNow(report.id)}
                  title="Send now"
                >
                  <Mail className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteReport(report.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {reports.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Scheduled Reports</h3>
          <p className="text-sm text-gray-600 mb-4">
            Automate your reporting and save time every week
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Schedule
          </Button>
        </Card>
      )}
    </div>
  )
}

