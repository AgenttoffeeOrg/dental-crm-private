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
import { 
  Settings,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import type { Pipeline, PipelineStage } from '@/types/database'

interface PipelineSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsUpdated: () => void
  pipelineId?: string
  tenantId?: string
}

export function PipelineSettingsDialog({ 
  open, 
  onOpenChange, 
  onSettingsUpdated,
  pipelineId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: PipelineSettingsDialogProps) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (open && pipelineId) {
      loadPipelineAndStages()
    }
  }, [open, pipelineId])

  const loadPipelineAndStages = async () => {
    if (!pipelineId) return

    try {
      // Load pipeline details
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .single()

      if (pipelineError) throw pipelineError

      setPipeline(pipelineData)

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
          {/* Pipeline Info */}
          {pipeline && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{pipeline.name}</h3>
                  {pipeline.description && (
                    <p className="text-sm text-blue-700 mt-1">{pipeline.description}</p>
                  )}
                </div>
                {pipeline.is_default && (
                  <Badge variant="secondary">Default Pipeline</Badge>
                )}
              </div>
            </div>
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Position {stage.position}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              toast.info('Stage name editing will be available in a future update')
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

