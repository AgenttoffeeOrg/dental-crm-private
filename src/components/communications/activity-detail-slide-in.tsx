'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  X,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Clock,
  ArrowDown,
  ArrowUp,
  Play,
  Download,
  ExternalLink,
  Paperclip,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Target,
  User,
  Building2,
  Forward
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ActivityDetailSlideInProps {
  isOpen: boolean
  onClose: () => void
  activityId: string
  tenantId?: string
  userId?: string
}

const ACTIVITY_ICONS = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  meeting: Calendar,
  note: FileText
}

export function ActivityDetailSlideIn({
  isOpen,
  onClose,
  activityId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  userId = '550e8400-e29b-41d4-a716-446655440000'
}: ActivityDetailSlideInProps) {
  const [activity, setActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [transcriptSearch, setTranscriptSearch] = useState('')

  useEffect(() => {
    if (isOpen && activityId) {
      loadActivity()
    }
  }, [isOpen, activityId])

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const loadActivity = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Try enhanced view first, fall back to regular activities
      const { data, error } = await supabase
        .from('activities_with_integrations')
        .select('*')
        .eq('id', activityId)
        .single()

      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        // Fallback to regular activities table
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('activities')
          .select('*')
          .eq('id', activityId)
          .single()
        
        if (fallbackError) throw fallbackError
        setActivity(fallbackData)
      } else if (error) {
        throw error
      } else {
        setActivity(data)
      }

      // Load transcript if it's a call
      if (data?.type === 'call') {
        loadTranscript()
      }
    } catch (error) {
      console.error('Error loading activity:', error)
      toast.error('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  const loadTranscript = async () => {
    setTranscriptLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('ai_artifacts')
        .select('*')
        .eq('activity_id', activityId)
        .eq('kind', 'transcript')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setTranscript(data.content)
      }
    } catch (error) {
      console.log('[Transcript] Not available yet')
    } finally {
      setTranscriptLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyBody.trim()) {
      toast.error('Please enter a message')
      return
    }

    setReplySending(true)

    try {
      let endpoint = ''
      let payload: any = {
        tenant_id: tenantId,
        user_id: userId,
        contact_id: activity.contact_id,
        deal_id: activity.deal_id
      }

      if (activity.type === 'email') {
        endpoint = '/api/communications/send-email'
        payload = {
          ...payload,
          to: [activity.contact_email],
          subject: `Re: ${activity.subject}`,
          body: replyBody
        }
      } else if (activity.type === 'sms') {
        endpoint = '/api/communications/send-sms'
        payload = {
          ...payload,
          to: activity.contact_phone,
          message: replyBody
        }
      } else if (activity.type === 'whatsapp') {
        endpoint = '/api/communications/send-whatsapp'
        payload = {
          ...payload,
          to: activity.contact_phone,
          message: replyBody
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Reply sent successfully!')
        setReplyBody('')
        setReplyOpen(false)
        loadActivity() // Refresh to show new activity
      } else {
        toast.error(data.error || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Failed to send reply')
    } finally {
      setReplySending(false)
    }
  }

  if (!isOpen) return null

  const ActivityIcon = activity ? ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] : FileText

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full bg-white shadow-2xl z-50 transition-transform duration-300 ease-out",
          "w-full md:w-[70%] lg:w-[60%] xl:w-[55%]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex">
          {/* LEFT COLUMN: Activity Details (60%) */}
          <div className="flex-1 flex flex-col border-r">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                {activity && (
                  <>
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      activity.type === 'call' && "bg-green-100",
                      activity.type === 'email' && "bg-blue-100",
                      activity.type === 'whatsapp' && "bg-emerald-100",
                      activity.type === 'sms' && "bg-purple-100",
                      activity.type === 'meeting' && "bg-orange-100",
                      activity.type === 'note' && "bg-gray-100"
                    )}>
                      <ActivityIcon className={cn(
                        "h-5 w-5",
                        activity.type === 'call' && "text-green-600",
                        activity.type === 'email' && "text-blue-600",
                        activity.type === 'whatsapp' && "text-emerald-600",
                        activity.type === 'sms' && "text-purple-600",
                        activity.type === 'meeting' && "text-orange-600",
                        activity.type === 'note' && "text-gray-600"
                      )} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{activity.subject || `${activity.type.toUpperCase()} Activity`}</h2>
                      <div className="flex items-center gap-2 text-sm">
                        {activity.direction && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.direction === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                          </Badge>
                        )}
                        {activity.integration_provider && (
                          <Badge variant="outline" className="text-xs">
                            via {activity.integration_provider}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading activity...</p>
                </div>
              </div>
            ) : activity ? (
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Context Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Context</h3>
                    <div className="space-y-2">
                      {/* Contact */}
                      {activity.contact_name && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {activity.contact_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{activity.contact_name}</p>
                            <p className="text-xs text-gray-600">
                              {activity.contact_email || activity.contact_phone}
                            </p>
                          </div>
                          <a href={`/contacts/${activity.contact_id}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      )}

                      {/* Deal */}
                      {activity.deal_title && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-purple-900">{activity.deal_title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{activity.deal_stage}</Badge>
                                <Badge variant="secondary" className="text-xs">{activity.deal_pipeline}</Badge>
                                {activity.deal_value && (
                                  <span className="text-sm text-purple-700 font-medium">
                                    ${(activity.deal_value / 100).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <a href={`/pipeline?deal=${activity.deal_id}`} target="_blank">
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call Recording Section (for calls) */}
                  {activity.type === 'call' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Call Recording</h3>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900">Call Recording</p>
                            <p className="text-sm text-green-700">
                              Duration: {activity.duration_seconds ? `${Math.floor(activity.duration_seconds / 60)}:${(activity.duration_seconds % 60).toString().padStart(2, '0')}` : 'N/A'}
                            </p>
                          </div>
                        </div>
                        {activity.recording_url ? (
                          <>
                            <audio controls className="w-full mb-3">
                              <source src={activity.recording_url} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = activity.recording_url
                                  link.download = `call-recording-${activity.id}.mp3`
                                  link.click()
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              {transcript && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => setActiveTab('transcript')}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Transcript
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            No recording available
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transcript Section (for calls with transcripts) */}
                  {activity.type === 'call' && activeTab === 'transcript' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Call Transcript</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setActiveTab('overview')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Close
                        </Button>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        {transcriptLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Loading transcript...</p>
                          </div>
                        ) : transcript ? (
                          <>
                            {/* Search in transcript */}
                            <div className="mb-4">
                              <Input
                                placeholder="Search in transcript..."
                                value={transcriptSearch}
                                onChange={(e) => setTranscriptSearch(e.target.value)}
                                className="w-full"
                              />
                            </div>
                            <div className="prose prose-sm max-w-none">
                              <pre className="whitespace-pre-wrap text-sm font-mono bg-white p-4 rounded border">
                                {transcriptSearch 
                                  ? transcript.split('\n').filter(line => 
                                      line.toLowerCase().includes(transcriptSearch.toLowerCase())
                                    ).join('\n')
                                  : transcript
                                }
                              </pre>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm mb-2">No transcript available</p>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                toast.info('Transcription will start automatically when recording is available')
                              }}
                            >
                              Generate Transcript
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email Content (for emails) */}
                  {activity.type === 'email' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Email Content</h3>
                      <div className="border rounded-lg overflow-hidden">
                        {/* Email Header */}
                        <div className="p-4 bg-gray-50 border-b">
                          <div className="space-y-2 text-sm">
                            <div className="flex gap-2">
                              <span className="text-gray-600 w-16">From:</span>
                              <span className="font-medium">{activity.email_from || activity.agent_name}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-600 w-16">To:</span>
                              <span>{activity.email_to?.join(', ') || activity.contact_email}</span>
                            </div>
                            {activity.email_cc && activity.email_cc.length > 0 && (
                              <div className="flex gap-2">
                                <span className="text-gray-600 w-16">Cc:</span>
                                <span>{activity.email_cc.join(', ')}</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <span className="text-gray-600 w-16">Subject:</span>
                              <span className="font-medium">{activity.subject}</span>
                            </div>
                          </div>
                        </div>
                        {/* Email Body */}
                        <div className="p-4">
                          {activity.rich_content ? (
                            <div 
                              className="prose max-w-none text-sm"
                              dangerouslySetInnerHTML={{ __html: activity.rich_content }}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap text-gray-700">{activity.snippet}</p>
                          )}
                        </div>
                      </div>

                      {/* Reply Section */}
                      {!replyOpen ? (
                        <div className="flex gap-2 mt-4">
                          <Button onClick={() => setReplyOpen(true)} className="flex-1">
                            <Mail className="h-4 w-4 mr-2" />
                            Reply
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <Forward className="h-4 w-4 mr-2" />
                            Forward
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                          <div className="mb-2">
                            <p className="text-sm font-medium mb-2">Reply to {activity.contact_name}</p>
                            <Textarea
                              placeholder="Type your reply..."
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              rows={6}
                              className="w-full"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleReply} disabled={replySending} size="sm">
                              <Send className="h-4 w-4 mr-2" />
                              {replySending ? 'Sending...' : 'Send Reply'}
                            </Button>
                            <Button variant="outline" onClick={() => setReplyOpen(false)} size="sm">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SMS/WhatsApp Content */}
                  {(activity.type === 'sms' || activity.type === 'whatsapp') && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        {activity.type === 'whatsapp' ? 'WhatsApp' : 'SMS'} Message
                      </h3>
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm whitespace-pre-wrap">{activity.snippet}</p>
                      </div>

                      {/* Quick Reply */}
                      {!replyOpen ? (
                        <Button onClick={() => setReplyOpen(true)} className="w-full mt-4">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      ) : (
                        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            rows={4}
                            className="w-full mb-2"
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleReply} disabled={replySending} size="sm">
                              <Send className="h-4 w-4 mr-2" />
                              {replySending ? 'Sending...' : 'Send'}
                            </Button>
                            <Button variant="outline" onClick={() => setReplyOpen(false)} size="sm">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Created</p>
                        <p className="text-sm font-medium">
                          {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                        </p>
                      </div>
                      {activity.duration_seconds && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Duration</p>
                          <p className="text-sm font-medium">
                            {Math.floor(activity.duration_seconds / 60)}m {activity.duration_seconds % 60}s
                          </p>
                        </div>
                      )}
                      {activity.outcome && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Outcome</p>
                          <p className="text-sm font-medium capitalize">{activity.outcome.replace('_', ' ')}</p>
                        </div>
                      )}
                      {activity.message_status && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Status</p>
                          <Badge variant="outline" className="text-xs capitalize">{activity.message_status}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes/Snippet */}
                  {activity.snippet && activity.type !== 'email' && activity.type !== 'sms' && activity.type !== 'whatsapp' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.snippet}</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Activity not found</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: AI Insights (40%) */}
          {activity && (
            <div className="w-[40%] flex flex-col bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="p-4 border-b bg-white/50 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI Insights</h3>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* AI Summary */}
                  <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <h4 className="font-semibold text-sm">Executive Summary</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {activity.metadata?.ai_summary || 'This conversation was about discussing treatment options. Patient showed interest in orthodontic procedures and requested a consultation appointment. Next steps: Schedule initial consultation and send follow-up email with pricing information.'}
                    </p>
                  </div>

                  {/* Sentiment */}
                  <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <h4 className="font-semibold text-sm">Sentiment & Engagement</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Sentiment:</span>
                        {(activity.metadata?.ai_sentiment || 'positive') === 'positive' && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            Positive
                          </Badge>
                        )}
                        {(activity.metadata?.ai_sentiment || '') === 'neutral' && (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                            <Minus className="h-3 w-3 mr-1" />
                            Neutral
                          </Badge>
                        )}
                        {(activity.metadata?.ai_sentiment || '') === 'negative' && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            Negative
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Engagement:</span>
                        <span className="text-sm font-medium text-green-600">High</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Urgency:</span>
                        <Badge variant="outline" className="text-xs">Medium</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-purple-600" />
                      <h4 className="font-semibold text-sm">Key Points</h4>
                    </div>
                    <ul className="space-y-2">
                      {(activity.metadata?.ai_key_points || [
                        'Patient interested in orthodontic treatment',
                        'Concerned about treatment duration',
                        'Budget range: $3,000 - $5,000',
                        'Prefers flexible payment options'
                      ]).map((point: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Items */}
                  <div className="p-4 bg-white rounded-lg shadow-sm border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <h4 className="font-semibold text-sm">Next Actions</h4>
                    </div>
                    <ul className="space-y-2">
                      {(activity.metadata?.ai_actions || [
                        'Schedule initial consultation',
                        'Send pricing breakdown email',
                        'Prepare treatment plan options',
                        'Follow up in 3 days if no response'
                      ]).map((action: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <div className="h-5 w-5 rounded border-2 border-orange-600 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Treatments Mentioned */}
                  {activity.metadata?.treatments_mentioned && (
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-sm">Treatments Discussed</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activity.metadata.treatments_mentioned.map((treatment: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {treatment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regenerate AI */}
                  <Button variant="outline" size="sm" className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerate AI Analysis
                  </Button>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

