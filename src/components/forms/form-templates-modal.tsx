'use client'

/**
 * Form Templates Modal
 * Browse and use pre-built form templates
 * 
 * Templates:
 * - Contact Request
 * - Consultation Booking
 * - Appointment Request
 * - Feedback Survey
 * - NPS Survey
 * - Newsletter Signup
 * - Event Registration
 * - Free Quote Request
 */

import { useState } from 'react'
import { X, FileText, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { FormField } from '@/hooks/use-marketing-forms'

interface FormTemplate {
  id: string
  name: string
  description: string
  category: string
  fields: FormField[]
  popular: boolean
}

interface FormTemplatesModalProps {
  open: boolean
  onClose: () => void
  onSelectTemplate: (template: FormTemplate) => void
}

const TEMPLATES: FormTemplate[] = [
  {
    id: 'contact-request',
    name: 'Contact Request',
    description: 'Simple contact form for general inquiries',
    category: 'General',
    popular: true,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, order: 1 },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', required: false, order: 2 },
      { id: 'message', type: 'textarea', label: 'Message', placeholder: 'How can we help you?', required: true, order: 3 },
    ],
  },
  {
    id: 'consultation-booking',
    name: 'Consultation Booking',
    description: 'Book a consultation appointment with your team',
    category: 'Appointments',
    popular: true,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, order: 1 },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', required: true, order: 2 },
      { id: 'service', type: 'select', label: 'Service Interested In', required: true, order: 3, options: ['Dental Checkup', 'Teeth Cleaning', 'Cosmetic Dentistry', 'Orthodontics', 'Other'] },
      { id: 'preferred_date', type: 'date', label: 'Preferred Date', required: true, order: 4 },
      { id: 'notes', type: 'textarea', label: 'Additional Notes', placeholder: 'Any special requirements?', required: false, order: 5 },
    ],
  },
  {
    id: 'nps-survey',
    name: 'NPS Survey',
    description: 'Measure customer satisfaction with Net Promoter Score',
    category: 'Feedback',
    popular: true,
    fields: [
      { id: 'email', type: 'email', label: 'Email Address (Optional)', placeholder: 'john@example.com', required: false, order: 0 },
      { id: 'nps_score', type: 'scale', label: 'How likely are you to recommend us to a friend? (0 = Not at all, 10 = Extremely likely)', required: true, order: 1 },
      { id: 'feedback', type: 'textarea', label: 'What\'s the main reason for your score?', placeholder: 'Tell us more...', required: false, order: 2 },
    ],
  },
  {
    id: 'newsletter-signup',
    name: 'Newsletter Signup',
    description: 'Simple email capture for newsletter subscriptions',
    category: 'Marketing',
    popular: false,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, order: 1 },
      { id: 'interests', type: 'checkbox', label: 'Interests', required: false, order: 2, options: ['Dental Tips', 'Special Offers', 'New Services', 'Health & Wellness'] },
    ],
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Register attendees for events, webinars, or workshops',
    category: 'Events',
    popular: false,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, order: 1 },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', required: false, order: 2 },
      { id: 'company', type: 'text', label: 'Company/Organization', placeholder: 'Acme Corp', required: false, order: 3 },
      { id: 'attendees', type: 'select', label: 'Number of Attendees', required: true, order: 4, options: ['1', '2', '3', '4', '5+'] },
      { id: 'dietary', type: 'textarea', label: 'Dietary Requirements', placeholder: 'Any allergies or special dietary needs?', required: false, order: 5 },
    ],
  },
  {
    id: 'quote-request',
    name: 'Free Quote Request',
    description: 'Get pricing inquiries from potential customers',
    category: 'Sales',
    popular: true,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, order: 1 },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', required: true, order: 2 },
      { id: 'service', type: 'select', label: 'Service Interested In', required: true, order: 3, options: ['Dental Implants', 'Veneers', 'Teeth Whitening', 'Braces', 'Full Mouth Restoration', 'Other'] },
      { id: 'budget', type: 'select', label: 'Approximate Budget', required: false, order: 4, options: ['Under $1,000', '$1,000 - $5,000', '$5,000 - $10,000', '$10,000+', 'Not Sure'] },
      { id: 'timeline', type: 'select', label: 'Desired Timeline', required: false, order: 5, options: ['ASAP', 'Within 1 month', 'Within 3 months', 'Within 6 months', 'Just exploring'] },
      { id: 'details', type: 'textarea', label: 'Additional Details', placeholder: 'Tell us more about your needs...', required: false, order: 6 },
    ],
  },
  {
    id: 'feedback-survey',
    name: 'Feedback Survey',
    description: 'Collect detailed customer feedback',
    category: 'Feedback',
    popular: false,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name (Optional)', placeholder: 'John Doe', required: false, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address (Optional)', placeholder: 'john@example.com', required: false, order: 1 },
      { id: 'rating', type: 'rating', label: 'Overall Experience', required: true, order: 2 },
      { id: 'service_quality', type: 'select', label: 'Service Quality', required: true, order: 3, options: ['Excellent', 'Good', 'Fair', 'Poor'] },
      { id: 'staff_friendliness', type: 'select', label: 'Staff Friendliness', required: true, order: 4, options: ['Excellent', 'Good', 'Fair', 'Poor'] },
      { id: 'cleanliness', type: 'select', label: 'Cleanliness', required: true, order: 5, options: ['Excellent', 'Good', 'Fair', 'Poor'] },
      { id: 'comments', type: 'textarea', label: 'Additional Comments', placeholder: 'Tell us more...', required: false, order: 6 },
    ],
  },
  {
    id: 'appointment-request',
    name: 'Appointment Request',
    description: 'Simple appointment booking form',
    category: 'Appointments',
    popular: false,
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true, order: 0 },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, order: 1 },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', required: true, order: 2 },
      { id: 'appointment_type', type: 'select', label: 'Appointment Type', required: true, order: 3, options: ['New Patient', 'Follow-up', 'Emergency', 'Consultation'] },
      { id: 'preferred_date', type: 'date', label: 'Preferred Date', required: true, order: 4 },
      { id: 'preferred_time', type: 'select', label: 'Preferred Time', required: true, order: 5, options: ['Morning (9am-12pm)', 'Afternoon (12pm-3pm)', 'Evening (3pm-6pm)'] },
    ],
  },
]

export function FormTemplatesModal({
  open,
  onClose,
  onSelectTemplate,
}: FormTemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)

  const categories = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.category)))]

  const filteredTemplates = selectedCategory === 'All' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === selectedCategory)

  const handleUseTemplate = (template: FormTemplate) => {
    onSelectTemplate(template)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close form templates modal"
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-x-20 md:top-20 md:bottom-20 bg-white rounded-lg shadow-2xl z-[60] flex flex-col max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Form Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a template to get started quickly
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTemplate ? (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
                className="mb-4"
              >
                ← Back to templates
              </Button>
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{selectedTemplate.name}</h3>
                      {selectedTemplate.popular && (
                        <Badge className="bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600">{selectedTemplate.description}</p>
                    <Badge variant="outline" className="mt-2">{selectedTemplate.category}</Badge>
                  </div>
                  <Button onClick={() => handleUseTemplate(selectedTemplate)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Fields ({selectedTemplate.fields.length})</h4>
                  <div className="space-y-2">
                    {selectedTemplate.fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <span className="text-sm text-gray-500">#{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium">{field.label}</p>
                          <p className="text-xs text-gray-500 capitalize">{field.type}</p>
                        </div>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedTemplate(template)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select template ${template.name}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    {template.popular && (
                      <Badge className="bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{template.category}</Badge>
                    <span className="text-xs text-gray-500">{template.fields.length} fields</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

