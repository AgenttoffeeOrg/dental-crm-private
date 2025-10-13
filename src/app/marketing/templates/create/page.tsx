'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { TemplateEditor } from '@/components/marketing/email-builder/template-editor'
import type { EmailBlock } from '@/types/marketing'
import Link from 'next/link'

export default function CreateTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('marketing_templates')
        .insert({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name,
          description,
          type: 'email',
          subject_line: subject,
          preheader,
          content_json: blocks,
          content_html: generateHTML(blocks),
          category: 'custom',
          is_public: false,
        })

      if (error) throw error

      toast.success('Template saved!')
      router.push('/marketing/templates')
    } catch (error) {
      console.error('[TEMPLATE] Error saving:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/marketing/templates">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Email Template</h1>
                <p className="text-sm text-gray-600">Design a reusable template with drag-and-drop blocks</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>

          {/* Template Settings */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Template Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Welcome Email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Subject Line
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Welcome to {{practice.name}}!"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Description (Optional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this template..."
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Preheader Text (Optional)
                  </label>
                  <Input
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Preview text that appears in inbox..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Builder */}
          <TemplateEditor
            blocks={blocks}
            onChange={setBlocks}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

function generateHTML(blocks: EmailBlock[]): string {
  // Simple HTML generation - can be enhanced
  let html = '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
  
  blocks.forEach(block => {
    switch (block.type) {
      case 'header':
        html += `<h1 style="font-size: 24px; margin: 20px 0;">${block.content?.text || ''}</h1>`
        break
      case 'text':
        html += `<p style="font-size: 14px; line-height: 1.6; margin: 15px 0;">${block.content?.text || ''}</p>`
        break
      case 'image':
        html += `<img src="${block.content?.url || ''}" alt="${block.content?.alt || ''}" style="max-width: 100%; height: auto; margin: 15px 0;" />`
        break
      case 'button':
        html += `<div style="text-align: center; margin: 20px 0;"><a href="${block.content?.url || '#'}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">${block.content?.text || 'Button'}</a></div>`
        break
      case 'divider':
        html += '<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />'
        break
      case 'spacer':
        html += `<div style="height: ${block.content?.height || '20px'};"></div>`
        break
    }
  })
  
  html += '</body></html>'
  return html
}

