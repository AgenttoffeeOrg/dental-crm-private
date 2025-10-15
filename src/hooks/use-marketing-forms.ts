'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'scale' | 'file' | 'signature' | 'rating' | 'date'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  order?: number
  validation?: {
    min?: number
    max?: number
    pattern?: string
    minLength?: number
    maxLength?: number
  }
  scoring?: {
    weight: number
    scoreMapping?: Record<string, number>
  }
  conditionalLogic?: {
    action: 'show' | 'hide' | 'require' | 'optional'
    field: string
    when: {
      field: string
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'
      value: any
    }
  }
}

export interface MarketingForm {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'archived'
  fields_json: FormField[]
  theme: string | null
  button_text: string
  success_message: string
  redirect_url: string | null
  auto_add_tags: string[]
  enable_recaptcha: boolean
  enable_honeypot: boolean
  total_views: number
  total_submissions: number
  conversion_rate: number | null
  is_published: boolean
  public_url_slug: string | null
  created_at: string
  updated_at: string
}

export function useMarketingForms() {
  const [forms, setForms] = useState<MarketingForm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Load all forms for current tenant
  const loadForms = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError('Not authenticated')
        setForms([])
        return
      }

      // Get user's tenant_id
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!appUser) {
        setError('User not found')
        setForms([])
        return
      }

      // Load forms for this tenant
      const { data: formsData, error: formsError } = await supabase
        .from('marketing_forms')
        .select('*')
        .eq('tenant_id', appUser.tenant_id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })

      if (formsError) {
        console.error('[useMarketingForms] Error loading forms:', formsError)
        
        // If table doesn't exist, just show empty state
        if (formsError.code === '42P01' || formsError.message?.includes('does not exist')) {
          console.warn('[useMarketingForms] Forms table does not exist yet - showing empty state')
          setForms([])
          setError(null) // Don't show error to user
          return
        }
        
        setError(formsError.message)
        setForms([])
        return
      }

      setForms(formsData || [])
    } catch (err) {
      console.error('[useMarketingForms] Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load forms')
      setForms([])
    } finally {
      setLoading(false)
    }
  }

  // Create new form
  const createForm = async (formData: Partial<MarketingForm>) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Not authenticated')
        return null
      }

      // Get user's tenant_id
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!appUser) {
        toast.error('User not found')
        return null
      }

      // Create form
      const { data, error } = await supabase
        .from('marketing_forms')
        .insert({
          tenant_id: appUser.tenant_id,
          name: formData.name || 'Untitled Form',
          description: formData.description || null,
          status: formData.status || 'draft',
          fields_json: formData.fields_json || [],
          theme: formData.theme || 'default',
          button_text: formData.button_text || 'Submit',
          success_message: formData.success_message || 'Thank you! We\'ll be in touch soon.',
          redirect_url: formData.redirect_url || null,
          auto_add_tags: formData.auto_add_tags || [],
          enable_recaptcha: formData.enable_recaptcha ?? false,
          enable_honeypot: formData.enable_honeypot ?? true,
          total_views: 0,
          total_submissions: 0,
          is_published: formData.is_published ?? false,
          public_url_slug: formData.public_url_slug || null,
          created_by_user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[useMarketingForms] Error creating form:', error)
        toast.error('Failed to create form')
        return null
      }

      toast.success('Form created successfully')
      await loadForms() // Reload forms list
      return data
    } catch (err) {
      console.error('[useMarketingForms] Unexpected error:', err)
      toast.error('Failed to create form')
      return null
    }
  }

  // Update existing form
  const updateForm = async (formId: string, formData: Partial<MarketingForm>) => {
    try {
      const { data, error } = await supabase
        .from('marketing_forms')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId)
        .select()
        .single()

      if (error) {
        console.error('[useMarketingForms] Error updating form:', error)
        toast.error('Failed to update form')
        return null
      }

      toast.success('Form updated successfully')
      await loadForms() // Reload forms list
      return data
    } catch (err) {
      console.error('[useMarketingForms] Unexpected error:', err)
      toast.error('Failed to update form')
      return null
    }
  }

  // Soft delete (archive) form
  const deleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_forms')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId)

      if (error) {
        console.error('[useMarketingForms] Error deleting form:', error)
        toast.error('Failed to delete form')
        return false
      }

      toast.success('Form deleted successfully')
      await loadForms() // Reload forms list
      return true
    } catch (err) {
      console.error('[useMarketingForms] Unexpected error:', err)
      toast.error('Failed to delete form')
      return false
    }
  }

  // Duplicate form
  const duplicateForm = async (formId: string) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Not authenticated')
        return null
      }

      // Get original form
      const { data: originalForm, error: fetchError } = await supabase
        .from('marketing_forms')
        .select('*')
        .eq('id', formId)
        .single()

      if (fetchError || !originalForm) {
        toast.error('Form not found')
        return null
      }

      // Create duplicate
      const { data, error } = await supabase
        .from('marketing_forms')
        .insert({
          tenant_id: originalForm.tenant_id,
          name: `${originalForm.name} (Copy)`,
          description: originalForm.description,
          status: 'draft',
          fields_json: originalForm.fields_json,
          theme: originalForm.theme,
          button_text: originalForm.button_text,
          success_message: originalForm.success_message,
          redirect_url: originalForm.redirect_url,
          auto_add_tags: originalForm.auto_add_tags,
          enable_recaptcha: originalForm.enable_recaptcha,
          enable_honeypot: originalForm.enable_honeypot,
          total_views: 0,
          total_submissions: 0,
          is_published: false,
          public_url_slug: null,
          created_by_user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[useMarketingForms] Error duplicating form:', error)
        toast.error('Failed to duplicate form')
        return null
      }

      toast.success('Form duplicated successfully')
      await loadForms() // Reload forms list
      return data
    } catch (err) {
      console.error('[useMarketingForms] Unexpected error:', err)
      toast.error('Failed to duplicate form')
      return null
    }
  }

  // Load forms on mount
  useEffect(() => {
    loadForms()
  }, [])

  return {
    forms,
    loading,
    error,
    loadForms,
    createForm,
    updateForm,
    deleteForm,
    duplicateForm,
  }
}

