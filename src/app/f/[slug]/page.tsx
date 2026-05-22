'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { FormRenderer } from '@/components/forms/form-renderer'
import { MultiStepFormRenderer } from '@/components/forms/multi-step-form-renderer'
import type { MarketingForm } from '@/hooks/use-marketing-forms'

export default function PublicFormPage() {
  const params = useParams()
  const [form, setForm] = useState<MarketingForm | null>(null)
  const [brand, setBrand] = useState<{ primary: string | null; accent: string | null }>({
    primary: null,
    accent: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadForm()
    trackFormView()
  }, [params.slug])

  const loadForm = async () => {
    try {
      setLoading(true)

      // Try to fetch by slug first, then fallback to ID if slug doesn't match
      // This allows using either a custom slug or the form ID
      let query = supabase
        .from('marketing_forms')
        .select('*')
        .eq('status', 'active')
        .eq('is_published', true)

      // Check if slug looks like a UUID (has dashes and is 36 chars)
      const isUUID = params.slug && params.slug.length === 36 && params.slug.includes('-')
      
      if (isUUID) {
        // Try ID lookup first
        query = query.eq('id', params.slug)
      } else {
        // Try slug lookup
        query = query.eq('public_url_slug', params.slug)
      }

      const { data, error } = await query.single()

      // If slug lookup failed and it's not a UUID, try ID lookup as fallback
      if (error && !isUUID) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('marketing_forms')
          .select('*')
          .eq('id', params.slug)
          .eq('status', 'active')
          .eq('is_published', true)
          .single()

        if (fallbackError || !fallbackData) {
          console.error('[PublicForm] Error loading form:', error)
          setError('Form not found')
          return
        }

        setForm(fallbackData)
        return
      }

      if (error || !data) {
        console.error('[PublicForm] Error loading form:', error)
        setError('Form not found')
        return
      }

      setForm(data)
      // 2b.28.2: fetch tenant brand colours via the public endpoint
      // (anon role can't read tenants directly via RLS — see
      // /api/public/form-brand). Best-effort: failure falls back to default styling.
      try {
        const brandRes = await fetch(
          `/api/public/form-brand?slug=${encodeURIComponent(String(params.slug))}`
        )
        if (brandRes.ok) {
          const brandBody = await brandRes.json()
          setBrand({ primary: brandBody.primary ?? null, accent: brandBody.accent ?? null })
        }
      } catch (brandErr) {
        console.warn('[PublicForm] brand fetch failed', brandErr)
      }
    } catch (err) {
      console.error('[PublicForm] Unexpected error:', err)
      setError('Failed to load form')
    } finally {
      setLoading(false)
    }
  }

  const trackFormView = async () => {
    // Track form view in analytics
    try {
      await supabase.rpc('increment_form_views', {
        form_slug: params.slug as string,
      })
    } catch (err) {
      console.error('[PublicForm] Failed to track view:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600">
            {error || 'The form you\'re looking for doesn\'t exist or has been removed.'}
          </p>
        </div>
      </div>
    )
  }

  // Check if multi-step form
  const hasPageBreaks = form.fields_json.some((field: any) => field.type === 'page_break')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Form Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.name}</h1>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {hasPageBreaks ? (
            <MultiStepFormRenderer form={form} standalone={true} />
          ) : (
            /* 2b.28.2: pass tenant brand colours into the single-step renderer */
            <FormRenderer
              form={form}
              standalone={true}
              brandPrimaryColor={brand.primary}
              brandAccentColor={brand.accent}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>🔒 Your information is secure and will never be shared</p>
        </div>
      </div>
    </div>
  )
}

