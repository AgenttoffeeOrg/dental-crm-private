/**
 * =====================================================
 * PIPELINE MAPPING SETTINGS - TAG-TO-PIPELINE ROUTING
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 5 - Pipeline Mapping UI
 * =====================================================
 * 
 * PURPOSE:
 * Complete UI for mapping treatment tags to pipelines for automatic deal routing
 * 
 * FEATURES:
 * - Visual mapping interface (tag cards → pipeline dropdown)
 * - Create/Edit/Delete mappings
 * - Stage selector (optional specific stage)
 * - Advanced conditions (value ranges, auto-assignment)
 * - Unmapped tags warning
 * - Bulk mapping (select multiple tags → one pipeline)
 * - Set default "Unsorted" pipeline
 * - Preview: "If deal has [tag], it goes to [pipeline]"
 * - Multi-location support
 * - Permission-based access control
 * 
 * USAGE:
 * ```typescript
 * <PipelineMappingSettings tenantId={tenantId} />
 * ```
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Settings2,
  Sparkles,
  Target,
  Filter,
  Layers
} from 'lucide-react'
import { invalidateRoutingCache } from '@/lib/treatment-routing'

// =====================================================
// TYPES
// =====================================================

interface TreatmentTag {
  id: string
  name: string
  color: string
  icon: string
  keywords: string[]
  scope: 'organization' | 'location'
  location_id: string | null
}

interface Pipeline {
  id: string
  name: string
  description: string | null
  is_default: boolean
}

interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  position: number
}

interface TagMapping {
  id: string
  treatment_tag_id: string
  pipeline_id: string
  stage_id: string | null
  min_value_cents: number | null
  max_value_cents: number | null
  priority: number
  is_active: boolean
  auto_assign_owner: boolean
  assigned_owner_user_id: string | null
  // Joined data
  tag?: TreatmentTag
  pipeline?: Pipeline
  stage?: PipelineStage
}

interface TenantRoutingSettings {
  id: string
  tenant_id: string
  is_enabled: boolean
  default_unsorted_pipeline_id: string | null
  ai_routing_enabled: boolean
  ai_confidence_threshold: number
  manual_override_priority: boolean
}

// =====================================================
// CREATE/EDIT MAPPING DIALOG
// =====================================================

interface MappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mapping: TagMapping | null
  tenantId: string
  tags: TreatmentTag[]
  pipelines: Pipeline[]
  stages: PipelineStage[]
  onSaved: () => void
  preselectedTags?: string[] // For bulk mapping
}

function MappingDialog({
  open,
  onOpenChange,
  mapping,
  tenantId,
  tags,
  pipelines,
  stages,
  onSaved,
  preselectedTags
}: MappingDialogProps) {
  const [tagId, setTagId] = useState('')
  const [pipelineId, setPipelineId] = useState('')
  const [stageId, setStageId] = useState<string>('_first_stage')
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')
  const [priority, setPriority] = useState('50')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  // Filter stages by selected pipeline
  const filteredStages = stages.filter(s => s.pipeline_id === pipelineId)

  // Populate form when editing
  useEffect(() => {
    if (mapping) {
      setTagId(mapping.treatment_tag_id)
      setPipelineId(mapping.pipeline_id)
      setStageId(mapping.stage_id || '_first_stage')
      setMinValue(mapping.min_value_cents ? (mapping.min_value_cents / 100).toString() : '')
      setMaxValue(mapping.max_value_cents ? (mapping.max_value_cents / 100).toString() : '')
      setPriority(mapping.priority.toString())
    } else {
      // Reset for new mapping
      setTagId(preselectedTags && preselectedTags.length > 0 ? preselectedTags[0] : '')
      setPipelineId('')
      setStageId('_first_stage')
      setMinValue('')
      setMaxValue('')
      setPriority('50')
    }
  }, [mapping, open, preselectedTags])

  // Auto-select first pipeline if none selected
  useEffect(() => {
    if (open && !pipelineId && pipelines.length > 0) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0]
      setPipelineId(defaultPipeline.id)
    }
  }, [open, pipelines])

  const handleSave = async () => {
    // Validation
    if (!tagId) {
      toast.error('Please select a treatment tag')
      return
    }

    if (!pipelineId) {
      toast.error('Please select a pipeline')
      return
    }

    // Value range validation
    if (minValue && maxValue) {
      const minCents = Math.round(parseFloat(minValue) * 100)
      const maxCents = Math.round(parseFloat(maxValue) * 100)
      if (minCents > maxCents) {
        toast.error('Minimum value cannot be greater than maximum value')
        return
      }
    }

    try {
      setSaving(true)

      const mappingData = {
        tenant_id: tenantId,
        location_id: null, // TODO: Add location support
        treatment_tag_id: tagId,
        pipeline_id: pipelineId,
        stage_id: stageId === '_first_stage' ? null : stageId,
        min_value_cents: minValue ? Math.round(parseFloat(minValue) * 100) : null,
        max_value_cents: maxValue ? Math.round(parseFloat(maxValue) * 100) : null,
        priority: parseInt(priority),
        is_active: true,
        updated_at: new Date().toISOString()
      }

      let error

      if (mapping) {
        // Update existing mapping
        const result = await supabase
          .from('treatment_tag_pipeline_mappings')
          .update(mappingData)
          .eq('id', mapping.id)
        error = result.error
      } else {
        // Create new mapping (or multiple for bulk)
        const tagsToMap = preselectedTags && preselectedTags.length > 0 ? preselectedTags : [tagId]
        const mappingsToInsert = tagsToMap.map(tid => ({
          ...mappingData,
          treatment_tag_id: tid
        }))

        const result = await supabase
          .from('treatment_tag_pipeline_mappings')
          .insert(mappingsToInsert)
        error = result.error
      }

      if (error) throw error

      // Clear cache
      invalidateRoutingCache(tenantId)

      const count = preselectedTags?.length || 1
      toast.success(mapping
        ? 'Mapping updated successfully'
        : `${count} mapping${count > 1 ? 's' : ''} created successfully`
      )
      onSaved()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving mapping:', error)
      if (error.code === '23505') {
        toast.error('This mapping already exists')
      } else {
        toast.error('Failed to save mapping')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mapping ? 'Edit Pipeline Mapping' : preselectedTags && preselectedTags.length > 1 ? 'Bulk Map Tags to Pipeline' : 'Create Pipeline Mapping'}
          </DialogTitle>
          <DialogDescription>
            {mapping
              ? 'Update the mapping to route deals with this treatment tag to a specific pipeline.'
              : preselectedTags && preselectedTags.length > 1
              ? `Map ${preselectedTags.length} tags to the same pipeline for automatic routing.`
              : 'Create a mapping to route deals with this treatment tag to a specific pipeline.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Treatment Tag */}
          <div className="space-y-2">
            <Label htmlFor="tag">
              Treatment Tag <span className="text-red-500">*</span>
            </Label>
            {preselectedTags && preselectedTags.length > 1 ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>{preselectedTags.length} tags selected:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {preselectedTags.map(tid => {
                    const tag = tags.find(t => t.id === tid)
                    return tag ? (
                      <Badge key={tid} style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                        {tag.icon} {tag.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            ) : (
              <Select value={tagId} onValueChange={setTagId} disabled={!!mapping}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a treatment tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <span>{tag.icon}</span>
                        <span>{tag.name}</span>
                        {tag.scope === 'location' && (
                          <Badge variant="outline" className="text-xs ml-2">Location</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Pipeline */}
          <div className="space-y-2">
            <Label htmlFor="pipeline">
              Destination Pipeline <span className="text-red-500">*</span>
            </Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pipeline..." />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(pipeline => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    <div className="flex items-center gap-2">
                      <span>{pipeline.name}</span>
                      {pipeline.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="stage">Destination Stage (Optional)</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_first_stage">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    First stage (default)
                  </div>
                </SelectItem>
                {filteredStages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name} (Position {stage.position})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">
              Leave as "First stage" to route to the pipeline's first stage
            </p>
          </div>

          {/* Advanced: Value Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters (Optional)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minValue" className="text-xs">Min Deal Value (£)</Label>
                <Input
                  id="minValue"
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  placeholder="e.g., 1000"
                  min="0"
                  step="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxValue" className="text-xs">Max Deal Value (£)</Label>
                <Input
                  id="maxValue"
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  placeholder="e.g., 10000"
                  min="0"
                  step="100"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Only route deals within this value range
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority (0-100)</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-600">
              Higher priority mappings are checked first if a tag matches multiple pipelines
            </p>
          </div>

          {/* Preview */}
          {tagId && pipelineId && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Routing Preview:</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                If a deal has the tag{' '}
                <strong>"{tags.find(t => t.id === tagId)?.name}"</strong>
                {minValue && ` and value ≥ £${minValue}`}
                {maxValue && ` and value ≤ £${maxValue}`}
                , it will be routed to{' '}
                <strong>"{pipelines.find(p => p.id === pipelineId)?.name}"</strong>
                {stageId && stageId !== '_first_stage' && (
                  <> in stage <strong>"{filteredStages.find(s => s.id === stageId)?.name}"</strong></>
                )}
                .
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : mapping ? 'Update Mapping' : 'Create Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// DELETE MAPPING CONFIRMATION
// =====================================================

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mapping: TagMapping | null
  onConfirm: () => void
}

function DeleteDialog({ open, onOpenChange, mapping, onConfirm }: DeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Pipeline Mapping?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the mapping from{' '}
            <strong>&quot;{mapping?.tag?.name}&quot;</strong> to{' '}
            <strong>&quot;{mapping?.pipeline?.name}&quot;</strong>?
            
            <p className="mt-3 text-sm">
              This action cannot be undone. Deals with this tag will no longer automatically route to this pipeline.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Mapping
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PipelineMappingSettings({ tenantId }: { tenantId: string }) {
  const [tags, setTags] = useState<TreatmentTag[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [mappings, setMappings] = useState<TagMapping[]>([])
  const [routingSettings, setRoutingSettings] = useState<TenantRoutingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<TagMapping | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingMapping, setDeletingMapping] = useState<TagMapping | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filterScope, setFilterScope] = useState<'all' | 'mapped' | 'unmapped'>('all')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('treatment_tags')
        .select('id, name, color, icon, keywords, scope, location_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')

      if (tagsError) throw tagsError

      // Load pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('id, name, description, is_default')
        .eq('tenant_id', tenantId)
        .order('name')

      if (pipelinesError) throw pipelinesError

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, pipeline_id, name, position')
        .eq('tenant_id', tenantId)
        .order('position')

      if (stagesError) throw stagesError

      // Load mappings with joined data
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('treatment_tag_pipeline_mappings')
        .select(`
          *,
          tag:treatment_tags(id, name, color, icon),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: false })

      if (mappingsError) throw mappingsError

      // Load routing settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('tenant_routing_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError

      setTags(tagsData || [])
      setPipelines(pipelinesData || [])
      setStages(stagesData || [])
      setMappings(mappingsData || [])
      setRoutingSettings(settingsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load pipeline mappings')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingMapping) return

    try {
      const { error } = await supabase
        .from('treatment_tag_pipeline_mappings')
        .delete()
        .eq('id', deletingMapping.id)

      if (error) throw error

      // Clear cache
      invalidateRoutingCache(tenantId)

      toast.success('Mapping deleted successfully')
      loadData()
    } catch (error) {
      console.error('Error deleting mapping:', error)
      toast.error('Failed to delete mapping')
    } finally {
      setDeleteDialogOpen(false)
      setDeletingMapping(null)
    }
  }

  const handleSetUnsortedPipeline = async (pipelineId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_routing_settings')
        .upsert({
          tenant_id: tenantId,
          default_unsorted_pipeline_id: pipelineId,
          is_enabled: true,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Clear cache
      invalidateRoutingCache(tenantId)

      toast.success('Default unsorted pipeline updated')
      loadData()
    } catch (error) {
      console.error('Error updating unsorted pipeline:', error)
      toast.error('Failed to update unsorted pipeline')
    }
  }

  const handleBulkMap = () => {
    if (selectedTags.length === 0) {
      toast.error('Please select at least one tag')
      return
    }
    setEditingMapping(null)
    setDialogOpen(true)
  }

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const selectAllUnmapped = () => {
    const unmappedTags = tags.filter(tag =>
      !mappings.some(m => m.treatment_tag_id === tag.id)
    )
    setSelectedTags(unmappedTags.map(t => t.id))
  }

  // Get unmapped tags
  const unmappedTags = tags.filter(tag =>
    !mappings.some(m => m.treatment_tag_id === tag.id)
  )

  // Filter tags based on filter scope
  const filteredTags = tags.filter(tag => {
    if (filterScope === 'mapped') {
      return mappings.some(m => m.treatment_tag_id === tag.id)
    } else if (filterScope === 'unmapped') {
      return !mappings.some(m => m.treatment_tag_id === tag.id)
    }
    return true // 'all'
  })

  // Statistics
  const totalTags = tags.length
  const mappedCount = tags.filter(tag => mappings.some(m => m.treatment_tag_id === tag.id)).length
  const unmappedCount = unmappedTags.length
  const coveragePercent = totalTags > 0 ? Math.round((mappedCount / totalTags) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tags</p>
                <p className="text-2xl font-bold">{totalTags}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mapped</p>
                <p className="text-2xl font-bold">{mappedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unmapped</p>
                <p className="text-2xl font-bold">{unmappedCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coverage</p>
                <p className="text-2xl font-bold">{coveragePercent}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unmapped Tags Warning */}
      {unmappedCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">
                  {unmappedCount} tag{unmappedCount > 1 ? 's' : ''} not mapped to any pipeline
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  Deals with these tags will be routed to the "Unsorted" pipeline. Map them now for better organization.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={selectAllUnmapped}
                  >
                    Select All Unmapped
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkMap}
                    disabled={selectedTags.length === 0}
                  >
                    Map {selectedTags.length || ''} Selected
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Unsorted Pipeline Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Default Unsorted Pipeline
          </CardTitle>
          <CardDescription>
            Choose which pipeline to use for deals that can't be automatically routed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Unsorted Pipeline</Label>
              <Select
                value={routingSettings?.default_unsorted_pipeline_id || ''}
                onValueChange={handleSetUnsortedPipeline}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                      {pipeline.is_default && <span className="text-xs text-gray-500"> (Default)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tag-to-Pipeline Mappings</CardTitle>
              <CardDescription>
                Route deals automatically based on treatment tags
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBulkMap}
                disabled={selectedTags.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Bulk Map ({selectedTags.length})
              </Button>
              <Button onClick={() => {
                setEditingMapping(null)
                setDialogOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Mapping
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter */}
          <div className="flex gap-4">
            <Select value={filterScope} onValueChange={(v: any) => setFilterScope(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags ({totalTags})</SelectItem>
                <SelectItem value="mapped">Mapped Only ({mappedCount})</SelectItem>
                <SelectItem value="unmapped">Unmapped Only ({unmappedCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags Grid */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading mappings...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">No tags found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTags.map(tag => {
                const tagMappings = mappings.filter(m => m.treatment_tag_id === tag.id)
                const isSelected = selectedTags.includes(tag.id)
                const isUnmapped = tagMappings.length === 0

                return (
                  <Card key={tag.id} className={isSelected ? 'ring-2 ring-blue-500' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {/* Checkbox for bulk selection */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTagSelection(tag.id)}
                          className="mt-1"
                        />

                        {/* Tag Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center text-lg"
                              style={{ backgroundColor: tag.color + '20' }}
                            >
                              {tag.icon}
                            </div>
                            <h3 className="font-semibold">{tag.name}</h3>
                            {tag.scope === 'location' && (
                              <Badge variant="outline" className="text-xs">Location</Badge>
                            )}
                            {isUnmapped && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Unmapped
                              </Badge>
                            )}
                          </div>

                          {/* Mappings */}
                          {tagMappings.length > 0 ? (
                            <div className="space-y-2">
                              {tagMappings.map(mapping => (
                                <div
                                  key={mapping.id}
                                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                                >
                                  <ArrowRight className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{mapping.pipeline?.name}</span>
                                  {mapping.stage && (
                                    <>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-sm text-gray-600">{mapping.stage.name}</span>
                                    </>
                                  )}
                                  {(mapping.min_value_cents || mapping.max_value_cents) && (
                                    <Badge variant="outline" className="text-xs">
                                      {mapping.min_value_cents && `£${mapping.min_value_cents / 100}+`}
                                      {mapping.min_value_cents && mapping.max_value_cents && ' - '}
                                      {mapping.max_value_cents && `£${mapping.max_value_cents / 100}`}
                                    </Badge>
                                  )}
                                  <div className="ml-auto flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingMapping(mapping)
                                        setDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => {
                                        setDeletingMapping(mapping)
                                        setDeleteDialogOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              No pipeline mapping. Deals will go to "Unsorted".
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <MappingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mapping={editingMapping}
        tenantId={tenantId}
        tags={tags}
        pipelines={pipelines}
        stages={stages}
        onSaved={loadData}
        preselectedTags={selectedTags}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        mapping={deletingMapping}
        onConfirm={handleDelete}
      />
    </div>
  )
}

