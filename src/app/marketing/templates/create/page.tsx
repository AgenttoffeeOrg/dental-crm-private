'use client'

import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { EmailBuilderAdvanced } from '@/components/marketing/email-builder-advanced'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import Link from 'next/link'

export default function CreateTemplatePage() {
  const router = useRouter()

  const handleSave = async (html: string, css: string) => {
    try {
      const supabase = createClient()
      const tenantId = appUser.tenant_id

      const { error } = await supabase
        .from('marketing_templates')
        .insert({
          tenant_id: tenantId,
          name: 'New Email Template',
          channel: 'email',
          category: 'custom',
          content_html: html,
          content_css: css,
          content_text: html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
          is_favorite: false,
          usage_count: 0
        })

      if (error) throw error

      toast.success('Template saved successfully!')
      router.push('/marketing/templates')
    } catch (error) {
      console.error('[TEMPLATE] Error saving:', error)
      toast.error('Failed to save template')
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="p-8 max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/marketing/templates">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Email Template Builder
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </h1>
                <p className="text-gray-600 mt-1">Design beautiful, professional emails with drag-and-drop</p>
              </div>
            </div>
          </div>

          <EmailBuilderAdvanced onSave={handleSave} />
        </div>
      </div>
    </DashboardLayout>
  )
}
