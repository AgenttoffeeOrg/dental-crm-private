'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
import { categorizeDeal, autoTagDeal } from '@/lib/deal-categorization'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  TrendingUp,
  DollarSign,
  User,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import type { Deal, Contact, Pipeline, PipelineStage } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

// Simple deal schema that only uses existing database fields
const simpleDealSchema = z.object({
  title: z.string().min(1, 'Deal title is required'),
  contact_id: z.string().min(1, 'Contact is required'),
  pipeline_id: z.string().min(1, 'Pipeline is required'),
  stage_id: z.string().min(1, 'Stage is required'),
  value_estimate_cents: z.number().min(0, 'Value must be positive').default(0),
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
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
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
    },
  })

  // Load data when dialog opens
  useEffect(() => {
    if (open && orgId && !tenantLoading) {
      loadInitialData()
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
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load form data')
    }
  }

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
    })

    setSelectedTreatmentTags(Array.isArray(deal.treatment_tags) ? deal.treatment_tags : [])
    
    // Load stages for the deal's pipeline
    if (deal.pipeline_id) {
      loadStagesForPipeline(deal.pipeline_id)
    }
  }

  const resetFormForNewDeal = () => {
    form.reset({
      title: '',
      currency: 'GBP',
      value_estimate_cents: 0,
      treatment_tags: [],
    })

    // Set preselected contact if provided
    if (preselectedContactId) {
      form.setValue('contact_id', preselectedContactId)
    }

    setSelectedTreatmentTags([])
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

      // Prepare deal data for database (only existing fields)
      const dealData = {
        title: data.title,
        contact_id: data.contact_id,
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        value_estimate_cents: data.value_estimate_cents,
        currency: data.currency,
        treatment_tags: selectedTreatmentTags,
        source: data.source || null,
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

  const addTreatmentTag = (tag: string) => {
    if (!selectedTreatmentTags.includes(tag)) {
      const newTags = [...selectedTreatmentTags, tag]
      setSelectedTreatmentTags(newTags)
      form.setValue('treatment_tags', newTags)
      
      // Auto-suggest pipeline based on new tags (only in create mode)
      if (mode === 'create') {
        suggestPipelineFromTreatment(newTags)
      }
    }
  }

  const removeTreatmentTag = (tag: string) => {
    const newTags = selectedTreatmentTags.filter(t => t !== tag)
    setSelectedTreatmentTags(newTags)
    form.setValue('treatment_tags', newTags)
    
    // Re-suggest pipeline after removing tag
    if (mode === 'create' && newTags.length > 0) {
      suggestPipelineFromTreatment(newTags)
    }
  }

  const suggestPipelineFromTreatment = async (tags: string[]) => {
    const title = form.watch('title') || ''
    const value = form.watch('value_estimate_cents') || 0
    
    // Get AI suggestion
    const category = categorizeDeal(title, '', tags, value)
    
    // Find matching pipeline
    const matchingPipeline = pipelines.find(p => 
      p.name.toLowerCase().includes(category.pipelineType) || 
      p.name === category.pipelineName
    )
    
    if (matchingPipeline && matchingPipeline.id !== form.watch('pipeline_id')) {
      // Auto-select the suggested pipeline
      form.setValue('pipeline_id', matchingPipeline.id)
      await loadStagesForPipeline(matchingPipeline.id)
      
      toast.success(`💡 Suggested: ${matchingPipeline.name} pipeline`, {
        description: category.reason
      })
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
                <Label htmlFor="source">Lead Source</Label>
                <Input
                  id="source"
                  {...form.register('source')}
                  placeholder="Website, Referral, etc."
                  className="h-11"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pipeline_id" className="flex items-center gap-1">
                  Pipeline <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={form.watch('pipeline_id')} 
                  onValueChange={(value) => {
                    form.setValue('pipeline_id', value)
                    form.setValue('stage_id', '')
                    loadStagesForPipeline(value)
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                        {pipeline.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
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
                <Label htmlFor="value_estimate">Estimated Value</Label>
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
                  />
                </div>
                <p className="text-xs text-gray-600">Enter the expected deal value</p>
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

          {/* Treatment Tags */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Treatment Tags (Optional)</Label>
            
            {selectedTreatmentTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                {selectedTreatmentTags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-red-100 transition-colors px-3 py-1.5"
                    onClick={() => !loading && removeTreatmentTag(tag)}
                  >
                    {tag}
                    <span className="ml-2 text-gray-500 hover:text-red-600">×</span>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder="Type a treatment and press Enter (e.g., implants, whitening)"
                className="h-11"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const target = e.target as HTMLInputElement
                    const value = target.value.trim()
                    if (value && !selectedTreatmentTags.includes(value)) {
                      addTreatmentTag(value)
                      target.value = ''
                    }
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-600">
              Press <kbd className="px-2 py-0.5 text-xs font-semibold bg-gray-100 border rounded">Enter</kbd> to add tags. Click tags to remove them.
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
    </Dialog>
  )
}
