/**
 * =====================================================
 * CREATE DEAL SLIDE-OVER - WITH INTELLIGENT ROUTING
 * =====================================================
 * Version: 2.0.0 - Phase 7 Integration
 * Date: October 19, 2025
 * =====================================================
 * 
 * ENHANCEMENTS:
 * - Dynamic treatment tags from database (replaces hardcoded list)
 * - AI-powered tag suggestions based on deal title/notes
 * - Real-time pipeline suggestions as user selects tags
 * - "Why this pipeline?" explanation tooltip
 * - Automatic routing via routing adapter
 * - Manual override capability
 * - Loading states for routing calculation
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, DollarSign, User, Tag, Save, UserCircle, Sparkles, Info, Zap, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { quickRouteDeal, extractTreatmentTags } from '@/lib/treatment-routing'
import type { Contact, Pipeline, PipelineStage, AppUser } from '@/types/database'

interface CreateDealSlideOverProps {
  open: boolean
  onClose: () => void
  onDealCreated: () => void
  preselectedContactId?: string
}

interface TreatmentTag {
  id: string
  name: string
  color: string
  icon: string
  keywords: string[]
}

interface PipelineSuggestion {
  pipeline_id: string
  pipeline_name: string
  confidence: number
  reason: string
  matched_tags: string[]
}

const SOURCE_OPTIONS = [
  'website',
  'referral',
  'google_ads',
  'facebook',
  'instagram',
  'walk_in',
  'phone_call',
  'other'
]

export function CreateDealSlideOver({ 
  open, 
  onClose, 
  onDealCreated,
  preselectedContactId 
}: CreateDealSlideOverProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [calculatingRoute, setCalculatingRoute] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [teamMembers, setTeamMembers] = useState<AppUser[]>([])
  const [availableTags, setAvailableTags] = useState<TreatmentTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>([])
  const [pipelineSuggestion, setPipelineSuggestion] = useState<PipelineSuggestion | null>(null)
  const [userOverridePipeline, setUserOverridePipeline] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    contact_id: preselectedContactId || '',
    pipeline_id: '',
    stage_id: '',
    value_estimate: '',
    owner_user_id: '',
    source: '',
    notes: '',
  })

  const supabase = createClient()

  // =====================================================
  // LOAD INITIAL DATA
  // =====================================================

  useEffect(() => {
    if (open && appUser?.tenant_id) {
      loadData()
      loadTreatmentTags()
    }
  }, [open, appUser])

  useEffect(() => {
    if (preselectedContactId) {
      setFormData(prev => ({ ...prev, contact_id: preselectedContactId }))
    }
  }, [preselectedContactId])

  const loadData = async () => {
    try {
      // Load contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, full_name, primary_email')
        .eq('tenant_id', appUser!.tenant_id)
        .order('full_name')
      
      setContacts(contactsData || [])

      // Load pipelines
      const { data: pipelinesData } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', appUser!.tenant_id)
        .order('name')
      
      setPipelines(pipelinesData || [])

      // Load team members
      const { data: usersData } = await supabase
        .from('app_users')
        .select('id, full_name, email, role')
        .eq('tenant_id', appUser!.tenant_id)
        .order('full_name')
      
      setTeamMembers(usersData || [])

      // Auto-select default pipeline and current user as owner (will be overridden by routing)
      if (pipelinesData && pipelinesData.length > 0) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0]
        setFormData(prev => ({ 
          ...prev, 
          pipeline_id: defaultPipeline.id,
          owner_user_id: appUser!.id
        }))
        loadStages(defaultPipeline.id)
      } else {
        setFormData(prev => ({ ...prev, owner_user_id: appUser!.id }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadTreatmentTags = async () => {
    try {
      setLoadingTags(true)

      const { data, error } = await supabase
        .from('treatment_tags')
        .select('id, name, color, icon, keywords')
        .eq('tenant_id', appUser!.tenant_id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (error) throw error

      setAvailableTags(data || [])
    } catch (error) {
      console.error('Error loading treatment tags:', error)
      toast.error('Failed to load treatment tags')
    } finally {
      setLoadingTags(false)
    }
  }

  const loadStages = async (pipelineId: string) => {
    const { data: stagesData } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position')
    
    setStages(stagesData || [])

    // Auto-select first stage
    if (stagesData && stagesData.length > 0) {
      setFormData(prev => ({ ...prev, stage_id: stagesData[0].id }))
    }
  }

  // =====================================================
  // AI TAG SUGGESTIONS
  // =====================================================

  useEffect(() => {
    // Debounce AI tag suggestions
    const timer = setTimeout(() => {
      if (formData.title || formData.notes) {
        suggestTags()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData.title, formData.notes])

  const suggestTags = async () => {
    if (!formData.title && !formData.notes) return

    try {
      const combinedText = `${formData.title} ${formData.notes}`.toLowerCase()
      
      // Extract tags using AI extractor
      const extracted = await extractTreatmentTags(
        appUser!.tenant_id,
        formData.title,
        formData.notes
      )

      // Find matching tag IDs
      const matchedIds = availableTags
        .filter(tag => extracted.tags.includes(tag.name.toLowerCase()))
        .map(tag => tag.id)

      setSuggestedTagIds(matchedIds)
    } catch (error) {
      console.error('Error suggesting tags:', error)
    }
  }

  // =====================================================
  // PIPELINE SUGGESTION
  // =====================================================

  useEffect(() => {
    // Calculate pipeline suggestion when tags or value change
    if (selectedTagIds.length > 0 || formData.value_estimate) {
      calculatePipelineSuggestion()
    } else {
      setPipelineSuggestion(null)
    }
  }, [selectedTagIds, formData.value_estimate])

  const calculatePipelineSuggestion = async () => {
    if (!appUser?.tenant_id) return

    try {
      setCalculatingRoute(true)

      const selectedTagNames = availableTags
        .filter(tag => selectedTagIds.includes(tag.id))
        .map(tag => tag.name)

      const valueInCents = formData.value_estimate 
        ? Math.round(parseFloat(formData.value_estimate) * 100)
        : 0

      // Use routing engine to get suggestion
      const routingResult = await quickRouteDeal({
        tenantId: appUser.tenant_id,
        treatmentTags: selectedTagNames,
        dealTitle: formData.title,
        dealDescription: formData.notes,
        dealValue: valueInCents,
        userId: appUser.id
      })

      if (routingResult.success && routingResult.pipeline_id) {
        const pipeline = pipelines.find(p => p.id === routingResult.pipeline_id)
        
        if (pipeline) {
          setPipelineSuggestion({
            pipeline_id: routingResult.pipeline_id,
            pipeline_name: pipeline.name,
            confidence: routingResult.confidence,
            reason: routingResult.explanation,
            matched_tags: selectedTagNames
          })

          // Auto-select suggested pipeline if user hasn't manually overridden
          if (!userOverridePipeline) {
            setFormData(prev => ({ 
              ...prev, 
              pipeline_id: routingResult.pipeline_id,
              stage_id: routingResult.stage_id || ''
            }))
            
            if (routingResult.pipeline_id) {
              loadStages(routingResult.pipeline_id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calculating pipeline suggestion:', error)
    } finally {
      setCalculatingRoute(false)
    }
  }

  // =====================================================
  // HANDLERS
  // =====================================================

  const handlePipelineChange = (pipelineId: string) => {
    setUserOverridePipeline(true) // User is manually selecting
    setFormData(prev => ({ ...prev, pipeline_id: pipelineId, stage_id: '' }))
    loadStages(pipelineId)
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const acceptSuggestedTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      setSelectedTagIds(prev => [...prev, tagId])
    }
    setSuggestedTagIds(prev => prev.filter(id => id !== tagId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Deal title is required')
      return
    }

    if (!formData.contact_id) {
      toast.error('Please select a contact')
      return
    }

    if (!formData.pipeline_id || !formData.stage_id) {
      toast.error('Please select a pipeline and stage')
      return
    }

    if (!formData.value_estimate || parseFloat(formData.value_estimate) <= 0) {
      toast.error('Please enter a valid estimated value')
      return
    }

    if (!formData.owner_user_id) {
      toast.error('Please assign a deal owner')
      return
    }

    if (!appUser?.tenant_id) {
      toast.error('User session error. Please refresh the page.')
      return
    }

    setLoading(true)

    try {
      const valueInCents = Math.round(parseFloat(formData.value_estimate) * 100)

      const selectedTagNames = availableTags
        .filter(tag => selectedTagIds.includes(tag.id))
        .map(tag => tag.name)

      const dealData = {
        title: formData.title.trim(),
        contact_id: formData.contact_id,
        pipeline_id: formData.pipeline_id,
        stage_id: formData.stage_id,
        value_estimate_cents: valueInCents,
        currency: 'GBP',
        treatment_tags: selectedTagNames,
        source: formData.source || null,
        internal_notes: formData.notes.trim() || null,
        tenant_id: appUser.tenant_id,
        owner_user_id: formData.owner_user_id
      }

      const { data, error } = await supabase
        .from('deals')
        .insert([dealData])
        .select()
        .single()

      if (error) throw error

      toast.success('Deal created successfully!')
      
      // Reset form
      setFormData({
        title: '',
        contact_id: preselectedContactId || '',
        pipeline_id: '',
        stage_id: '',
        value_estimate: '',
        owner_user_id: '',
        source: '',
        notes: '',
      })
      setSelectedTagIds([])
      setSuggestedTagIds([])
      setPipelineSuggestion(null)
      setUserOverridePipeline(false)
      
      onDealCreated()
      onClose()
    } catch (error: any) {
      console.error('Error creating deal:', error)
      toast.error(error.message || 'Failed to create deal')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const selectedTags = useMemo(() => {
    return availableTags.filter(tag => selectedTagIds.includes(tag.id))
  }, [availableTags, selectedTagIds])

  const suggestedTags = useMemo(() => {
    return availableTags.filter(tag => 
      suggestedTagIds.includes(tag.id) && !selectedTagIds.includes(tag.id)
    )
  }, [availableTags, suggestedTagIds, selectedTagIds])

  const unselectedTags = useMemo(() => {
    return availableTags.filter(tag => 
      !selectedTagIds.includes(tag.id) && !suggestedTagIds.includes(tag.id)
    )
  }, [availableTags, selectedTagIds, suggestedTagIds])

  if (!open) return null

  return (
    <TooltipProvider>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Create New Deal</h2>
                <p className="text-sm text-white/80">AI-powered routing enabled</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Deal Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2">
                Deal Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Dental Implant Consultation"
                className="h-11"
                required
              />
            </div>

            {/* Contact Selection */}
            <div>
              <Label htmlFor="contact" className="text-sm font-medium text-gray-700 mb-2">
                Contact *
              </Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deal Value */}
            <div>
              <Label htmlFor="value" className="text-sm font-medium text-gray-700 mb-2">
                Estimated Value (£) *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value_estimate}
                  onChange={(e) => setFormData(prev => ({ ...prev, value_estimate: e.target.value }))}
                  placeholder="0.00"
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>

            {/* Treatment Tags - ENHANCED */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-gray-700">
                  Treatment Tags
                </Label>
                {loadingTags && (
                  <span className="text-xs text-gray-500">Loading tags...</span>
                )}
              </div>

              {/* AI Suggested Tags */}
              {suggestedTags.length > 0 && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">AI Suggestions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer bg-white hover:bg-purple-100 border-purple-300"
                        onClick={() => acceptSuggestedTag(tag.id)}
                      >
                        <span className="mr-1">{tag.icon}</span>
                        {tag.name}
                        <CheckCircle className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">Selected:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="default"
                        className="cursor-pointer"
                        style={{ backgroundColor: tag.color, borderColor: tag.color }}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span className="mr-1">{tag.icon}</span>
                        {tag.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tags */}
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {unselectedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer bg-white hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span className="mr-1">{tag.icon}</span>
                      {tag.name}
                    </Badge>
                  ))}
                  {availableTags.length === 0 && !loadingTags && (
                    <p className="text-sm text-gray-500">No treatment tags available. Create them in Settings.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline Suggestion - ENHANCED */}
            {pipelineSuggestion && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-green-800">
                        Suggested Pipeline: {pipelineSuggestion.pipeline_name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {pipelineSuggestion.confidence}% confident
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm font-medium mb-1">Why this pipeline?</p>
                          <p className="text-xs">{pipelineSuggestion.reason}</p>
                          {pipelineSuggestion.matched_tags.length > 0 && (
                            <p className="text-xs mt-2">
                              <strong>Matched tags:</strong> {pipelineSuggestion.matched_tags.join(', ')}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-green-700">{pipelineSuggestion.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Selection - ENHANCED */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="pipeline" className="text-sm font-medium text-gray-700">
                  Pipeline * {calculatingRoute && <span className="text-xs text-gray-500">(calculating...)</span>}
                </Label>
                {userOverridePipeline && pipelineSuggestion && (
                  <Badge variant="secondary" className="text-xs">Manual Override</Badge>
                )}
              </div>
              <Select
                value={formData.pipeline_id}
                onValueChange={handlePipelineChange}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      <div className="flex items-center gap-2">
                        {pipeline.name}
                        {pipelineSuggestion?.pipeline_id === pipeline.id && (
                          <Badge variant="secondary" className="text-xs ml-2">Suggested</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Selection */}
            {stages.length > 0 && (
              <div>
                <Label htmlFor="stage" className="text-sm font-medium text-gray-700 mb-2">
                  Stage
                </Label>
                <Select
                  value={formData.stage_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stage_id: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">First stage is selected by default</p>
              </div>
            )}

            {/* Deal Owner */}
            <div>
              <Label htmlFor="owner" className="text-sm font-medium text-gray-700 mb-2">
                Deal Owner *
              </Label>
              <Select
                value={formData.owner_user_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, owner_user_id: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select owner">
                    {formData.owner_user_id && teamMembers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                            {teamMembers.find(u => u.id === formData.owner_user_id)?.full_name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{teamMembers.find(u => u.id === formData.owner_user_id)?.full_name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Team Members</SelectLabel>
                    {teamMembers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                              {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Defaults to you, but can be assigned to anyone</p>
            </div>

            {/* Source */}
            <div>
              <Label htmlFor="source" className="text-sm font-medium text-gray-700 mb-2">
                How did you find out about us?
              </Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional information..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading || 
              !formData.title.trim() || 
              !formData.contact_id ||
              !formData.value_estimate ||
              !formData.owner_user_id ||
              calculatingRoute
            }
            className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Deal
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
