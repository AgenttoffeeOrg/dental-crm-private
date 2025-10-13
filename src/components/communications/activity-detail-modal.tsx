'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  X,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  User,
  Building,
  Clock,
  ArrowDown,
  ArrowUp,
  Play,
  Download,
  ExternalLink,
  Paperclip
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatDistanceToNow } from 'date-fns'

interface ActivityDetailModalProps {
  isOpen: boolean
  onClose: () => void
  activityId: string
}

const ACTIVITY_ICONS = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  meeting: Calendar,
  note: FileText
}

export function ActivityDetailModal({
  isOpen,
  onClose,
  activityId
}: ActivityDetailModalProps) {
  const [activity, setActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    if (isOpen && activityId) {
      loadActivity()
    }
  }, [isOpen, activityId])

  const loadActivity = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('activities_with_integrations')
        .select('*')
        .eq('id', activityId)
        .single()

      if (error) throw error
      setActivity(data)
    } catch (error) {
      console.error('Error loading activity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const ActivityIcon = activity ? ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] : FileText

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {activity && (
              <>
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ActivityIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{activity.subject || `${activity.type} Activity`}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Badge variant="outline" className="text-xs">
                      {activity.type.toUpperCase()}
                    </Badge>
                    {activity.direction && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        {activity.direction === 'inbound' ? (
                          <><ArrowDown className="h-3 w-3" /> Inbound</>
                        ) : (
                          <><ArrowUp className="h-3 w-3" /> Outbound</>
                        )}
                      </Badge>
                    )}
                    {activity.integration_provider && (
                      <Badge variant="secondary" className="text-xs">
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
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading activity...</p>
            </div>
          </div>
        ) : activity ? (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="px-4 pt-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="content">Full Content</TabsTrigger>
                {activity.recording_url && <TabsTrigger value="recording">Recording</TabsTrigger>}
                {activity.metadata?.thread_id && <TabsTrigger value="thread">Thread</TabsTrigger>}
              </TabsList>

              <ScrollArea className="flex-1 p-4">
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* Participants */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Participants</h3>
                    <div className="space-y-2">
                      {activity.contact_name && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {activity.contact_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{activity.contact_name}</p>
                            <p className="text-xs text-gray-600">
                              {activity.contact_email || activity.contact_phone}
                            </p>
                          </div>
                        </div>
                      )}
                      {activity.agent_name && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-600 text-white">
                              {activity.agent_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{activity.agent_name}</p>
                            <p className="text-xs text-gray-600">Team Member</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deal Association */}
                  {activity.deal_title && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Associated Deal</h3>
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-purple-900">{activity.deal_title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{activity.deal_stage}</Badge>
                              {activity.deal_value && (
                                <span className="text-sm text-purple-700">
                                  ${(activity.deal_value / 100).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
                    <div className="grid grid-cols-2 gap-4">
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
                          <p className="text-sm font-medium capitalize">{activity.message_status}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes/Snippet */}
                  {activity.snippet && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.snippet}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="content" className="mt-0">
                  <div className="prose max-w-none">
                    {activity.rich_content ? (
                      <div 
                        className="p-4 bg-gray-50 rounded-lg"
                        dangerouslySetInnerHTML={{ __html: activity.rich_content }}
                      />
                    ) : activity.snippet ? (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="whitespace-pre-wrap">{activity.snippet}</p>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No content available</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {activity.recording_url && (
                  <TabsContent value="recording" className="mt-0">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-blue-900">Call Recording</p>
                            <p className="text-sm text-blue-700">
                              Duration: {Math.floor(activity.duration_seconds / 60)}:{(activity.duration_seconds % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                        <audio controls className="w-full">
                          <source src={activity.recording_url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download Recording
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <FileText className="h-4 w-4 mr-2" />
                          View Transcript
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {activity.metadata?.thread_id && (
                  <TabsContent value="thread" className="mt-0">
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Conversation thread view coming soon</p>
                      <p className="text-sm mt-2">Thread ID: {activity.metadata.thread_id}</p>
                    </div>
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12">
            <p className="text-gray-500">Activity not found</p>
          </div>
        )}

        {/* Footer */}
        {activity && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-600">
              {activity.is_edited && (
                <span className="italic">Edited {formatDistanceToNow(new Date(activity.edited_at), { addSuffix: true })}</span>
              )}
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  )
}

