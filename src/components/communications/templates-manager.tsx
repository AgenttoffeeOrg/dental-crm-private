'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, MessageSquare, Edit, Trash, Plus, Copy, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface Template {
  id: string
  name: string
  activity_type: 'email' | 'sms' | 'whatsapp'
  subject_template?: string
  content_template: string
  variables: string[]
  category?: string
  is_active: boolean
}

export function TemplatesManager({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    activity_type: 'email' as 'email' | 'sms' | 'whatsapp',
    subject_template: '',
    content_template: '',
    category: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('activity_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTemplates(data)
      }
    } catch (error) {
      console.log('[Templates] Table not migrated yet')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const supabase = createClient()

    const templateData = {
      tenant_id: tenantId,
      name: formData.name,
      activity_type: formData.activity_type,
      subject_template: formData.subject_template || null,
      content_template: formData.content_template,
      category: formData.category || null,
      variables: extractVariables(formData.content_template + ' ' + (formData.subject_template || '')),
      is_active: true,
      created_at: new Date().toISOString()
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('activity_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        toast.success('Template updated!')
      } else {
        const { error } = await supabase
          .from('activity_templates')
          .insert(templateData)

        if (error) throw error
        toast.success('Template created!')
      }

      setDialogOpen(false)
      loadTemplates()
      resetForm()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('activity_templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete template')
    } else {
      toast.success('Template deleted')
      loadTemplates()
    }
  }

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const matches = text.match(regex) || []
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
  }

  const resetForm = () => {
    setFormData({
      name: '',
      activity_type: 'email',
      subject_template: '',
      content_template: '',
      category: ''
    })
    setEditingTemplate(null)
  }

  const openEditDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        activity_type: template.activity_type,
        subject_template: template.subject_template || '',
        content_template: template.content_template,
        category: template.category || ''
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Templates</h2>
          <p className="text-gray-600 mt-1">Save and reuse email, SMS, and WhatsApp messages</p>
        </div>
        <Button onClick={() => openEditDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {template.activity_type === 'email' && (
                      <Badge variant="secondary" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Badge>
                    )}
                    {template.activity_type === 'sms' && (
                      <Badge variant="secondary" className="text-xs">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        SMS
                      </Badge>
                    )}
                    {template.activity_type === 'whatsapp' && (
                      <Badge variant="secondary" className="text-xs">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        WhatsApp
                      </Badge>
                    )}
                    {template.category && (
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {template.subject_template && (
                <p className="text-sm font-medium text-gray-900 mb-2">{template.subject_template}</p>
              )}
              <p className="text-sm text-gray-600 line-clamp-3">{template.content_template}</p>
              
              {template.variables.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((v, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="h-3 w-3 mr-1" />
                  Use
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && !loading && (
          <div className="col-span-3">
            <Card>
              <CardContent className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-600 mb-4">Create reusable templates to save time</p>
                <Button onClick={() => openEditDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              Use variables like {"{{contact_name}}"}, {"{{deal_value}}"}, {"{{practice_name}}"} for personalization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  placeholder="Follow-up Email"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.activity_type} onValueChange={(val: any) => setFormData({...formData, activity_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category (Optional)</Label>
              <Input
                placeholder="Sales, Support, Follow-up..."
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              />
            </div>

            {formData.activity_type === 'email' && (
              <div className="space-y-2">
                <Label>Subject Template</Label>
                <Input
                  placeholder="Re: Your consultation with {{practice_name}}"
                  value={formData.subject_template}
                  onChange={(e) => setFormData({...formData, subject_template: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message Template</Label>
              <Textarea
                placeholder={"Hi {{contact_name}},\n\nThank you for your interest in {{treatment_type}}...\n\nBest regards,\n{{agent_name}}"}
                value={formData.content_template}
                onChange={(e) => setFormData({...formData, content_template: e.target.value})}
                rows={8}
              />
              <p className="text-xs text-gray-500">
                Variables: {"{{contact_name}}, {{deal_value}}, {{treatment_type}}, {{agent_name}}, {{practice_name}}"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


