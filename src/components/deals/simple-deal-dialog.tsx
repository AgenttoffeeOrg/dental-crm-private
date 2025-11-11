'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
import { categorizeDeal, autoTagDeal } from '@/lib/deal-categorization'
import { quickRouteDeal, extractTreatmentTags } from '@/lib/treatment-routing'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  TrendingUp,
  DollarSign,
  User,
  Save,
  Tag,
  Sparkles,
  Info,
  Zap,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import type { Deal, Contact, Pipeline, PipelineStage, AppUser } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

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

// Simple deal schema that only uses existing database fields
const simpleDealSchema = z.object({
  title: z.string().min(1, 'Deal title is required'),
  contact_id: z.string().min(1, 'Contact is required'),
  pipeline_id: z.string().min(1, 'Pipeline is required'),
  stage_id: z.string().min(1, 'Stage is required'),
  value_estimate_cents: z.number().min(1, 'Value must be greater than 0'),
  owner_user_id: z.string().min(1, 'Deal owner is required'),
  currency: z.string().default('GBP'),
  treatment_tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  // New fields for smart contact matching
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  customer_name: z.string().optional(),
})

type SimpleDealData = z.infer<typeof simpleDealSchema>

interface SimpleDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal | null
  onDealUpdated: () => void
  mode?: 'create' | 'edit'
  preselectedContactId?: string
}

export function SimpleDealDialog({ 
  open, 
  onOpenChange, 
  deal,
  onDealUpdated,
  mode = 'edit',
  preselectedContactId
}: SimpleDealDialogProps) {
  console.log('SimpleDealDialog props:', { open, mode, deal: deal?.id, preselectedContactId })
  
  const { orgId, isLoading: tenantLoading } = useTenantContext()
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
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)
  const [pendingPipelineId, setPendingPipelineId] = useState<string | null>(null)
  const [selectedTreatmentTags, setSelectedTreatmentTags] = useState<string[]>([])
  const [matchedContacts, setMatchedContacts] = useState<Contact[]>([])
  const [showContactCreation, setShowContactCreation] = useState(false)
  const supabase = createClient()

  // Add effect to log when dialog opens/closes
  useEffect(() => {
    console.log('SimpleDealDialog open state changed:', open)
    if (open) {
      console.log('Dialog is opening, mode:', mode, 'deal:', deal)
    }
  }, [open, mode, deal])

  const form = useForm<SimpleDealData>({
    resolver: zodResolver(simpleDealSchema),
    defaultValues: {
      title: '',
      currency: 'GBP',
      value_estimate_cents: 0,
      treatment_tags: [],
      owner_user_id: '',
    },
  })

  // Load data when dialog opens
  useEffect(() => {
    if (open && orgId && !tenantLoading) {
      loadInitialData()
      loadTreatmentTags()
      if (mode === 'edit' && deal) {
        loadDealData()
      } else if (mode === 'create') {
        resetFormForNewDeal()
      }
    }
  }, [open, deal, mode, orgId, tenantLoading])

  const loadInitialData = async () => {
    if (!orgId) return
    
    try {
      // Load contacts - WITH TENANT FILTER! 🔒
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, full_name, primary_email, primary_phone')
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .order('full_name')

      if (contactsError) {
        console.error('Error loading contacts:', contactsError)
      } else {
        setContacts(contactsData || [])
      }

      // Load pipelines - WITH TENANT FILTER! 🔒
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .order('name')

      if (pipelinesError) {
        console.error('Error loading pipelines:', pipelinesError)
      } else {
        setPipelines(pipelinesData || [])

        // Load stages for default pipeline
        if (pipelinesData && pipelinesData.length > 0) {
          const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0]
          loadStagesForPipeline(defaultPipeline.id)
          
          if (mode === 'create') {
            form.setValue('pipeline_id', defaultPipeline.id)
          }
        }
      }

      // Load team members for owner selection - WITH TENANT FILTER! 🔒
      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('id, full_name, email, role')
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .order('full_name')

      if (usersError) {
        console.error('Error loading team members:', usersError)
      } else {
        setTeamMembers(usersData || [])
        
        // Set current user as default owner in create mode
        if (mode === 'create' && usersData && usersData.length > 0) {
          // Get current user from auth context
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            form.setValue('owner_user_id', user.id)
          } else if (usersData.length > 0) {
            // Fallback to first user if can't get current user
            form.setValue('owner_user_id', usersData[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load form data')
    }
  }

  const loadTreatmentTags = async () => {
    if (!orgId) return
    
    try {
      setLoadingTags(true)

      const { data, error } = await supabase
        .from('treatment_tags')
        .select('id, name, color, icon, keywords')
        .eq('tenant_id', orgId)
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

  // AI Tag Suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      const title = form.watch('title')
      if (title && mode === 'create') {
        suggestTags()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [form.watch('title')])

  const suggestTags = async () => {
    const title = form.watch('title')
    if (!title || !orgId) return

    try {
      const extracted = await extractTreatmentTags(orgId, title, '')
      const matchedIds = availableTags
        .filter(tag => extracted.tags.includes(tag.name.toLowerCase()))
        .map(tag => tag.id)

      setSuggestedTagIds(matchedIds)
    } catch (error) {
      console.error('Error suggesting tags:', error)
    }
  }

  // Pipeline Suggestion
  useEffect(() => {
    if ((selectedTagIds.length > 0 || form.watch('value_estimate_cents') > 0) && mode === 'create') {
      calculatePipelineSuggestion()
    } else {
      setPipelineSuggestion(null)
    }
  }, [selectedTagIds, form.watch('value_estimate_cents')])

  const calculatePipelineSuggestion = async () => {
    if (!orgId) return

    try {
      setCalculatingRoute(true)

      const selectedTagNames = availableTags
        .filter(tag => selectedTagIds.includes(tag.id))
        .map(tag => tag.name)

      const routingResult = await quickRouteDeal({
        tenantId: orgId,
        treatmentTags: selectedTagNames,
        dealTitle: form.watch('title'),
        dealDescription: '',
        dealValue: form.watch('value_estimate_cents'),
        userId: form.watch('owner_user_id')
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

          if (!userOverridePipeline) {
            form.setValue('pipeline_id', routingResult.pipeline_id)
            if (routingResult.stage_id) {
              form.setValue('stage_id', routingResult.stage_id)
            }
            if (routingResult.pipeline_id) {
              loadStagesForPipeline(routingResult.pipeline_id)
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

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const acceptSuggestedTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      setSelectedTagIds(prev => [...prev, tagId])
    }
    setSuggestedTagIds(prev => prev.filter(id => id !== tagId))
  }

  const applyPipelineSelection = (value: string, override = false) => {
    form.setValue('pipeline_id', value)
    form.setValue('stage_id', '')
    loadStagesForPipeline(value)
    setUserOverridePipeline(override)
    setPendingPipelineId(null)
  }

  const handlePipelineChangeWithValidation = (value: string) => {
    // If there's a suggestion and user is choosing different pipeline, show confirmation
    if (pipelineSuggestion && pipelineSuggestion.pipeline_id !== value && selectedTagIds.length > 0) {
      setPendingPipelineId(value)
      setShowOverrideConfirm(true)
      return
    }
    
    const shouldOverride =
      pipelineSuggestion != null ? pipelineSuggestion.pipeline_id !== value : false
    applyPipelineSelection(value, shouldOverride)
  }

  const confirmOverride = () => {
    if (pendingPipelineId) {
      applyPipelineSelection(pendingPipelineId, true)
    }
    setShowOverrideConfirm(false)
  }

  const cancelOverride = () => {
    setPendingPipelineId(null)
    setShowOverrideConfirm(false)
  }

  // Computed values
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

  const loadStagesForPipeline = async (pipelineId: string) => {
    if (!pipelineId) {
      console.warn('No pipeline ID provided to loadStagesForPipeline')
      setStages([])
      return
    }

    try {
      console.log('Loading stages for pipeline:', pipelineId)
      
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .order('position')

      if (stagesError) {
        console.error('Error loading stages:', stagesError)
        toast.error('Failed to load pipeline stages')
        setStages([])
        return
      }
      
      console.log(`Loaded ${stagesData?.length || 0} stages for pipeline ${pipelineId}`)
      setStages(stagesData || [])

      // Set first stage as default for new deals
      if (mode === 'create' && stagesData && stagesData.length > 0) {
        form.setValue('stage_id', stagesData[0].id)
        console.log('Auto-selected first stage:', stagesData[0].name)
      } else if (!stagesData || stagesData.length === 0) {
        toast.warning('No stages found for this pipeline. Please add stages in Pipeline Settings.')
      }
    } catch (error) {
      console.error('Exception while loading stages:', error)
      toast.error('Failed to load pipeline stages')
      setStages([])
    }
  }

  const loadDealData = () => {
    if (!deal) return
    
    console.log('Loading deal data:', deal)
    
    // Load basic deal data with safe defaults
    form.reset({
      title: deal.title || '',
      contact_id: deal.contact_id || '',
      pipeline_id: deal.pipeline_id || '',
      stage_id: deal.stage_id || '',
      value_estimate_cents: deal.value_estimate_cents || 0,
      currency: deal.currency || 'GBP',
      treatment_tags: Array.isArray(deal.treatment_tags) ? deal.treatment_tags : [],
      source: deal.source || '',
      owner_user_id: deal.owner_user_id || '',
    })

    setSelectedTreatmentTags(Array.isArray(deal.treatment_tags) ? deal.treatment_tags : [])
    
    // Convert tag names to IDs for new system
    if (Array.isArray(deal.treatment_tags) && deal.treatment_tags.length > 0) {
      const matchedIds = availableTags
        .filter(tag => deal.treatment_tags.includes(tag.name))
        .map(tag => tag.id)
      setSelectedTagIds(matchedIds)
    }
    
    // Load stages for the deal's pipeline
    if (deal.pipeline_id) {
      loadStagesForPipeline(deal.pipeline_id)
    }
  }

  const resetFormForNewDeal = async () => {
    form.reset({
      title: '',
      currency: 'GBP',
      value_estimate_cents: 0,
      treatment_tags: [],
      owner_user_id: '',
    })

    // Set preselected contact if provided
    if (preselectedContactId) {
      form.setValue('contact_id', preselectedContactId)
    }

    // Set current user as default owner
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        form.setValue('owner_user_id', user.id)
      }
    } catch (error) {
      console.error('Error getting current user:', error)
    }

    setSelectedTreatmentTags([])
    setSelectedTagIds([])
    setSuggestedTagIds([])
    setPipelineSuggestion(null)
    setUserOverridePipeline(false)
  }

  const onSubmit = async (data: SimpleDealData) => {
    console.log('Submitting simple deal data:', data)
    
    // Prevent double submission
    if (loading) {
      return
    }
    
    setLoading(true)
    
    try {
      // Validate required fields
      if (!data.contact_id) {
        toast.error('Please select a contact')
        setLoading(false)
        return
      }
      
      if (!data.pipeline_id) {
        toast.error('Please select a pipeline')
        setLoading(false)
        return
      }
      
      if (!data.stage_id) {
        toast.error('Please select a pipeline stage')
        setLoading(false)
        return
      }

      // Verify the stage exists and belongs to the selected pipeline
      const selectedStage = stages.find(s => s.id === data.stage_id)
      if (!selectedStage) {
        toast.error('Selected stage is invalid. Please choose a valid stage.')
        setLoading(false)
        return
      }

      // Check for duplicate deals (same title and contact)
      if (mode === 'create') {
        const { data: existingDeals, error: checkError } = await supabase
          .from('deals')
          .select('id, title')
          .eq('contact_id', data.contact_id)
          .eq('title', data.title)
          .limit(1)

        if (checkError) {
          console.error('Error checking for duplicates:', checkError)
        } else if (existingDeals && existingDeals.length > 0) {
          toast.error('A deal with this title already exists for this contact')
          setLoading(false)
          return
        }
      }

      // Convert selected tag IDs to tag names for database
      const selectedTagNames = availableTags
        .filter(tag => selectedTagIds.includes(tag.id))
        .map(tag => tag.name)

      // Prepare deal data for database (only existing fields)
      const dealData = {
        title: data.title,
        contact_id: data.contact_id,
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        value_estimate_cents: data.value_estimate_cents,
        currency: data.currency,
        treatment_tags: selectedTagNames, // ✅ Use new tag system
        source: data.source || null,
        owner_user_id: data.owner_user_id,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (mode === 'create') {
        // Create new deal
        if (!orgId) {
          toast.error('Authentication required')
          return
        }
        
        const newDealData = {
          ...dealData,
          tenant_id: orgId, // ✅ SECURITY: Use authenticated user's org
          created_at: new Date().toISOString(),
        }

        console.log('Creating new deal with simple data:', newDealData)

        const { error } = await supabase
          .from('deals')
          .insert(newDealData)

        if (error) {
          console.error('Supabase error creating deal:', error)
          if (error.message.includes('foreign key constraint')) {
            toast.error('Invalid pipeline or stage selected. Please refresh and try again.')
          } else {
            toast.error(`Failed to create deal: ${error.message}`)
          }
          return
        }

        toast.success('Deal created successfully')
      } else {
        // Update existing deal
        if (!deal?.id) {
          toast.error('Deal ID is missing')
          return
        }

        console.log('Updating deal with simple data:', dealData)

        const { error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', deal.id)

        if (error) {
          console.error('Supabase error updating deal:', error)
          if (error.message.includes('foreign key constraint')) {
            toast.error('Invalid pipeline or stage selected. Please refresh and try again.')
          } else {
            toast.error(`Failed to update deal: ${error.message}`)
          }
          return
        }

        toast.success('Deal updated successfully')
      }

      onDealUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving deal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const action = mode === 'create' ? 'create' : 'update'
      toast.error(`Failed to ${action} deal: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if in edit mode but no deal provided
  if (mode === 'edit' && !deal) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!loading) {
        onOpenChange(isOpen)
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div>{mode === 'create' ? 'Create New Deal' : 'Edit Deal'}</div>
              <p className="text-sm font-normal text-gray-500 mt-1">
                {mode === 'create' ? 'Add a new deal to your pipeline' : 'Update deal information'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
          {/* Deal Title - Prominent */}
          <div className="space-y-3">
            <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
              Deal Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="e.g., John Smith - Dental Implants"
              className="text-lg h-12"
              disabled={loading}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                ⚠️ {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Contact & Pipeline Section */}
          <div className="space-y-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact & Pipeline
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_id" className="flex items-center gap-1">
                  Contact <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={form.watch('contact_id')} 
                  onValueChange={(value) => form.setValue('contact_id', value)}
                  disabled={loading || !!preselectedContactId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No contacts found
                      </div>
                    ) : (
                      contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{contact.full_name}</span>
                            <span className="text-xs text-gray-500">
                              {contact.primary_email || contact.primary_phone || 'No contact info'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.contact_id && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.contact_id.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">How did you find out about us?</Label>
                <Input
                  id="source"
                  {...form.register('source')}
                  placeholder="Website, Referral, etc."
                  className="h-11"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_user_id" className="flex items-center gap-1">
                  Deal Owner <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={form.watch('owner_user_id')} 
                  onValueChange={(value) => form.setValue('owner_user_id', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select owner">
                      {form.watch('owner_user_id') && teamMembers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                              {teamMembers.find(u => u.id === form.watch('owner_user_id'))?.full_name
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{teamMembers.find(u => u.id === form.watch('owner_user_id'))?.full_name}</span>
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
                <p className="text-xs text-gray-600">Defaults to you, but can be assigned to anyone</p>
                {form.formState.errors.owner_user_id && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.owner_user_id.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pipeline_id" className="flex items-center gap-1">
                  Pipeline <span className="text-red-500">*</span>
                  {pipelineSuggestion && !userOverridePipeline && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="ml-2 text-xs flex items-center gap-1">
                            {calculatingRoute ? (
                              <><Zap className="h-3 w-3 animate-pulse" /> Calculating...</>
                            ) : (
                              <><Sparkles className="h-3 w-3" /> Suggested</>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">Why "{pipelineSuggestion.pipeline_name}"?</p>
                            <p className="text-xs text-gray-600">{pipelineSuggestion.reason}</p>
                            {pipelineSuggestion.matched_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pipelineSuggestion.matched_tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {Math.round(pipelineSuggestion.confidence * 100)}% confidence
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Label>
                <Select 
                  value={form.watch('pipeline_id')} 
                  onValueChange={handlePipelineChangeWithValidation}
                  disabled={loading}
                >
                  <SelectTrigger
                    className={`h-11 ${
                      pipelineSuggestion &&
                      pipelineSuggestion.pipeline_id === form.watch('pipeline_id') &&
                      !userOverridePipeline
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }`}
                  >
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        <div className="flex items-center gap-2">
                          {pipelineSuggestion &&
                            pipelineSuggestion.pipeline_id === pipeline.id &&
                            !userOverridePipeline && (
                            <Sparkles className="h-3 w-3 text-blue-600" />
                          )}
                          <span>{pipeline.name}</span>
                          {pipeline.is_default && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                          {userOverridePipeline &&
                            form.watch('pipeline_id') === pipeline.id && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Manual Override
                              </Badge>
                            )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stage_id" className="flex items-center gap-1">
                  Initial Stage <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={form.watch('stage_id')} 
                  onValueChange={(value) => form.setValue('stage_id', value)}
                  disabled={loading || stages.length === 0}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={stages.length === 0 ? "Select pipeline first" : "Select stage"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage, index) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{index + 1}.</span>
                          <span>{stage.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4 p-6 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-700" />
              <span className="text-green-900">Deal Value</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="value_estimate" className="flex items-center gap-1">
                  Estimated Value <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                    £
                  </span>
                  <Input
                    id="value_estimate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.watch('value_estimate_cents') / 100 || ''}
                    onChange={(e) => {
                      const pounds = parseFloat(e.target.value) || 0
                      form.setValue('value_estimate_cents', Math.round(pounds * 100))
                    }}
                    placeholder="0.00"
                    className="h-11 pl-8 text-lg font-semibold"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-600">Enter the expected deal value (required)</p>
                {form.formState.errors.value_estimate_cents && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.value_estimate_cents.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={form.watch('currency')} 
                  onValueChange={(value) => form.setValue('currency', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">🇬🇧 GBP (£)</SelectItem>
                    <SelectItem value="USD">🇺🇸 USD ($)</SelectItem>
                    <SelectItem value="EUR">🇪🇺 EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Treatment Tags - Enhanced with AI */}
          <div className="space-y-4 p-6 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-700" />
                <span className="text-purple-900">Treatment Tags</span>
                {loadingTags && (
                  <div className="h-3 w-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                )}
              </Label>
              {suggestedTags.length > 0 && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {suggestedTags.length} AI Suggestion{suggestedTags.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* AI Suggested Tags */}
            {suggestedTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Detected These Treatments:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      className="cursor-pointer hover:bg-purple-600 hover:text-white transition-all bg-purple-100 text-purple-700 border-purple-300 px-3 py-1.5"
                      onClick={() => acceptSuggestedTag(tag.id)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {tag.name}
                      <span className="ml-2">+</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 font-medium">Selected Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color }}
                      className="cursor-pointer hover:opacity-80 transition-all text-white px-3 py-1.5"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span className="mr-1">{tag.icon}</span>
                      {tag.name}
                      <X className="h-3 w-3 ml-2" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Tags */}
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">
                {unselectedTags.length > 0 ? 'Available Tags:' : 'No more tags available'}
              </p>
              {unselectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {unselectedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}
                      className="cursor-pointer hover:bg-opacity-10 transition-all px-3 py-1.5"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span className="mr-1">{tag.icon}</span>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-2">
              {selectedTags.length === 0 
                ? '💡 Add tags to get automatic pipeline suggestions'
                : `✅ ${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3 pt-6 border-t">
            <p className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
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
                disabled={loading}
                className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {mode === 'create' ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'create' ? 'Create Deal' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Override Confirmation Dialog */}
      <AlertDialog open={showOverrideConfirm} onOpenChange={(openState) => {
        if (!openState) {
          cancelOverride()
        } else {
          setShowOverrideConfirm(true)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Override Pipeline Suggestion?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Based on the selected treatment tags, we suggest routing this deal to:
              </p>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {pipelineSuggestion?.pipeline_name}
                </p>
                <p className="text-sm text-blue-700 mt-1">{pipelineSuggestion?.reason}</p>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to choose a different pipeline? This may affect deal routing accuracy.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelOverride}>Keep Suggestion</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverride} className="bg-blue-600 hover:bg-blue-700">
              Yes, Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
