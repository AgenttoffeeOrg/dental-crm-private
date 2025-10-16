'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Phone, Mail, MessageSquare, FileText, Sparkles, Loader2, Upload } from 'lucide-react'

const activitySchema = z.object({
  type: z.enum(['call', 'email', 'whatsapp', 'note']),
  direction: z.enum(['inbound', 'outbound']).optional(),
  subject: z.string().min(1, 'Subject is required'),
  snippet: z.string().optional(),
  occurred_at: z.string().min(1, 'Date and time is required'),
})

type ActivityFormData = z.infer<typeof activitySchema>

interface CreateActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId?: string
  contactId: string
  onActivityCreated: () => void
  preselectedType?: 'call' | 'email' | 'whatsapp' | 'note' | null
  tenantId?: string
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  dealId,
  contactId,
  onActivityCreated,
  preselectedType = null,
  tenantId
}: CreateActivityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [processingAudio, setProcessingAudio] = useState(false)
  const supabase = createClient()

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'note',
      subject: '',
      snippet: '',
      occurred_at: new Date().toISOString().slice(0, 16),
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        type: preselectedType || 'note',
        subject: '',
        snippet: '',
        occurred_at: new Date().toISOString().slice(0, 16),
      })
      setAudioFile(null)
      setProcessingAudio(false)
    }
  }, [open, preselectedType, form])

  const selectedType = form.watch('type')
  const showDirectionField = ['call', 'email', 'whatsapp'].includes(selectedType)

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac']
      const hasValidType = allowedTypes.includes(file.type)
      const hasValidExtension = file.name.match(/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i)
      
      if (!hasValidType && !hasValidExtension) {
        toast.error('Please select a valid audio file (MP3, WAV, M4A, etc.)')
        return
      }
      
      setAudioFile(file)
      toast.success(`Audio file "${file.name}" selected`)
    }
  }

  const onSubmit = async (data: ActivityFormData) => {
    setLoading(true)
    try {
      const activityData = {
        ...data,
        tenant_id: tenantId,
        contact_id: contactId,
        deal_id: dealId,
        occurred_at: new Date(data.occurred_at).toISOString(),
        direction: showDirectionField ? data.direction : null,
      }

      const { data: newActivity, error } = await supabase
        .from('activities')
        .insert([activityData])
        .select()
        .single()

      if (error) throw error

      toast.success('Activity created successfully')
      
      // If it's a call activity with audio file, upload and process
      if (data.type === 'call' && audioFile) {
        setProcessingAudio(true)
        toast.info('Uploading audio file...')
        
        try {
          // Upload audio file
          const formData = new FormData()
          formData.append('file', audioFile)
          formData.append('activityId', newActivity.id)

          const uploadResponse = await fetch('/api/upload/audio', {
            method: 'POST',
            body: formData,
          })

          const uploadResult = await uploadResponse.json()

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Upload failed')
          }

          toast.success('Audio uploaded successfully!')
          toast.info('Starting AI analysis...')

          // Trigger AI processing
          const aiResponse = await fetch('/api/process-audio-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_id: newActivity.id }),
          })

          const aiResult = await aiResponse.json()

          if (aiResult.success) {
            toast.success('AI analysis completed! 🤖✨')
          } else {
            toast.warning('Audio uploaded but AI processing failed')
          }
        } catch (audioError) {
          console.error('Audio processing error:', audioError)
          toast.error('Audio upload failed, but call was created')
        } finally {
          setProcessingAudio(false)
        }
      }

      // Close dialog and refresh
      onActivityCreated()
      onOpenChange(false)
      form.reset()
      setAudioFile(null)
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Failed to create activity')
    } finally {
      setLoading(false)
    }
  }

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />
      case 'note': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'call': return 'Phone Call'
      case 'email': return 'Email'
      case 'whatsapp': return 'WhatsApp'
      case 'note': return 'Note'
      default: return 'Activity'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActivityTypeIcon(selectedType)}
            Add {getActivityTypeLabel(selectedType)}
            {preselectedType && (
              <Badge variant="secondary" className="ml-2">
                {getActivityTypeLabel(preselectedType)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!preselectedType && (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="call">📞 Phone Call</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                          <SelectItem value="note">📝 Note</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showDirectionField && (
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inbound">📞 Inbound</SelectItem>
                          <SelectItem value="outbound">📱 Outbound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="occurred_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${selectedType} subject...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="snippet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={`Add details about this ${selectedType}...`}
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Audio Upload Section for Calls */}
            {selectedType === 'call' && (
              <div className="space-y-4">
                <Separator />
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-purple-900">Call Recording & AI Analysis</h3>
                      <p className="text-sm text-purple-700">Upload your recording for comprehensive insights</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">Optional</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-800 mb-3">
                        🎯 <strong>What you'll get:</strong> Transcription • Patient sentiment • Treatment recommendations • Auto-generated tasks • Conversion scoring
                      </p>
                      
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-purple-900">
                          Select Audio File
                        </label>
                        <div className="relative">
                          <Input
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac"
                            onChange={handleAudioFileChange}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                          />
                          {audioFile && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                              <Upload className="h-4 w-4" />
                              <span className="font-medium">{audioFile.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || processingAudio}
                className="min-w-[160px]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {processingAudio && <Sparkles className="mr-2 h-4 w-4 animate-pulse" />}
                {loading ? 'Creating...' : 
                 processingAudio ? 'Processing AI...' : 
                 selectedType === 'call' && audioFile ? 'Create & Analyze' :
                 `Create ${getActivityTypeLabel(selectedType)}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}