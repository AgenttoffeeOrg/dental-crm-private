'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Layout, Edit, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { MarketingTemplate } from '@/types/marketing'

interface TemplateListProps {
  tenantId?: string
}

export function TemplateList({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: TemplateListProps) {
  const [templates, setTemplates] = useState<MarketingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        // Check if table doesn't exist yet (migrations not run)
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('[TEMPLATES] Marketing tables not yet created - run migrations')
          setTemplates([])
          return
        }
        throw error
      }
      setTemplates(data || [])
    } catch (error) {
      console.error('[TEMPLATES] Error fetching:', error)
      // Don't show error toast if tables don't exist yet
    } finally {
      setLoading(false)
    }
  }

  const duplicateTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      const { error } = await supabase
        .from('marketing_templates')
        .insert({
          ...template,
          id: undefined,
          name: `${template.name} (Copy)`,
          created_at: undefined,
          updated_at: undefined
        })

      if (error) throw error
      toast.success('Template duplicated')
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to duplicate template')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading templates...</div>
  }

  if (templates.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Layout className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first email template with our drag-and-drop builder
          </p>
          <Link href="/marketing/templates/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map(template => (
        <Card key={template.id} className="group hover:shadow-lg transition-all">
          <CardContent className="p-0">
            {/* Thumbnail */}
            <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center border-b">
              {template.thumbnail_url ? (
                <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
              ) : (
                <Layout className="h-16 w-16 text-gray-300" />
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                  )}
                </div>
                {template.type && (
                  <Badge variant="outline" className="text-xs ml-2">
                    {template.type}
                  </Badge>
                )}
              </div>

              {template.category && (
                <Badge variant="secondary" className="text-xs mb-3">
                  {template.category}
                </Badge>
              )}

              <div className="flex gap-2 pt-3 border-t">
                <Link href={`/marketing/templates/${template.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => duplicateTemplate(template.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

