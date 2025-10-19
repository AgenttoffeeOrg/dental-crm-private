'use client'

/**
 * Create Deal Slide-Over Panel
 * Enterprise-style right-side slide-over for creating deals
 * Matches the style of ProfileSetupPanel and CreateContactSlideOver
 */

import { useState, useEffect } from 'react'
import { X, TrendingUp, DollarSign, User, Tag, Save } from 'lucide-react'
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
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import type { Contact, Pipeline, PipelineStage } from '@/types/database'

interface CreateDealSlideOverProps {
  open: boolean
  onClose: () => void
  onDealCreated: () => void
  preselectedContactId?: string
}

const TREATMENT_OPTIONS = [
  'Dental Implants',
  'Orthodontics',
  'Cosmetic Dentistry',
  'Teeth Whitening',
  'Root Canal',
  'Crowns & Bridges',
  'Dentures',
  'General Checkup',
  'Emergency Care',
  'Other'
]

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
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    contact_id: preselectedContactId || '',
    pipeline_id: '',
    stage_id: '',
    value_estimate: '',
    source: '',
    notes: '',
  })

  // Load initial data
  useEffect(() => {
    if (open && appUser?.tenant_id) {
      loadData()
    }
  }, [open, appUser])

  // Update contact when preselectedContactId changes
  useEffect(() => {
    if (preselectedContactId) {
      setFormData(prev => ({ ...prev, contact_id: preselectedContactId }))
    }
  }, [preselectedContactId])

  const loadData = async () => {
    const supabase = createClient()
    
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

      // Auto-select default pipeline
      if (pipelinesData && pipelinesData.length > 0) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0]
        setFormData(prev => ({ ...prev, pipeline_id: defaultPipeline.id }))
        loadStages(defaultPipeline.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadStages = async (pipelineId: string) => {
    const supabase = createClient()
    
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

  const handlePipelineChange = (pipelineId: string) => {
    setFormData(prev => ({ ...prev, pipeline_id: pipelineId, stage_id: '' }))
    loadStages(pipelineId)
  }

  const toggleTreatment = (treatment: string) => {
    setSelectedTreatments(prev => 
      prev.includes(treatment)
        ? prev.filter(t => t !== treatment)
        : [...prev, treatment]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

    if (!appUser?.tenant_id) {
      toast.error('User session error. Please refresh the page.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Convert value to cents
      const valueInCents = formData.value_estimate 
        ? Math.round(parseFloat(formData.value_estimate) * 100)
        : 0

      const dealData = {
        title: formData.title.trim(),
        contact_id: formData.contact_id,
        pipeline_id: formData.pipeline_id,
        stage_id: formData.stage_id,
        value_estimate_cents: valueInCents,
        currency: 'GBP',
        treatment_tags: selectedTreatments,
        source: formData.source || null,
        notes: formData.notes.trim() || null,
        tenant_id: appUser.tenant_id,
        owner_id: appUser.id,
        status: 'active'
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
        source: '',
        notes: '',
      })
      setSelectedTreatments([])
      
      onDealCreated()
      onClose()
    } catch (error: any) {
      console.error('Error creating deal:', error)
      toast.error(error.message || 'Failed to create deal')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
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
                <p className="text-sm text-white/80">Add a new deal to your pipeline</p>
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

            {/* Pipeline Selection */}
            <div>
              <Label htmlFor="pipeline" className="text-sm font-medium text-gray-700 mb-2">
                Pipeline *
              </Label>
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
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Selection */}
            {stages.length > 0 && (
              <div>
                <Label htmlFor="stage" className="text-sm font-medium text-gray-700 mb-2">
                  Stage *
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
              </div>
            )}

            {/* Deal Value */}
            <div>
              <Label htmlFor="value" className="text-sm font-medium text-gray-700 mb-2">
                Estimated Value (£)
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
                />
              </div>
            </div>

            {/* Treatment Tags */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                Treatment Type
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TREATMENT_OPTIONS.map((treatment) => (
                  <Badge
                    key={treatment}
                    variant={selectedTreatments.includes(treatment) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-blue-100"
                    onClick={() => toggleTreatment(treatment)}
                  >
                    {treatment}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Source */}
            <div>
              <Label htmlFor="source" className="text-sm font-medium text-gray-700 mb-2">
                Source
              </Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="How did they find you?" />
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
            disabled={loading || !formData.title.trim() || !formData.contact_id}
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
    </>
  )
}

