'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { FormRenderer } from '@/components/forms/form-renderer'
import { MultiStepFormRenderer } from '@/components/forms/multi-step-form-renderer'
import type { MarketingForm } from '@/hooks/use-marketing-forms'

/**
 * Embeddable form page (for iframes)
 * Minimal styling, no navigation, optimized for embedding
 */
export default function EmbedFormPage() {
  const params = useParams()
  const [form, setForm] = useState<MarketingForm | null>(null)
  const [brand, setBrand] = useState<{ primary: string | null; accent: string | null }>({
    primary: null,
    accent: null,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadForm()
  }, [params.id])

  const loadForm = async () => {
    try {
      setLoading(true)

      // Fetch form by ID (public access)
      const { data, error } = await supabase
        .from('marketing_forms')
        .select('*')
        .eq('id', params.id)
        .eq('status', 'active')
        .single()

      if (error) {
        console.error('[EmbedForm] Error loading form:', error)
        return
      }

      setForm(data)

      // 2b.28.2: brand colours via the public endpoint (anon role
      // can't read tenants directly).
      try {
        const brandRes = await fetch(
          `/api/public/form-brand?id=${encodeURIComponent(String(params.id))}`
        )
        if (brandRes.ok) {
          const brandBody = await brandRes.json()
          setBrand({ primary: brandBody.primary ?? null, accent: brandBody.accent ?? null })
        }
      } catch (brandErr) {
        console.warn('[EmbedForm] brand fetch failed', brandErr)
      }

      // Track view
      await supabase.rpc('increment_form_views', { form_id: params.id as string })
    } catch (err) {
      console.error('[EmbedForm] Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-gray-500">Form not found</p>
      </div>
    )
  }

  const hasPageBreaks = form.fields_json.some((field: any) => field.type === 'page_break')

  return (
    <div className="p-6 bg-white">
      {hasPageBreaks ? (
        <MultiStepFormRenderer form={form} standalone={true} />
      ) : (
        <FormRenderer
          form={form}
          standalone={true}
          brandPrimaryColor={brand.primary}
          brandAccentColor={brand.accent}
        />
      )}
    </div>
  )
}

