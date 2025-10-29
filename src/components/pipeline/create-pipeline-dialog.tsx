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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Plus,
  X,
  Save,
  TrendingUp,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

const pipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required'),
  // description and is_default fields removed - columns don't exist in schema
})

type PipelineFormData = z.infer<typeof pipelineSchema>

interface PipelineTemplate {
  name: string
  description: string
  suggested_stages: string[]
  icon: string
}

interface CreatePipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPipelineCreated: () => void
  template?: PipelineTemplate | null
  templates?: PipelineTemplate[]
}

export function CreatePipelineDialog({ 
  open, 
  onOpenChange, 
  onPipelineCreated,
  template,
  templates = []
}: CreatePipelineDialogProps) {
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [loading, setLoading] = useState(false)
  const [stages, setStages] = useState<string[]>([])
  const [newStage, setNewStage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(template || null)
  const supabase = createClient()

  const form = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      name: '',
    },
  })

  // Load template data when dialog opens or template changes
  useEffect(() => {
    if (open && selectedTemplate) {
      form.reset({
        name: selectedTemplate.name,
      })
      setStages(selectedTemplate.suggested_stages)
    } else if (open && !selectedTemplate) {
      form.reset({
        name: '',
      })
      setStages([
        'New Lead',
        'Consultation',
        'Proposal Sent',
        'Negotiation',
        'Closed Won'
      ])
    }
  }, [open, selectedTemplate])

  const addStage = () => {
    if (newStage.trim() && !stages.includes(newStage.trim())) {
      setStages([...stages, newStage.trim()])
      setNewStage('')
    }
  }

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index))
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex >= 0 && newIndex < stages.length) {
      [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]]
      setStages(newStages)
    }
  }

  const createStages = async (pipelineId: string) => {
    const stagesData = stages.map((stageName, index) => ({
      name: stageName,
      pipeline_id: pipelineId,
      tenant_id: orgId, // ✅ SECURITY: Use authenticated user's org
      position: index,
    }))

    console.log('Creating stages:', stagesData)

    const { error: stagesError } = await supabase
      .from('pipeline_stages')
      .insert(stagesData)

    if (stagesError) {
      console.error('Stages creation error:', stagesError)
      throw stagesError
    }
  }

  const onSubmit = async (data: PipelineFormData) => {
    if (stages.length === 0) {
      toast.error('Please add at least one stage to your pipeline')
      return
    }

    if (loading) return

    setLoading(true)
    
    try {
      // Create pipeline (only with columns that exist in schema)
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name: data.name,
          tenant_id: orgId, // ✅ SECURITY: Use authenticated user's org
        })
        .select()
        .single()

      if (pipelineError) {
        console.error('Pipeline creation error (full object):', JSON.stringify(pipelineError, null, 2))
        console.error('Pipeline creation error details:', {
          hasMessage: !!pipelineError.message,
          hasCode: !!pipelineError.code,
          message: pipelineError.message,
          code: pipelineError.code,
          details: pipelineError.details,
          hint: pipelineError.hint,
          type: typeof pipelineError
        })
        
        // Always try the fallback since columns likely don't exist
        console.log('Attempting fallback: creating pipeline without optional fields...')
        
        const { data: pipelineData2, error: pipelineError2 } = await supabase
          .from('pipelines')
          .insert({
            name: data.name,
            tenant_id: orgId, // ✅ SECURITY: Use authenticated user's org
          })
          .select()
          .single()

        if (pipelineError2) {
          console.error('Pipeline creation failed (fallback):', JSON.stringify(pipelineError2, null, 2))
          toast.error(`Failed to create pipeline: ${pipelineError2.message || pipelineError2.code || 'Database error'}`)
          throw pipelineError2
        }
        
        if (!pipelineData2) {
          console.error('No pipeline data returned from fallback')
          toast.error('Pipeline creation failed - no data returned')
          throw new Error('No pipeline data returned')
        }
        
        console.log('✅ Pipeline created (basic mode):', pipelineData2)
        
        // Create stages for this pipeline
        await createStages(pipelineData2.id)
        
        toast.success(`Pipeline "${data.name}" created successfully with ${stages.length} stages!`)
        onPipelineCreated()
        onOpenChange(false)
        setLoading(false)
        return
      }

      // Success on first attempt - create stages
      console.log('✅ Pipeline created with full features:', pipelineData)
      await createStages(pipelineData.id)
      
      toast.success(`Pipeline "${data.name}" created successfully with ${stages.length} stages!`)
      onPipelineCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating pipeline:', error)
      toast.error('Failed to create pipeline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!loading) {
        onOpenChange(isOpen)
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div>Create New Pipeline</div>
              <p className="text-sm font-normal text-gray-500 mt-1">
                {selectedTemplate ? `Using ${selectedTemplate.name} template` : 'Create a custom pipeline from scratch'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Template Selector - Only show if templates are provided and none selected yet */}
          {templates.length > 0 && !template && (
            <div className="space-y-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-semibold text-purple-900">Choose a Template (Optional)</h3>
              </div>
              <p className="text-sm text-purple-700">Select a pre-built template or start from scratch</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Custom/Blank Option */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    !selectedTemplate 
                      ? 'border-blue-600 bg-blue-50 shadow-md' 
                      : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">✏️</div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Custom Pipeline</div>
                      <div className="text-xs text-gray-600">Start from scratch</div>
                    </div>
                  </div>
                </button>

                {/* Template Options */}
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTemplate?.name === tmpl.name 
                        ? 'border-purple-600 bg-purple-50 shadow-md' 
                        : 'border-gray-300 bg-white hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{tmpl.icon}</div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{tmpl.name}</div>
                        <div className="text-xs text-gray-600 line-clamp-1">{tmpl.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Details */}
          <div className="space-y-4 p-6 bg-gray-50 rounded-lg border">
            <h3 className="text-base font-semibold">Pipeline Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Pipeline Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., High-Value Treatment, Emergency Pipeline"
                className="h-11"
                disabled={loading}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Description and is_default fields removed - columns don't exist in schema */}
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> The default pipeline will be auto-selected when creating new deals.
              </p>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Pipeline Stages</h3>
                <p className="text-sm text-gray-600">Define the stages deals will move through</p>
              </div>
              <Badge variant="outline">{stages.length} stages</Badge>
            </div>

            {/* Add Stage Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a new stage (e.g., Consultation Booked)"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addStage()
                  }
                }}
                className="h-11"
                disabled={loading}
              />
              <Button 
                type="button" 
                onClick={addStage}
                disabled={loading || !newStage.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Stages List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {stages.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500">No stages added yet</p>
                  <p className="text-sm text-gray-400">Add stages to define your pipeline workflow</p>
                </div>
              ) : (
                stages.map((stage, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <div className="flex-1 font-medium">{stage}</div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveStage(index, 'up')}
                        disabled={loading || index === 0}
                        className="h-8 w-8 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveStage(index, 'down')}
                        disabled={loading || index === stages.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeStage(index)}
                        disabled={loading}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <p className="text-xs text-gray-600">
              💡 Tip: Common final stages include "Completed", "Lost", "Closed Won", or "Closed Lost"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3 pt-6 border-t">
            <p className="text-sm text-gray-500">
              Minimum {stages.length}/1 stage{stages.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!loading) {
                    onOpenChange(false)
                  }
                }}
                disabled={loading}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || stages.length === 0}
                className="min-w-[160px] bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

