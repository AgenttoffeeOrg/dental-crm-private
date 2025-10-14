'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Users, 
  Layout, 
  Calendar,
  Send,
  Eye,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  Check,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface ModernCampaignBuilderProps {
  onComplete: (campaignData: any) => void
  onCancel: () => void
  initialChannel?: 'email' | 'sms' | 'whatsapp'
}

export function ModernCampaignBuilder({ onComplete, onCancel, initialChannel }: ModernCampaignBuilderProps) {
  const [channel, setChannel] = useState<'email' | 'sms' | 'whatsapp'>(initialChannel || 'email')
  const [campaignData, setCampaignData] = useState({
    name: '',
    channel: initialChannel || 'email',
    subject: '',
    fromName: '',
    fromEmail: '',
    message: '',
    segmentId: '',
    templateId: '',
    scheduleType: 'now' as 'now' | 'schedule',
    scheduledTime: '',
    abTestEnabled: false
  })

  const [templates, setTemplates] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedSegment, setSelectedSegment] = useState<any>(null)
  const [estimatedReach, setEstimatedReach] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTemplatesAndSegments()
  }, [channel])

  useEffect(() => {
    if (selectedSegment) {
      calculateEstimatedReach()
    }
  }, [selectedSegment])

  const loadTemplatesAndSegments = async () => {
    const supabase = createClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'

    // Load templates
    const { data: templatesData } = await supabase
      .from('marketing_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })

    setTemplates(templatesData || [])

    // Load segments
    const { data: segmentsData } = await supabase
      .from('marketing_segments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    setSegments(segmentsData || [])
  }

  const calculateEstimatedReach = async () => {
    if (!selectedSegment) return
    
    const supabase = createClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'

    // For now, use the segment's total_contacts
    // In production, apply additional filters based on channel opt-ins
    setEstimatedReach(selectedSegment.total_contacts || 0)
  }

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template)
    setCampaignData({
      ...campaignData,
      templateId: template.id,
      subject: template.subject_line || campaignData.subject,
      message: template.content_html || campaignData.message
    })
  }

  const handleSegmentSelect = (segment: any) => {
    setSelectedSegment(segment)
    setCampaignData({
      ...campaignData,
      segmentId: segment.id
    })
  }

  const handleSubmit = () => {
    setLoading(true)
    onComplete({
      ...campaignData,
      channel,
      estimatedReach
    })
  }

  const isValid = campaignData.name && campaignData.segmentId && (
    channel === 'email' ? (campaignData.subject && campaignData.message) : campaignData.message
  )

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Builder Area - 8 columns */}
        <div className="col-span-8 space-y-6">
          {/* Step 1: Channel Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 bg-blue-600 text-white rounded-full text-xs font-bold">1</span>
                Choose Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setChannel('email')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    channel === 'email'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Mail className={`h-8 w-8 mx-auto mb-2 ${channel === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-sm">Email</p>
                  <p className="text-xs text-gray-500 mt-1">Rich content</p>
                  {channel === 'email' && <Check className="h-5 w-5 text-blue-600 mx-auto mt-2" />}
                </button>

                <button
                  onClick={() => setChannel('sms')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    channel === 'sms'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className={`h-8 w-8 mx-auto mb-2 ${channel === 'sms' ? 'text-green-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-sm">SMS</p>
                  <p className="text-xs text-gray-500 mt-1">Quick reach</p>
                  {channel === 'sms' && <Check className="h-5 w-5 text-green-600 mx-auto mt-2" />}
                </button>

                <button
                  onClick={() => setChannel('whatsapp')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    channel === 'whatsapp'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Phone className={`h-8 w-8 mx-auto mb-2 ${channel === 'whatsapp' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-sm">WhatsApp</p>
                  <p className="text-xs text-gray-500 mt-1">High engagement</p>
                  {channel === 'whatsapp' && <Check className="h-5 w-5 text-purple-600 mx-auto mt-2" />}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 bg-blue-600 text-white rounded-full text-xs font-bold">2</span>
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                  placeholder="e.g., Spring Cleaning Special"
                  className="mt-1"
                />
              </div>

              {channel === 'email' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>From Name</Label>
                      <Input
                        value={campaignData.fromName}
                        onChange={(e) => setCampaignData({ ...campaignData, fromName: e.target.value })}
                        placeholder="Your Practice Name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>From Email</Label>
                      <Input
                        type="email"
                        value={campaignData.fromEmail}
                        onChange={(e) => setCampaignData({ ...campaignData, fromEmail: e.target.value })}
                        placeholder="hello@practice.com"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Subject Line</Label>
                    <Input
                      value={campaignData.subject}
                      onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                      placeholder="Your subject line here..."
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {campaignData.subject.length}/100 characters
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Choose Template or Create */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 bg-blue-600 text-white rounded-full text-xs font-bold">3</span>
                  Content
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Layout className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
                      <p className="text-sm text-gray-600">Using template</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                      Change
                    </Button>
                  </div>
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {templates.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-all text-left"
                    >
                      <div className="h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                        <Layout className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.category}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <Label>Message Content</Label>
                <Textarea
                  value={campaignData.message}
                  onChange={(e) => setCampaignData({ ...campaignData, message: e.target.value })}
                  placeholder={
                    channel === 'email' ? 'Write your email content...' :
                    channel === 'sms' ? 'Your SMS message (160 characters)...' :
                    'Your WhatsApp message...'
                  }
                  rows={8}
                  className="mt-1 font-mono text-sm"
                />
                {channel === 'sms' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {campaignData.message.length}/160 characters
                    {campaignData.message.length > 160 && (
                      <span className="text-orange-600 ml-2">
                        (Split into {Math.ceil(campaignData.message.length / 160)} messages)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Select Audience */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 bg-blue-600 text-white rounded-full text-xs font-bold">4</span>
                Select Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSegment ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedSegment.name}</p>
                      <p className="text-sm text-gray-600">
                        {selectedSegment.total_contacts} contacts
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSegment(null)}>
                      Change
                    </Button>
                  </div>
                </div>
              ) : segments.length > 0 ? (
                <div className="space-y-2">
                  {segments.slice(0, 5).map((segment) => (
                    <button
                      key={segment.id}
                      onClick={() => handleSegmentSelect(segment)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg hover:border-green-400 transition-all text-left flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{segment.name}</p>
                        <p className="text-xs text-gray-500">{segment.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{segment.total_contacts} contacts</Badge>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No segments found</p>
                  <Button variant="link" className="mt-2">Create a segment first</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 5: Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 bg-blue-600 text-white rounded-full text-xs font-bold">5</span>
                Schedule & Send
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCampaignData({ ...campaignData, scheduleType: 'now' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    campaignData.scheduleType === 'now'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Send className={`h-6 w-6 mx-auto mb-2 ${campaignData.scheduleType === 'now' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-sm">Send Now</p>
                  <p className="text-xs text-gray-500 mt-1">Send immediately</p>
                </button>

                <button
                  onClick={() => setCampaignData({ ...campaignData, scheduleType: 'schedule' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    campaignData.scheduleType === 'schedule'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Clock className={`h-6 w-6 mx-auto mb-2 ${campaignData.scheduleType === 'schedule' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <p className="font-semibold text-sm">Schedule</p>
                  <p className="text-xs text-gray-500 mt-1">Pick date & time</p>
                </button>
              </div>

              {campaignData.scheduleType === 'schedule' && (
                <div>
                  <Label>Scheduled Time</Label>
                  <Input
                    type="datetime-local"
                    value={campaignData.scheduledTime}
                    onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 4 columns */}
        <div className="col-span-4 space-y-4">
          {/* Preview Card */}
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-white min-h-[200px]">
                {channel === 'email' && (
                  <>
                    {campaignData.subject && (
                      <div className="mb-2 pb-2 border-b border-gray-200">
                        <p className="text-xs text-gray-500">Subject:</p>
                        <p className="font-semibold text-sm">{campaignData.subject}</p>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none">
                      {campaignData.message || <p className="text-gray-400 italic">Your message will appear here...</p>}
                    </div>
                  </>
                )}
                
                {channel === 'sms' && (
                  <div className="bg-blue-600 text-white rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                    <p className="text-sm">{campaignData.message || 'Your SMS message will appear here...'}</p>
                  </div>
                )}

                {channel === 'whatsapp' && (
                  <div className="bg-green-600 text-white rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                    <p className="text-sm">{campaignData.message || 'Your WhatsApp message will appear here...'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Campaign Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Channel:</span>
                <Badge>{channel.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Reach:</span>
                <span className="font-semibold">{estimatedReach.toLocaleString()}</span>
              </div>
              {channel === 'sms' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SMS Credits:</span>
                  <span className="font-semibold">
                    {Math.ceil(campaignData.message.length / 160) * estimatedReach}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Ready to send:</span>
                  {isValid ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                {!isValid && (
                  <p className="text-xs text-orange-600">
                    Please complete all required fields
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                'Creating...'
              ) : campaignData.scheduleType === 'now' ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create & Send
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Campaign
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



