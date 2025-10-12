'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  Play, 
  Pause,
  Download,
  Calendar,
  User,
  Plus,
  Upload,
  Edit
} from 'lucide-react'
import { toast } from 'sonner'
import { AudioUpload } from '@/components/audio/audio-upload'
import { AIArtifactsDisplay } from '@/components/ai/ai-artifacts-display'
import { CreateActivityDialog } from './create-activity-dialog'
import { formatDateTime, getActivityAge } from '@/lib/dates'
import { storageService } from '@/lib/storage'
import type { ActivityWithRelations } from '@/types/database'

interface ActivityTimelineProps {
  dealId?: string // Made optional - if empty, shows all contact activities
  contactId: string
  onActivityAdded?: () => void
  tenantId?: string
  showAllContactActivities?: boolean // New prop to explicitly control context
}

export function ActivityTimeline({ 
  dealId, 
  contactId, 
  onActivityAdded,
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  showAllContactActivities = false
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedActivityType, setSelectedActivityType] = useState<'call' | 'email' | 'whatsapp' | 'note' | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedSnippet, setEditedSnippet] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchActivities()
  }, [dealId, contactId, showAllContactActivities])

  const fetchActivities = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('activities')
        .select(`
          *,
          agent:app_users(*),
          activity_files(
            file_id,
            files(*)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })

      // Context-aware filtering
      if (showAllContactActivities || !dealId) {
        // Show all activities for this contact across all deals
        query = query.eq('contact_id', contactId)
      } else {
        // Show only activities for this specific deal
        query = query.eq('deal_id', dealId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      setActivities(data as ActivityWithRelations[] || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to load activities')
      // Set empty array as fallback to prevent UI crashes
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      case 'note':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'text-blue-600'
      case 'email':
        return 'text-green-600'
      case 'whatsapp':
        return 'text-emerald-600'
      case 'note':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getDirectionBadge = (direction?: string) => {
    if (!direction) return null
    
    return (
      <Badge variant={direction === 'inbound' ? 'default' : 'secondary'} className="text-xs">
        {direction}
      </Badge>
    )
  }

  const handlePlayAudio = async (activity: ActivityWithRelations) => {
    if (!activity.activity_files || activity.activity_files.length === 0) return

    const audioFile = activity.activity_files.find(af => af.files.kind === 'audio')
    if (!audioFile) return

    try {
      if (playingAudio === activity.id) {
        // Stop playing
        setPlayingAudio(null)
        return
      }

      // Get signed URL and play
      const signedUrl = await storageService.getAudioUrl(audioFile.files.storage_path)
      const audio = new Audio(signedUrl)
      
      audio.onended = () => setPlayingAudio(null)
      audio.onerror = () => {
        setPlayingAudio(null)
        toast.error('Failed to play audio')
      }

      setPlayingAudio(activity.id)
      await audio.play()
    } catch (error) {
      console.error('Error playing audio:', error)
      toast.error('Failed to play audio')
      setPlayingAudio(null)
    }
  }

  const handleActivityCreated = () => {
    fetchActivities()
    onActivityAdded?.()
    setCreateDialogOpen(false)
    setSelectedActivityType(null)
  }

  const startEditActivity = (activity: ActivityWithRelations) => {
    setEditingActivity(activity.id)
    setEditedSubject(activity.subject || '')
    setEditedSnippet(activity.snippet || '')
  }

  const saveActivityEdit = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          subject: editedSubject,
          snippet: editedSnippet,
          updated_at: new Date().toISOString()
        })
        .eq('id', activityId)

      if (error) throw error

      toast.success('Activity updated!')
      setEditingActivity(null)
      fetchActivities()
    } catch (error) {
      console.error('Error updating activity:', error)
      toast.error('Failed to update activity')
    }
  }

  const cancelEditActivity = () => {
    setEditingActivity(null)
    setEditedSubject('')
    setEditedSnippet('')
  }

  const handleActivityTypeClick = (type: 'call' | 'email' | 'whatsapp' | 'note') => {
    setSelectedActivityType(type)
    setCreateDialogOpen(true)
  }

  const handleAudioProcessingComplete = () => {
    fetchActivities()
    onActivityAdded?.()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading activities...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Activity Type Buttons - HubSpot Style */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-medium text-gray-900">
            {showAllContactActivities || !dealId 
              ? 'All Contact Activities' 
              : 'Recent Activity'
            }
          </h3>
        </div>
        
        {/* Activity Type Buttons */}
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleActivityTypeClick('call')}
            className="h-8 px-3 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleActivityTypeClick('email')}
            className="h-8 px-3 text-xs font-medium border-green-200 text-green-700 hover:bg-green-50"
          >
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleActivityTypeClick('whatsapp')}
            className="h-8 px-3 text-xs font-medium border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            WhatsApp
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleActivityTypeClick('note')}
            className="h-8 px-3 text-xs font-medium border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            <FileText className="h-3 w-3 mr-1" />
            Note
          </Button>
        </div>
      </div>

      {/* Activities List - HubSpot Feed Style */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No activities yet</h3>
          <p className="text-xs text-gray-500">Get started by logging your first interaction</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity, index) => {
            const isEditing = editingActivity === activity.id
            
            return (
              <div key={activity.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                {/* Compact Activity Header */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${getActivityColor(activity.type)} bg-opacity-10`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    
                    {isEditing ? (
                      <Input
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="h-7 text-sm flex-1"
                        placeholder="Subject"
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {activity.subject || `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}`}
                          </h4>
                          {getDirectionBadge(activity.direction)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {activity.agent && <span>{activity.agent.full_name}</span>}
                          <span>•</span>
                          <span>{getActivityAge(activity.occurred_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => saveActivityEdit(activity.id)} className="h-6 px-2 text-xs">
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEditActivity} className="h-6 px-2 text-xs">
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => startEditActivity(activity)} className="h-6 w-6 p-0">
                        <Edit className="h-3 w-3 text-gray-400" />
                      </Button>
                    )}
                    <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                  </div>
                </div>

              {/* Activity Content */}
              <div className="px-3 py-2 border-t border-gray-50">
                {/* Activity Snippet - Editable */}
                {isEditing ? (
                  <Textarea
                    value={editedSnippet}
                    onChange={(e) => setEditedSnippet(e.target.value)}
                    className="text-sm min-h-[60px]"
                    placeholder="Notes..."
                  />
                ) : activity.snippet ? (
                  <p className="text-sm text-gray-700 leading-relaxed">{activity.snippet}</p>
                ) : null}

                {/* Compact Audio Player for Call Activities */}
                {!isEditing && activity.type === 'call' && activity.activity_files && activity.activity_files.length > 0 && (
                  <div className="mt-2">
                    {activity.activity_files
                      .filter(af => af.files.kind === 'audio')
                      .map(audioFile => (
                        <div key={audioFile.file_id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayAudio(activity)}
                            className="h-6 w-6 p-0"
                          >
                            {playingAudio === activity.id ? (
                              <Pause className="h-3 w-3 text-blue-600" />
                            ) : (
                              <Play className="h-3 w-3 text-blue-600" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-900 truncate">Recording</p>
                          </div>
                          <span className="text-xs text-blue-700">{((audioFile.files.size_bytes || 0) / 1024 / 1024).toFixed(1)} MB</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Download className="h-3 w-3 text-blue-600" />
                          </Button>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* AI Artifacts Display */}
                <AIArtifactsDisplay activityId={activity.id} />

                {/* Compact Upload for Call Activities without recordings */}
                {!isEditing && activity.type === 'call' && (!activity.activity_files || activity.activity_files.filter(af => af.files.kind === 'audio').length === 0) && (
                  <div className="mt-2">
                    <details className="group">
                      <summary className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:text-blue-700 list-none">
                        <Upload className="h-3 w-3" />
                        <span>Upload Recording</span>
                      </summary>
                      <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                        <AudioUpload
                          activityId={activity.id}
                          onProcessingComplete={handleAudioProcessingComplete}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        dealId={dealId}
        contactId={contactId}
        onActivityCreated={handleActivityCreated}
        preselectedType={selectedActivityType}
      />
    </div>
  )
}
