'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Building2,
  FileText,
  Clock,
  Target,
  CreditCard,
  Save,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import type { Deal, Contact, Pipeline, PipelineStage } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

// Simple separator component fallback
const Separator = () => <hr className="border-gray-200 my-6" />

// Comprehensive deal schema
const dealProfileSchema = z.object({
  // Basic Deal Information
  title: z.string().min(1, 'Deal title is required'),
  description: z.string().optional(),
  deal_type: z.enum(['new_lead', 'existing_patient', 'pms_import', 'referral']),
  source: z.string().optional(),
  
  // Contact Information
  contact_id: z.string().min(1, 'Contact is required'),
  
  // Pipeline Information
  pipeline_id: z.string().min(1, 'Pipeline is required'),
  stage_id: z.string().min(1, 'Stage is required'),
  
  // Financial Information
  value_estimate_cents: z.number().min(0, 'Value must be positive').default(0),
  currency: z.string().default('GBP'),
  deposit_amount_cents: z.number().min(0).default(0),
  payment_plan: z.enum(['full_payment', 'installments', 'insurance', 'finance', '']).optional(),
  
  // Treatment Information
  treatment_tags: z.array(z.string()).default([]),
  treatment_category: z.enum(['preventive', 'restorative', 'cosmetic', 'orthodontic', 'surgical', 'emergency', '']).optional(),
  treatment_urgency: z.enum(['low', 'medium', 'high', 'emergency', '']).optional(),
  estimated_duration_weeks: z.number().min(0).optional(),
  
  // PMS Integration
  pms_treatment_plan_id: z.string().optional(),
  pms_patient_id: z.string().optional(),
  pms_sync_status: z.enum(['not_synced', 'synced', 'sync_pending', 'sync_failed', '']).optional(),
  
  // Appointment Information
  consultation_scheduled: z.boolean().default(false),
  consultation_date: z.date().optional(),
  treatment_start_date: z.date().optional(),
  treatment_end_date: z.date().optional(),
  
  // Insurance Information
  insurance_coverage: z.boolean().default(false),
  insurance_provider: z.string().optional(),
  insurance_authorization_number: z.string().optional(),
  insurance_coverage_percentage: z.number().min(0).max(100).optional(),
  
  // Follow-up and Notes
  follow_up_required: z.boolean().default(true),
  next_follow_up_date: z.date().optional(),
  internal_notes: z.string().optional(),
  patient_concerns: z.string().optional(),
  
  // Conversion Tracking
  lead_score: z.number().min(0).max(100).optional(),
  conversion_probability: z.number().min(0).max(100).optional(),
  
  // Custom Fields
  custom_fields: z.record(z.string(), z.any()).optional(),
})

type DealProfileData = z.infer<typeof dealProfileSchema>

interface DealProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal | null
  onDealUpdated: () => void
  mode?: 'create' | 'edit'
  preselectedContactId?: string
}

export function DealProfileDialog({ 
  open, 
  onOpenChange, 
  deal,
  onDealUpdated,
  mode = 'edit',
  preselectedContactId
}: DealProfileDialogProps) {
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedTreatmentTags, setSelectedTreatmentTags] = useState<string[]>([])
  const supabase = createClient()

  const form = useForm<DealProfileData>({
    resolver: zodResolver(dealProfileSchema),
    defaultValues: {
      title: '',
      deal_type: 'new_lead',
      currency: 'GBP',
      value_estimate_cents: 0,
      deposit_amount_cents: 0,
      treatment_tags: [],
      consultation_scheduled: false,
      insurance_coverage: false,
      follow_up_required: true,
      custom_fields: {},
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

      if (contactsError) throw contactsError
      setContacts(contactsData || [])

      // Load pipelines - WITH TENANT FILTER! 🔒
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .order('name')

      if (pipelinesError) throw pipelinesError
      setPipelines(pipelinesData || [])

      // Load stages for default pipeline
      if (pipelinesData && pipelinesData.length > 0) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0]
        loadStagesForPipeline(defaultPipeline.id)
        
        if (mode === 'create') {
          form.setValue('pipeline_id', defaultPipeline.id)
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load form data')
    }
  }

  const loadStagesForPipeline = async (pipelineId: string) => {
    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position')

      if (stagesError) {
        console.error('Error loading stages:', stagesError)
        toast.error('Failed to load pipeline stages')
        return
      }
      
      setStages(stagesData || [])

      // Set first stage as default for new deals
      if (mode === 'create' && stagesData && stagesData.length > 0) {
        form.setValue('stage_id', stagesData[0].id)
      }
    } catch (error) {
      console.error('Error loading stages:', error)
      toast.error('Failed to load pipeline stages')
    }
  }

  const loadDealData = () => {
    if (!deal) return
    
    console.log('Loading deal data:', deal)
    
    // Load basic deal data
    form.reset({
      title: deal.title || '',
      description: deal.description || '',
      deal_type: (deal.deal_type as any) || 'new_lead',
      source: deal.source || '',
      contact_id: deal.contact_id || '',
      pipeline_id: deal.pipeline_id || '',
      stage_id: deal.stage_id || '',
      value_estimate_cents: deal.value_estimate_cents || 0,
      currency: deal.currency || 'GBP',
      treatment_tags: deal.treatment_tags || [],
      custom_fields: deal.custom_fields || {},
    })

    setSelectedTreatmentTags(deal.treatment_tags || [])
  }

  const resetFormForNewDeal = () => {
    form.reset({
      title: '',
      deal_type: 'new_lead',
      currency: 'GBP',
      value_estimate_cents: 0,
      deposit_amount_cents: 0,
      treatment_tags: [],
      consultation_scheduled: false,
      insurance_coverage: false,
      follow_up_required: true,
      custom_fields: {},
    })

    // Set preselected contact if provided
    if (preselectedContactId) {
      form.setValue('contact_id', preselectedContactId)
    }

    setSelectedTreatmentTags([])
  }

  const onSubmit = async (data: DealProfileData) => {
    console.log('Submitting comprehensive deal data:', data)
    setLoading(true)
    
    try {
      // Validate required fields
      if (!data.contact_id) {
        toast.error('Please select a contact')
        return
      }
      
      if (!data.pipeline_id) {
        toast.error('Please select a pipeline')
        return
      }
      
      if (!data.stage_id) {
        toast.error('Please select a pipeline stage')
        return
      }

      // Verify the stage exists and belongs to the selected pipeline
      const selectedStage = stages.find(s => s.id === data.stage_id)
      if (!selectedStage) {
        toast.error('Selected stage is invalid. Please choose a valid stage.')
        return
      }

      // Prepare deal data for database
      const dealData = {
        title: data.title,
        description: data.description || null,
        deal_type: data.deal_type,
        source: data.source || null,
        contact_id: data.contact_id,
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        value_estimate_cents: data.value_estimate_cents,
        currency: data.currency,
        deposit_amount_cents: data.deposit_amount_cents || 0,
        payment_plan: data.payment_plan || null,
        treatment_tags: selectedTreatmentTags,
        treatment_category: data.treatment_category || null,
        treatment_urgency: data.treatment_urgency || null,
        estimated_duration_weeks: data.estimated_duration_weeks || null,
        pms_treatment_plan_id: data.pms_treatment_plan_id || null,
        pms_patient_id: data.pms_patient_id || null,
        pms_sync_status: data.pms_sync_status || 'not_synced',
        consultation_scheduled: data.consultation_scheduled,
        consultation_date: data.consultation_date?.toISOString() || null,
        treatment_start_date: data.treatment_start_date?.toISOString() || null,
        treatment_end_date: data.treatment_end_date?.toISOString() || null,
        insurance_coverage: data.insurance_coverage,
        insurance_provider: data.insurance_provider || null,
        insurance_authorization_number: data.insurance_authorization_number || null,
        insurance_coverage_percentage: data.insurance_coverage_percentage || null,
        follow_up_required: data.follow_up_required,
        next_follow_up_date: data.next_follow_up_date?.toISOString() || null,
        internal_notes: data.internal_notes || null,
        patient_concerns: data.patient_concerns || null,
        lead_score: data.lead_score || null,
        conversion_probability: data.conversion_probability || null,
        custom_fields: data.custom_fields || {},
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (mode === 'create') {
        if (!orgId) {
          toast.error('Authentication required')
          return
        }
        
        // Create new deal - WITH ORG ID! 🔒
        const newDealData = {
          ...dealData,
          tenant_id: orgId, // ✅ SECURITY: Use authenticated user's org
          created_at: new Date().toISOString(),
        }

        console.log('Creating new deal with comprehensive data:', newDealData)

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
        
        if (!orgId) {
          toast.error('Authentication required')
          return
        }

        console.log('Updating deal with comprehensive data:', dealData)

        const { error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', deal.id)
          .eq('tenant_id', orgId) // ✅ SECURITY: Verify org ownership

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
    }
  }

  const removeTreatmentTag = (tag: string) => {
    const newTags = selectedTreatmentTags.filter(t => t !== tag)
    setSelectedTreatmentTags(newTags)
    form.setValue('treatment_tags', newTags)
  }

  // Don't render if in edit mode but no deal provided
  if (mode === 'edit' && !deal) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {mode === 'create' ? 'Create New Deal' : 'Edit Deal Profile'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Deal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Deal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="e.g., John Smith - Dental Implants"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="deal_type">Deal Type</Label>
                <Select onValueChange={(value) => form.setValue('deal_type', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_lead">New Lead</SelectItem>
                    <SelectItem value="existing_patient">Existing Patient</SelectItem>
                    <SelectItem value="pms_import">PMS Import</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Brief description of the deal..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact & Pipeline Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Contact & Pipeline</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_id">Contact *</Label>
                <Select onValueChange={(value) => form.setValue('contact_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.full_name} - {contact.primary_email || contact.primary_phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.contact_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.contact_id.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="pipeline_id">Pipeline *</Label>
                <Select onValueChange={(value) => {
                  form.setValue('pipeline_id', value)
                  loadStagesForPipeline(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="stage_id">Pipeline Stage *</Label>
                <Select onValueChange={(value) => form.setValue('stage_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  {...form.register('source')}
                  placeholder="e.g., Website, Referral, Walk-in"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Financial Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value_estimate">Estimated Value (£)</Label>
                <Input
                  id="value_estimate"
                  type="number"
                  min="0"
                  step="0.01"
                  onChange={(e) => {
                    const pounds = parseFloat(e.target.value) || 0
                    form.setValue('value_estimate_cents', Math.round(pounds * 100))
                  }}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="deposit_amount">Deposit Amount (£)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  onChange={(e) => {
                    const pounds = parseFloat(e.target.value) || 0
                    form.setValue('deposit_amount_cents', Math.round(pounds * 100))
                  }}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="payment_plan">Payment Plan</Label>
                <Select onValueChange={(value) => form.setValue('payment_plan', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_payment">Full Payment</SelectItem>
                    <SelectItem value="installments">Installments</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Treatment Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Treatment Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="treatment_category">Treatment Category</Label>
                <Select onValueChange={(value) => form.setValue('treatment_category', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="restorative">Restorative</SelectItem>
                    <SelectItem value="cosmetic">Cosmetic</SelectItem>
                    <SelectItem value="orthodontic">Orthodontic</SelectItem>
                    <SelectItem value="surgical">Surgical</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="treatment_urgency">Treatment Urgency</Label>
                <Select onValueChange={(value) => form.setValue('treatment_urgency', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="estimated_duration_weeks">Estimated Duration (weeks)</Label>
                <Input
                  id="estimated_duration_weeks"
                  type="number"
                  min="0"
                  {...form.register('estimated_duration_weeks', { valueAsNumber: true })}
                  placeholder="4"
                />
              </div>
            </div>
            
            <div>
              <Label>Treatment Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTreatmentTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTreatmentTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add treatment tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const target = e.target as HTMLInputElement
                      if (target.value.trim()) {
                        addTreatmentTag(target.value.trim())
                        target.value = ''
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* PMS Integration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <h3 className="text-lg font-semibold">PMS Integration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pms_treatment_plan_id">PMS Treatment Plan ID</Label>
                <Input
                  id="pms_treatment_plan_id"
                  {...form.register('pms_treatment_plan_id')}
                  placeholder="TP-12345"
                />
              </div>
              
              <div>
                <Label htmlFor="pms_patient_id">PMS Patient ID</Label>
                <Input
                  id="pms_patient_id"
                  {...form.register('pms_patient_id')}
                  placeholder="PAT-67890"
                />
              </div>
              
              <div>
                <Label htmlFor="pms_sync_status">Sync Status</Label>
                <Select onValueChange={(value) => form.setValue('pms_sync_status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sync status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_synced">Not Synced</SelectItem>
                    <SelectItem value="synced">Synced</SelectItem>
                    <SelectItem value="sync_pending">Sync Pending</SelectItem>
                    <SelectItem value="sync_failed">Sync Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Insurance Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Insurance Information</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="insurance_coverage"
                  checked={form.watch('insurance_coverage')}
                  onCheckedChange={(checked) => form.setValue('insurance_coverage', checked)}
                />
                <Label htmlFor="insurance_coverage">Insurance Coverage Available</Label>
              </div>
              
              {form.watch('insurance_coverage') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="insurance_provider">Insurance Provider</Label>
                    <Input
                      id="insurance_provider"
                      {...form.register('insurance_provider')}
                      placeholder="Bupa, AXA, etc."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="insurance_authorization_number">Authorization Number</Label>
                    <Input
                      id="insurance_authorization_number"
                      {...form.register('insurance_authorization_number')}
                      placeholder="AUTH-12345"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="insurance_coverage_percentage">Coverage Percentage</Label>
                    <Input
                      id="insurance_coverage_percentage"
                      type="number"
                      min="0"
                      max="100"
                      {...form.register('insurance_coverage_percentage', { valueAsNumber: true })}
                      placeholder="80"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notes and Follow-up */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Notes & Follow-up</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="patient_concerns">Patient Concerns</Label>
                <Textarea
                  id="patient_concerns"
                  {...form.register('patient_concerns')}
                  placeholder="What are the patient's main concerns or goals?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="internal_notes">Internal Notes</Label>
                <Textarea
                  id="internal_notes"
                  {...form.register('internal_notes')}
                  placeholder="Internal notes for team members..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lead_score">Lead Score (0-100)</Label>
                  <Input
                    id="lead_score"
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('lead_score', { valueAsNumber: true })}
                    placeholder="75"
                  />
                </div>
                
                <div>
                  <Label htmlFor="conversion_probability">Conversion Probability (%)</Label>
                  <Input
                    id="conversion_probability"
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('conversion_probability', { valueAsNumber: true })}
                    placeholder="85"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="follow_up_required"
                  checked={form.watch('follow_up_required')}
                  onCheckedChange={(checked) => form.setValue('follow_up_required', checked)}
                />
                <Label htmlFor="follow_up_required">Follow-up Required</Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading 
                ? (mode === 'create' ? 'Creating Deal...' : 'Saving Deal...') 
                : (mode === 'create' ? 'Create Deal' : 'Save Changes')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
