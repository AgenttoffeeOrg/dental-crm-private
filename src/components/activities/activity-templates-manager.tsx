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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, Mail, FileText, Calendar, Plus, Edit2, Trash2, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: 'Call Script', icon: Phone },
  { value: 'email', label: 'Email Template', icon: Mail },
  { value: 'note', label: 'Note Template', icon: FileText },
  { value: 'meeting', label: 'Meeting Agenda', icon: Calendar }
]

const DEFAULT_TEMPLATES = {
  call: {
    sales: `Hi [Contact Name],

This is [Your Name] from [Practice Name]. 

Purpose: Follow up on your recent inquiry about [Treatment].

Key Points to Cover:
- Confirm their interest in [Treatment]
- Answer any questions about pricing/timeline
- Discuss financing options if needed
- Schedule a consultation appointment

Next Steps:
- If interested: Book consultation
- If needs time: Schedule follow-up call
- If not interested: Note reason and mark as lost

Notes:
`,
    followUp: `Hi [Contact Name],

Following up on our conversation about [Treatment].

Discussion Points:
- How have you been feeling since we last spoke?
- Have you had a chance to review the treatment plan?
- Are there any additional questions I can answer?
- Would you like to move forward with scheduling?

Outcome:
`
  },
  email: {
    quote: `Subject: Your [Treatment] Treatment Quote - [Practice Name]

Hi [Contact Name],

Thank you for your interest in [Treatment]!

As discussed, here's your personalized treatment quote:

Treatment: [Treatment Name]
Estimated Cost: £[Amount]
Timeline: [Timeframe]

What's Included:
- [Item 1]
- [Item 2]
- [Item 3]

Payment Options:
- Full payment discount: [X]%
- Interest-free payment plan available
- Insurance accepted

Next Steps:
Reply to this email or call us at [Phone] to schedule your first appointment.

Best regards,
[Your Name]
[Practice Name]`,
    followUp: `Subject: Following Up - [Treatment] at [Practice Name]

Hi [Contact Name],

I wanted to follow up on the treatment plan we discussed for [Treatment].

I understand this is an important decision, and I'm here to answer any questions you might have about:
- Treatment process and timeline
- Costs and payment options
- Expected results
- Scheduling

Would you like to schedule a brief call to discuss further? I have availability on [Date Options].

Looking forward to helping you achieve your smile goals!

Best,
[Your Name]`
  }
}

export function ActivityTemplatesManager() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('all')
  
  const [formData, setFormData] = useState({
    name: '',
    activity_type: 'call',
    category: 'Sales',
    subject_template: '',
    content_template: '',
    variables: ['contact_name', 'practice_name', 'treatment', 'your_name']
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('activity_templates')
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
        tenant_id: user?.user_metadata?.tenant_id || '11111111-1111-1111-1111-111111111111',
        created_by_user_id: user?.id
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('activity_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        toast.success('Template updated')
      } else {
        const { error } = await supabase
          .from('activity_templates')
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
        .from('activity_templates')
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
      activity_type: template.activity_type,
      category: template.category || 'Sales',
      subject_template: template.subject_template || '',
      content_template: template.content_template,
      variables: template.variables || []
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      activity_type: 'call',
      category: 'Sales',
      subject_template: '',
      content_template: '',
      variables: ['contact_name', 'practice_name', 'treatment', 'your_name']
    })
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard!')
  }

  const filteredTemplates = activeTab === 'all' 
    ? templates 
    : templates.filter(t => t.activity_type === activeTab)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Templates</h2>
          <p className="text-gray-500 mt-1">Call scripts, email templates, and meeting agendas</p>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Follow-up Call Script"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Activity Type</Label>
                <Select value={formData.activity_type} onValueChange={(val) => setFormData({...formData, activity_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.activity_type === 'email' && (
                <div>
                  <Label>Subject Line Template</Label>
                  <Input
                    value={formData.subject_template}
                    onChange={(e) => setFormData({...formData, subject_template: e.target.value})}
                    placeholder="e.g., Your {{treatment}} Quote - {{practice_name}}"
                  />
                </div>
              )}

              <div>
                <Label>Content Template</Label>
                <Textarea
                  value={formData.content_template}
                  onChange={(e) => setFormData({...formData, content_template: e.target.value})}
                  placeholder={`Use {{variables}} like {{contact_name}}, {{treatment}}, etc.`}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use double curly braces for variables: {`{{contact_name}}, {{treatment}}, {{your_name}}`}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveTemplate}>Save Template</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          {ACTIVITY_TYPE_OPTIONS.map(opt => (
            <TabsTrigger key={opt.value} value={opt.value}>
              <opt.icon className="h-4 w-4 mr-1.5" />
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            const TypeIcon = ACTIVITY_TYPE_OPTIONS.find(t => t.value === template.activity_type)?.icon || FileText
            
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-2 bg-purple-50 rounded">
                        <TypeIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.category && (
                          <Badge variant="outline" className="text-xs mt-1">{template.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(template.content_template)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
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
                  {template.subject_template && (
                    <div className="mb-2">
                      <Label className="text-xs text-gray-500">Subject:</Label>
                      <p className="text-sm font-medium">{template.subject_template}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                      {template.content_template.length > 200 
                        ? template.content_template.substring(0, 200) + '...' 
                        : template.content_template}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && filteredTemplates.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
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

