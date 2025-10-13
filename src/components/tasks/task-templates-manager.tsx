'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Phone, Mail, CheckSquare, Calendar, Repeat, Plus, Edit2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const TASK_TYPE_OPTIONS = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'todo', label: 'To-Do', icon: CheckSquare },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'follow_up', label: 'Follow-up', icon: Repeat }
]

export function TaskTemplatesManager() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    task_type: 'call',
    priority: 'normal',
    estimated_duration_minutes: 30,
    default_notes: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const templateData = {
        ...formData,
        tenant_id: user?.user_metadata?.tenant_id || '11111111-1111-1111-1111-111111111111'
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('task_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        toast.success('Template updated')
      } else {
        const { error } = await supabase
          .from('task_templates')
          .insert(templateData)

        if (error) throw error
        toast.success('Template created')
      }

      setDialogOpen(false)
      resetForm()
      await loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      toast.success('Template deleted')
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const editTemplate = (template: any) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      task_type: template.task_type,
      priority: template.priority,
      estimated_duration_minutes: template.estimated_duration_minutes || 30,
      default_notes: template.default_notes || ''
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      task_type: 'call',
      priority: 'normal',
      estimated_duration_minutes: 30,
      default_notes: ''
    })
  }

  const createTaskFromTemplate = async (template: any) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: template.name,
          description: template.description,
          task_type: template.task_type,
          priority: template.priority,
          estimated_duration_minutes: template.estimated_duration_minutes,
          notes: template.default_notes,
          status: 'open',
          assignee_user_id: user?.id,
          tenant_id: user?.user_metadata?.tenant_id || '11111111-1111-1111-1111-111111111111'
        })

      if (error) throw error
      toast.success('Task created from template!')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Templates</h2>
          <p className="text-gray-500 mt-1">Reusable templates for common workflows</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Follow-up Call After Consultation"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What is this template for?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Task Type</Label>
                  <Select value={formData.task_type} onValueChange={(val) => setFormData({...formData, task_type: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Estimated Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData({...formData, estimated_duration_minutes: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label>Default Notes/Script</Label>
                <Textarea
                  value={formData.default_notes}
                  onChange={(e) => setFormData({...formData, default_notes: e.target.value})}
                  placeholder="Pre-fill notes or call script..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveTemplate}>Save Template</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const TypeIcon = TASK_TYPE_OPTIONS.find(t => t.value === template.task_type)?.icon || CheckSquare
            
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded">
                        <TypeIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editTemplate(template)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteTemplate(template.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {template.priority}
                    </Badge>
                    {template.estimated_duration_minutes && (
                      <Badge variant="outline" className="text-xs">
                        {template.estimated_duration_minutes}min
                      </Badge>
                    )}
                  </div>

                  <Button size="sm" className="w-full" onClick={() => createTaskFromTemplate(template)}>
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 mb-4">No templates yet</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Template
          </Button>
        </div>
      )}
    </div>
  )
}


