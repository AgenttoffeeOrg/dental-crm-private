'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Save,
  Pencil,
  Check,
  X,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import type { Pipeline, PipelineStage } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface PipelineSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsUpdated: () => void
  pipelineId?: string
}

export function PipelineSettingsDialog({ 
  open, 
  onOpenChange, 
  onSettingsUpdated,
  pipelineId
}: PipelineSettingsDialogProps) {
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [editingPipeline, setEditingPipeline] = useState(false)
  const [tempPipelineName, setTempPipelineName] = useState('')
  const [tempPipelineDescription, setTempPipelineDescription] = useState('')
  const [tempIsDefault, setTempIsDefault] = useState(false)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [tempStageName, setTempStageName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (open && pipelineId && orgId && !tenantLoading) {
      loadPipelineAndStages()
    }
  }, [open, pipelineId, orgId, tenantLoading])

  const loadPipelineAndStages = async () => {
    if (!pipelineId || !orgId) return

    try {
      // Load pipeline details - WITH TENANT FILTER! 🔒
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .single()

      if (pipelineError) throw pipelineError

      setPipeline(pipelineData)
      setTempPipelineName(pipelineData.name)
      setTempPipelineDescription(pipelineData.description || '')
      setTempIsDefault(pipelineData.is_default || false)

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .order('position')

      if (stagesError) throw stagesError

      setStages(stagesData || [])
    } catch (error) {
      console.error('Error loading pipeline data:', error)
      toast.error('Failed to load pipeline')
    }
  }

  const addStage = async () => {
    if (!newStageName.trim() || !pipelineId) {
      toast.error('Please enter a stage name')
      return
    }

    try {
      setLoading(true)

      const maxPosition = Math.max(...stages.map(s => s.position || 0), 0)

      const { error } = await supabase
        .from('pipeline_stages')
        .insert({
          name: newStageName.trim(),
          pipeline_id: pipelineId,
          tenant_id: tenantId,
          position: maxPosition + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setNewStageName('')
      loadPipelineAndStages()
      toast.success('Stage added successfully')
    } catch (error) {
      console.error('Error adding stage:', error)
      toast.error('Failed to add stage')
    } finally {
      setLoading(false)
    }
  }

  const deleteStage = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage? All deals in this stage will need to be moved.')) {
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId)

      if (error) throw error

      loadPipelineAndStages()
      toast.success('Stage deleted successfully')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting stage:', error)
      toast.error('Failed to delete stage')
    } finally {
      setLoading(false)
    }
  }

  const updatePipelineDetails = async () => {
    if (!pipeline || !tempPipelineName.trim()) {
      toast.error('Pipeline name cannot be empty')
      return
    }

    try {
      setLoading(true)

      // If setting as default, unset others first
      if (tempIsDefault && !pipeline.is_default) {
        try {
          await supabase
            .from('pipelines')
            .update({ is_default: false })
            .eq('tenant_id', tenantId)
        } catch (err) {
          // Ignore if is_default column doesn't exist
          console.log('Note: is_default column may not exist yet')
        }
      }

      // Try with all fields first
      let { error } = await supabase
        .from('pipelines')
        .update({
          name: tempPipelineName.trim(),
          description: tempPipelineDescription.trim() || null,
          is_default: tempIsDefault,
          updated_at: new Date().toISOString()
        })
        .eq('id', pipeline.id)

      // If it fails, try with just name (fallback for missing columns)
      if (error) {
        console.log('Full update failed, trying with name only:', JSON.stringify(error, null, 2))
        
        const { error: nameOnlyError } = await supabase
          .from('pipelines')
          .update({
            name: tempPipelineName.trim()
          })
          .eq('id', pipeline.id)

        if (nameOnlyError) {
          throw nameOnlyError
        }

        toast.warning('Pipeline name updated (some fields require database migration)')
      } else {
        toast.success('Pipeline updated successfully')
      }

      setEditingPipeline(false)
      await loadPipelineAndStages()
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating pipeline:', JSON.stringify(error, null, 2))
      toast.error('Failed to update pipeline')
    } finally {
      setLoading(false)
    }
  }

  const updateStageName = async (stageId: string) => {
    if (!tempStageName.trim()) {
      toast.error('Stage name cannot be empty')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('pipeline_stages')
        .update({ 
          name: tempStageName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId)

      if (error) throw error

      toast.success('Stage updated successfully')
      setEditingStageId(null)
      await loadPipelineAndStages()
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating stage:', error)
      toast.error('Failed to update stage')
    } finally {
      setLoading(false)
    }
  }

  const deletePipeline = async () => {
    if (!pipeline) return

    if (!confirm(`Are you sure you want to delete the pipeline "${pipeline.name}"? This action cannot be undone and all deals in this pipeline will be lost.`)) {
      return
    }

    try {
      setLoading(true)

      // Delete pipeline (stages and deals will cascade if foreign keys are set up)
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', pipeline.id)

      if (error) throw error

      toast.success('Pipeline deleted successfully')
      onOpenChange(false)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting pipeline:', error)
      toast.error('Failed to delete pipeline. There may be deals still assigned to it.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pipeline Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pipeline Info - Editable */}
          {pipeline && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Pipeline Details
                    {!editingPipeline && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingPipeline(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </CardTitle>
                  {pipeline.is_default && !editingPipeline && (
                    <Badge variant="secondary">Default Pipeline</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPipeline ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pipeline-name">Pipeline Name</Label>
                      <Input
                        id="pipeline-name"
                        value={tempPipelineName}
                        onChange={(e) => setTempPipelineName(e.target.value)}
                        placeholder="Enter pipeline name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pipeline-description">Description (Optional)</Label>
                      <Textarea
                        id="pipeline-description"
                        value={tempPipelineDescription}
                        onChange={(e) => setTempPipelineDescription(e.target.value)}
                        placeholder="Describe what this pipeline is for..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="is-default"
                          checked={tempIsDefault}
                          onCheckedChange={setTempIsDefault}
                        />
                        <Label htmlFor="is-default" className="cursor-pointer">
                          Set as default pipeline
                        </Label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={updatePipelineDetails}
                        disabled={loading || !tempPipelineName.trim()}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingPipeline(false)
                          if (pipeline) {
                            setTempPipelineName(pipeline.name)
                            setTempPipelineDescription(pipeline.description || '')
                            setTempIsDefault(pipeline.is_default || false)
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-gray-600">Name</Label>
                      <p className="text-base font-medium">{pipeline.name}</p>
                    </div>
                    {pipeline.description && (
                      <div>
                        <Label className="text-xs text-gray-600">Description</Label>
                        <p className="text-sm text-gray-700">{pipeline.description}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pipeline Stages */}
          {pipeline && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Pipeline Stages
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Manage the stages in this pipeline
                </p>
              </div>

              {/* Add New Stage */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add New Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter stage name..."
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addStage()
                        }
                      }}
                    />
                    <Button onClick={addStage} disabled={loading || !newStageName.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stage
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Stages */}
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <Card key={stage.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        
                        <div className="flex-1">
                          {editingStageId === stage.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={tempStageName}
                                onChange={(e) => setTempStageName(e.target.value)}
                                className="h-8"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    updateStageName(stage.id)
                                  } else if (e.key === 'Escape') {
                                    setEditingStageId(null)
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => updateStageName(stage.id)}
                                disabled={loading}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingStageId(null)}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stage.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Position {stage.position}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {editingStageId !== stage.id && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingStageId(stage.id)
                                setTempStageName(stage.name)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => deleteStage(stage.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {stages.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-400 mb-2">No stages configured</div>
                    <p className="text-sm text-gray-600">
                      Add your first pipeline stage to get started
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Danger Zone - Delete Pipeline */}
          {pipeline && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Delete Pipeline</p>
                    <p className="text-xs text-red-700 mt-1">
                      Permanently delete this pipeline and all associated deals. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deletePipeline}
                    disabled={loading}
                    className="ml-4"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete Pipeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onSettingsUpdated()
                onOpenChange(false)
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

