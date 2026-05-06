'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { useMarketingForms, type MarketingForm } from '@/hooks/use-marketing-forms'
import { EmbedCodeModal } from '@/components/forms/embed-code-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Copy, 
  Share2,
  Settings,
  Zap,
  Target,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Star,
  BarChart3,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'scale'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  scoring?: {
    weight: number
    scoreMapping?: Record<string, number>
  }
}

// Legacy LeadForm interface - deprecated, use MarketingForm instead
// Keeping for compatibility with scoring functions

const DEFAULT_FIELDS: FormField[] = [
  {
    id: 'full_name',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
    scoring: { weight: 0 }
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    placeholder: 'your.email@example.com',
    required: true,
    scoring: { weight: 5 }
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Phone Number',
    placeholder: '+44 7700 900000',
    required: true,
    scoring: { weight: 10 }
  }
]

const TREATMENT_OPTIONS = [
  'General Checkup',
  'Teeth Cleaning',
  'Teeth Whitening',
  'Dental Implants',
  'Root Canal Treatment',
  'Orthodontics (Braces)',
  'Invisalign',
  'Veneers',
  'Crowns',
  'Tooth Extraction',
  'Gum Treatment',
  'Emergency Treatment',
  'Other'
]

const URGENCY_OPTIONS = [
  { label: 'Emergency (Within 24 hours)', value: 'emergency', score: 50 },
  { label: 'Urgent (Within 1 week)', value: 'urgent', score: 40 },
  { label: 'Soon (Within 1 month)', value: 'soon', score: 25 },
  { label: 'Planning ahead (1-3 months)', value: 'planning', score: 15 },
  { label: 'Just researching', value: 'research', score: 5 }
]

const BUDGET_OPTIONS = [
  { label: 'Under £500', value: 'low', score: 10 },
  { label: '£500 - £1,500', value: 'medium', score: 20 },
  { label: '£1,500 - £5,000', value: 'high', score: 30 },
  { label: '£5,000 - £15,000', value: 'premium', score: 40 },
  { label: '£15,000+', value: 'luxury', score: 50 },
  { label: 'Cost not a concern', value: 'unlimited', score: 50 }
]

const SEVERITY_OPTIONS = [
  { label: 'Severe pain/emergency', value: 'severe', score: 50 },
  { label: 'Moderate discomfort', value: 'moderate', score: 30 },
  { label: 'Minor issue', value: 'minor', score: 15 },
  { label: 'Cosmetic improvement', value: 'cosmetic', score: 20 },
  { label: 'Preventive care', value: 'preventive', score: 10 }
]

const RECOMMENDED_FIELDS: FormField[] = [
  {
    id: 'treatment_interest',
    type: 'select',
    label: 'What treatment are you interested in?',
    required: true,
    options: TREATMENT_OPTIONS,
    scoring: { weight: 15 }
  },
  {
    id: 'urgency',
    type: 'radio',
    label: 'How urgently do you need treatment?',
    required: true,
    options: URGENCY_OPTIONS.map(o => o.label),
    scoring: { 
      weight: 25,
      scoreMapping: Object.fromEntries(URGENCY_OPTIONS.map(o => [o.label, o.score]))
    }
  },
  {
    id: 'budget',
    type: 'select',
    label: 'What is your approximate budget?',
    required: false,
    options: BUDGET_OPTIONS.map(o => o.label),
    scoring: { 
      weight: 20,
      scoreMapping: Object.fromEntries(BUDGET_OPTIONS.map(o => [o.label, o.score]))
    }
  },
  {
    id: 'problem_severity',
    type: 'radio',
    label: 'How would you describe your dental concern?',
    required: true,
    options: SEVERITY_OPTIONS.map(o => o.label),
    scoring: { 
      weight: 20,
      scoreMapping: Object.fromEntries(SEVERITY_OPTIONS.map(o => [o.label, o.score]))
    }
  },
  {
    id: 'pain_level',
    type: 'scale',
    label: 'Current pain level (0 = no pain, 10 = severe pain)',
    required: false,
    validation: { min: 0, max: 10 },
    scoring: { 
      weight: 15,
      scoreMapping: {
        '0': 0, '1': 5, '2': 10, '3': 15, '4': 20,
        '5': 25, '6': 30, '7': 35, '8': 40, '9': 45, '10': 50
      }
    }
  },
  {
    id: 'previous_patient',
    type: 'radio',
    label: 'Have you been to our practice before?',
    required: true,
    options: ['Yes, I\'m an existing patient', 'No, I\'m a new patient'],
    scoring: { 
      weight: 10,
      scoreMapping: {
        'Yes, I\'m an existing patient': 15,
        'No, I\'m a new patient': 10
      }
    }
  },
  {
    id: 'preferred_contact',
    type: 'radio',
    label: 'How would you prefer us to contact you?',
    required: true,
    options: ['Phone call', 'Text message', 'Email', 'WhatsApp'],
    scoring: { 
      weight: 5,
      scoreMapping: {
        'Phone call': 10,
        'Text message': 8,
        'WhatsApp': 8,
        'Email': 5
      }
    }
  },
  {
    id: 'additional_info',
    type: 'textarea',
    label: 'Additional information or questions',
    placeholder: 'Please describe your concern or any questions you have...',
    required: false,
    scoring: { weight: 5 }
  }
]

interface CustomQuestionBuilderProps {
  onAddField: (field: FormField) => void
}

function CustomQuestionBuilder({ onAddField }: CustomQuestionBuilderProps) {
  const [customField, setCustomField] = useState<Partial<FormField>>({
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: [],
    scoring: { weight: 10 }
  })
  const [optionInput, setOptionInput] = useState('')

  const addOption = () => {
    if (optionInput.trim() && customField.options) {
      setCustomField({
        ...customField,
        options: [...customField.options, optionInput.trim()]
      })
      setOptionInput('')
    }
  }

  const removeOption = (index: number) => {
    if (customField.options) {
      setCustomField({
        ...customField,
        options: customField.options.filter((_, i) => i !== index)
      })
    }
  }

  const handleAddCustomField = () => {
    if (!customField.label?.trim()) {
      toast.error('Please enter a question label')
      return
    }

    const newField: FormField = {
      id: `custom_${Date.now()}`,
      type: customField.type as FormField['type'],
      label: customField.label,
      placeholder: customField.placeholder,
      required: customField.required || false,
      options: ['select', 'radio', 'checkbox'].includes(customField.type || '') ? customField.options : undefined,
      validation: customField.type === 'scale' ? { min: 0, max: 10 } : undefined,
      scoring: customField.scoring
    }

    onAddField(newField)
    
    // Reset form
    setCustomField({
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: [],
      scoring: { weight: 10 }
    })
    
    toast.success('Custom question added!')
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="custom_label">Question Label *</Label>
          <Input
            id="custom_label"
            value={customField.label || ''}
            onChange={(e) => setCustomField({ ...customField, label: e.target.value })}
            placeholder="e.g., What is your preferred appointment time?"
          />
        </div>
        <div>
          <Label htmlFor="custom_type">Question Type</Label>
          <Select
            value={customField.type}
            onValueChange={(value) => setCustomField({ 
              ...customField, 
              type: value as FormField['type'],
              options: ['select', 'radio', 'checkbox'].includes(value) ? [] : undefined
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="radio">Multiple Choice</SelectItem>
              <SelectItem value="checkbox">Checkboxes</SelectItem>
              <SelectItem value="textarea">Long Text</SelectItem>
              <SelectItem value="scale">Scale (0-10)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="custom_placeholder">Placeholder Text</Label>
        <Input
          id="custom_placeholder"
          value={customField.placeholder || ''}
          onChange={(e) => setCustomField({ ...customField, placeholder: e.target.value })}
          placeholder="Hint text for the user..."
        />
      </div>

      {/* Options for select/radio/checkbox */}
      {['select', 'radio', 'checkbox'].includes(customField.type || '') && (
        <div>
          <Label>Answer Options</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                placeholder="Enter an option..."
                onKeyPress={(e) => e.key === 'Enter' && addOption()}
              />
              <Button type="button" onClick={addOption} size="sm">
                Add
              </Button>
            </div>
            {customField.options && customField.options.length > 0 && (
              <div className="space-y-1">
                {customField.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm">{option}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="custom_required"
            checked={customField.required || false}
            onCheckedChange={(checked) => setCustomField({ ...customField, required: checked })}
          />
          <Label htmlFor="custom_required">Required field</Label>
        </div>
        <div>
          <Label htmlFor="custom_weight">Scoring Weight</Label>
          <Input
            id="custom_weight"
            type="number"
            min="0"
            max="50"
            value={customField.scoring?.weight || 10}
            onChange={(e) => setCustomField({ 
              ...customField, 
              scoring: { weight: parseInt(e.target.value) || 10 }
            })}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={handleAddCustomField}>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Question
        </Button>
      </div>
    </div>
  )
}

interface FormBuilderProps {
  tenantId?: string
}

export function FormBuilder({ tenantId }: FormBuilderProps) {
  // Use real database hook instead of mock data
  const { forms, loading, error, loadForms, createForm, updateForm, deleteForm, duplicateForm } = useMarketingForms()
  
  const [selectedForm, setSelectedForm] = useState<MarketingForm | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [showEmbedModal, setShowEmbedModal] = useState(false)
  const [embedForm, setEmbedForm] = useState<MarketingForm | null>(null)
  
  const supabase = createClient()

  const calculateLeadScore = (formData: Record<string, string>, fields: FormField[]): number => {
    let totalScore = 0
    let maxPossibleScore = 0

    fields.forEach(field => {
      if (field.scoring) {
        maxPossibleScore += field.scoring.weight
        
        const value = formData[field.id]
        if (value) {
          if (field.scoring.scoreMapping && field.scoring.scoreMapping[value]) {
            totalScore += field.scoring.scoreMapping[value]
          } else if (field.type === 'scale' && field.scoring.scoreMapping) {
            totalScore += field.scoring.scoreMapping[value] || 0
          } else {
            // Default scoring for filled fields
            totalScore += Math.min(field.scoring.weight, 10)
          }
        }
      }
    })

    return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0
  }

  const getLeadCategory = (score: number): { category: string; color: string; probability: number } => {
    // Default thresholds
    const hotThreshold = 80
    const warmThreshold = 50
    
    if (score >= hotThreshold) {
      return { category: 'HOT', color: 'bg-red-100 text-red-800', probability: 85 }
    } else if (score >= warmThreshold) {
      return { category: 'WARM', color: 'bg-yellow-100 text-yellow-800', probability: 60 }
    } else {
      return { category: 'COLD', color: 'bg-blue-100 text-blue-800', probability: 25 }
    }
  }

  const createNewForm = async () => {
    // Create a new form in the database
    const newForm = await createForm({
      name: 'New Lead Form',
      description: 'Custom lead capture form',
      status: 'draft',
      fields_json: DEFAULT_FIELDS as any,
      button_text: 'Submit',
      success_message: 'Thank you! We\'ll be in touch soon.',
      auto_add_tags: ['lead', 'website'],
      enable_recaptcha: false,
      enable_honeypot: true,
      is_published: false,
    })

    if (newForm) {
      setSelectedForm(newForm)
      setIsCreating(true)
      setIsEditing(true)
    }
  }

  const saveForm = async () => {
    if (!selectedForm) return
    
    try {
      if (isCreating) {
        // Form already created in createNewForm, just update it
        const updated = await updateForm(selectedForm.id, selectedForm)
        if (updated) {
          setSelectedForm(updated)
        }
      } else {
        // Update existing form
        const updated = await updateForm(selectedForm.id, selectedForm)
        if (updated) {
          setSelectedForm(updated)
        }
      }
      setIsCreating(false)
      setIsEditing(false)
      setSelectedForm(null)
    } catch (error) {
      toast.error('Failed to save form')
    }
  }

  const addField = (field: FormField) => {
    if (!selectedForm) return
    
    const newField = {
      ...field,
      id: `${field.id}_${Date.now()}`
    }
    
    setSelectedForm({
      ...selectedForm,
      fields_json: [...selectedForm.fields_json, newField]
    })
  }

  const removeField = (fieldId: string) => {
    if (!selectedForm) return
    
    setSelectedForm({
      ...selectedForm,
      fields_json: selectedForm.fields_json.filter(f => f.id !== fieldId)
    })
  }

  // DEPRECATED: Old form code generator - now using embed-generator.ts
  const generateFormCode = (form: any): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const fields = form.fields_json || form.fields || []
    
    return `<!-- ${form.name} - Generated by DentalCRM -->
<form id="dental-crm-form-${form.id}" action="${baseUrl}/api/marketing/forms/submit" method="POST">
  <input type="hidden" name="form_id" value="${form.id}" />
  
  ${fields.map((field: any) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return `  <div class="form-field">
    <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
    <input type="${field.type}" id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} />
  </div>`
      
      case 'select':
        return `  <div class="form-field">
    <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
    <select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
      <option value="">Please select...</option>
      ${field.options?.map(option => `      <option value="${option}">${option}</option>`).join('\n') || ''}
    </select>
  </div>`
      
      case 'radio':
        return `  <div class="form-field">
    <fieldset>
      <legend>${field.label}${field.required ? ' *' : ''}</legend>
      ${field.options?.map((option, index) => `      <label>
        <input type="radio" name="${field.id}" value="${option}" ${field.required && index === 0 ? 'required' : ''} />
        ${option}
      </label>`).join('\n') || ''}
    </fieldset>
  </div>`
      
      case 'textarea':
        return `  <div class="form-field">
    <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
    <textarea id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>
  </div>`
      
      case 'scale':
        return `  <div class="form-field">
    <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
    <input type="range" id="${field.id}" name="${field.id}" min="${field.validation?.min || 0}" max="${field.validation?.max || 10}" ${field.required ? 'required' : ''} />
    <div class="scale-labels">
      <span>${field.validation?.min || 0}</span>
      <span>${field.validation?.max || 10}</span>
    </div>
  </div>`
      
      default:
        return `  <!-- Unsupported field type: ${field.type} -->`
    }
  }).join('\n\n')}
  
  <button type="submit">Submit</button>
</form>

<style>
.form-field {
  margin-bottom: 1rem;
}

.form-field label,
.form-field legend {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-field textarea {
  height: 100px;
  resize: vertical;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #666;
}

button[type="submit"] {
  background-color: #007bff;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button[type="submit"]:hover {
  background-color: #0056b3;
}
</style>`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Lead Capture Forms</h2>
          <p className="text-gray-600">Create intelligent forms that automatically score and categorize leads</p>
        </div>
        <Button onClick={createNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading forms...</p>
        </div>
      ) : forms.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-4">Create your first form to start capturing leads</p>
            <Button onClick={createNewForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {forms.map(form => {
            return (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{form.name}</CardTitle>
                      {form.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{form.description}</p>
                      )}
                    </div>
                    <Badge variant={form.status === 'active' ? "default" : form.status === 'draft' ? "secondary" : "outline"}>
                      {form.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Fields:</span>
                    <span className="font-medium">{form.fields_json.length} questions</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Submissions:</span>
                    <span className="font-medium">{form.total_submissions}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Conversion:</span>
                    <span className="font-medium">
                      {form.conversion_rate ? `${form.conversion_rate.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedForm(form)
                        setIsEditing(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmbedForm(form)
                        setShowEmbedModal(true)
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const duplicate = await duplicateForm(form.id)
                        if (duplicate) {
                          toast.success('Form duplicated!')
                        }
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Clone
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        if (confirm(`Delete "${form.name}"?`)) {
                          await deleteForm(form.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Embed Modal */}
      {embedForm && (
        <EmbedCodeModal
          form={embedForm}
          open={showEmbedModal}
          onClose={() => {
            setShowEmbedModal(false)
            setEmbedForm(null)
          }}
        />
      )}

      {/* Form Editor Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create New Form' : 'Edit Form'}
            </DialogTitle>
            <DialogDescription>
              Design your lead capture form with intelligent scoring
            </DialogDescription>
          </DialogHeader>
          
          {selectedForm && (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="form_name">Form Name</Label>
                  <Input
                    id="form_name"
                    value={selectedForm.name}
                    onChange={(e) => setSelectedForm({
                      ...selectedForm,
                      name: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="integration_type">Integration Type</Label>
                  <Select
                    value={selectedForm.integration_type}
                    onValueChange={(value) => setSelectedForm({
                      ...selectedForm,
                      integration_type: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="form_description">Description</Label>
                <Textarea
                  id="form_description"
                  value={selectedForm.description}
                  onChange={(e) => setSelectedForm({
                    ...selectedForm,
                    description: e.target.value
                  })}
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Form Fields</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Question to Form</DialogTitle>
                        <DialogDescription>
                          Choose from recommended questions or create a custom one
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Recommended Questions */}
                        <div>
                          <h4 className="font-semibold mb-3">📋 Recommended Questions</h4>
                          <div className="grid gap-3">
                            {RECOMMENDED_FIELDS.map(field => (
                              <div key={field.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <div className="font-medium">{field.label}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Type: {field.type} • Weight: {field.scoring?.weight || 0} points
                                  </div>
                                  {field.options && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Options: {field.options.slice(0, 3).join(', ')}{field.options.length > 3 ? '...' : ''}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => addField(field)}
                                  className="ml-4"
                                >
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom Question Builder */}
                        <div className="border-t pt-6">
                          <h4 className="font-semibold mb-3">✨ Create Custom Question</h4>
                          
                          {/* Quick Add Common Questions */}
                          <div className="mb-4">
                            <Label className="text-sm font-medium mb-2 block">Quick Add Common Questions:</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: 'Preferred appointment time', type: 'select', options: ['Morning (9-12)', 'Afternoon (12-17)', 'Evening (17-20)', 'Flexible'], weight: 5 },
                                { label: 'How did you hear about us?', type: 'select', options: ['Google search', 'Social media', 'Friend/family referral', 'Advertisement', 'Other'], weight: 8 },
                                { label: 'Insurance provider', type: 'text', placeholder: 'e.g., Bupa, AXA, NHS', weight: 10 },
                                { label: 'Preferred language', type: 'select', options: ['English', 'Spanish', 'French', 'Other'], weight: 3 },
                                { label: 'Any dental anxiety?', type: 'radio', options: ['No anxiety', 'Mild anxiety', 'Moderate anxiety', 'High anxiety'], weight: 12 },
                                { label: 'Medical conditions', type: 'textarea', placeholder: 'Please list any relevant medical conditions...', weight: 15 }
                              ].map((quickField, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const field: FormField = {
                                      id: `quick_${Date.now()}_${index}`,
                                      type: quickField.type as FormField['type'],
                                      label: quickField.label,
                                      placeholder: quickField.placeholder,
                                      required: false,
                                      options: quickField.options,
                                      scoring: { weight: quickField.weight }
                                    }
                                    addField(field)
                                  }}
                                  className="text-xs"
                                >
                                  + {quickField.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <CustomQuestionBuilder onAddField={addField} />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {selectedForm.fields_json.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="font-medium">{field.label}</span>
                          {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="capitalize">{field.type}</span>
                          {field.scoring && <span> • {field.scoring.weight} points</span>}
                          {field.options && <span> • {field.options.length} options</span>}
                        </div>
                        {field.options && field.options.length <= 3 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Options: {field.options.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Move field up
                            if (index > 0) {
                              const newFields = [...selectedForm.fields_json]
                              const temp = newFields[index]
                              newFields[index] = newFields[index - 1]
                              newFields[index - 1] = temp
                              setSelectedForm({ ...selectedForm, fields_json: newFields })
                            }
                          }}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Move field down
                            if (index < selectedForm.fields_json.length - 1) {
                              const newFields = [...selectedForm.fields_json]
                              const temp = newFields[index]
                              newFields[index] = newFields[index + 1]
                              newFields[index + 1] = temp
                              setSelectedForm({ ...selectedForm, fields_json: newFields })
                            }
                          }}
                          disabled={index === selectedForm.fields_json.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {selectedForm.fields_json.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No questions added yet</p>
                      <p className="text-sm text-gray-500">Click "Add Question" to get started</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Settings */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Form Behavior</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="button_text">Submit Button Text</Label>
                    <Input
                      id="button_text"
                      value={selectedForm.button_text || 'Submit'}
                      onChange={(e) => setSelectedForm({
                        ...selectedForm,
                        button_text: e.target.value
                      })}
                      placeholder="Submit"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="success_message">Success Message</Label>
                    <Textarea
                      id="success_message"
                      value={selectedForm.success_message || ''}
                      onChange={(e) => setSelectedForm({
                        ...selectedForm,
                        success_message: e.target.value
                      })}
                      placeholder="Thank you! We'll be in touch soon."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_recaptcha">Enable reCAPTCHA Protection</Label>
                    <Switch
                      id="enable_recaptcha"
                      checked={selectedForm.enable_recaptcha}
                      onCheckedChange={(checked) => setSelectedForm({
                        ...selectedForm,
                        enable_recaptcha: checked
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_published">Publish Form</Label>
                    <Switch
                      id="is_published"
                      checked={selectedForm.is_published}
                      onCheckedChange={(checked) => setSelectedForm({
                        ...selectedForm,
                        is_published: checked
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveForm} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Form'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
            <DialogDescription>
              This is how your form will appear to visitors
            </DialogDescription>
          </DialogHeader>
          
          {selectedForm && (
            <div className="space-y-4">
              <div className="p-6 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">{selectedForm.name}</h3>
                <div className="space-y-4">
                  {selectedForm.fields_json.map(field => (
                    <div key={field.id} className="space-y-1">
                      <Label>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      
                      {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
                        <Input placeholder={field.placeholder} disabled />
                      ) : field.type === 'select' ? (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Please select..." />
                          </SelectTrigger>
                        </Select>
                      ) : field.type === 'textarea' ? (
                        <Textarea placeholder={field.placeholder} disabled />
                      ) : field.type === 'radio' ? (
                        <div className="space-y-2">
                          {field.options?.map(option => (
                            <div key={option} className="flex items-center space-x-2">
                              <input type="radio" disabled />
                              <label className="text-sm">{option}</label>
                            </div>
                          ))}
                        </div>
                      ) : field.type === 'scale' ? (
                        <div className="space-y-2">
                          <input type="range" min={field.validation?.min || 0} max={field.validation?.max || 10} disabled className="w-full" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{field.validation?.min || 0}</span>
                            <span>{field.validation?.max || 10}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <Button className="w-full" disabled>Submit</Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Lead Scoring Preview</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { score: 90, category: getLeadCategory(90, selectedForm) },
                    { score: 65, category: getLeadCategory(65, selectedForm) },
                    { score: 30, category: getLeadCategory(30, selectedForm) }
                  ].map(({ score, category }) => (
                    <div key={score} className="p-3 border rounded-lg text-center">
                      <div className="text-2xl font-bold">{score}</div>
                      <Badge className={category.color + ' mb-2'}>
                        {category.category}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {category.probability}% conversion
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
