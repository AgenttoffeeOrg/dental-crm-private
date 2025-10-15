'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Search, ArrowRight } from 'lucide-react'
import { FORM_TEMPLATES, type FormTemplate } from '@/lib/forms/templates'
import { useMarketingForms } from '@/hooks/use-marketing-forms'
import { toast } from 'sonner'

export default function FormTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { createForm } = useMarketingForms()
  const router = useRouter()

  const filteredTemplates = FORM_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'lead_gen', label: 'Lead Generation' },
    { value: 'patient_intake', label: 'Patient Intake' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'event', label: 'Events' },
    { value: 'referral', label: 'Referrals' },
  ]

  const handleUseTemplate = async (template: FormTemplate) => {
    const newForm = await createForm({
      name: template.name,
      description: template.description,
      status: 'draft',
      fields_json: template.fields as any,
      button_text: 'Submit',
      success_message: template.recommendedSettings.successMessage,
      auto_add_tags: template.recommendedSettings.autoAddTags,
      enable_recaptcha: template.recommendedSettings.enableRecaptcha,
      enable_honeypot: template.recommendedSettings.enableHoneypot,
    })

    if (newForm) {
      toast.success(`Created form from template: ${template.name}`)
      router.push('/forms')
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-6">
          <Breadcrumbs
            items={[
              { label: 'Forms', href: '/forms' },
              { label: 'Templates' },
            ]}
          />

          <PageHeader
            title="Form Templates"
            description="Start with a professional template and customize to your needs"
            icon={FileText}
          />

          {/* Search & Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-4xl">{template.icon}</div>
                    <Badge variant="outline" className="capitalize">
                      {template.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fields:</span>
                      <span className="font-medium">{template.fields.length} questions</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Spam Protection:</span>
                      <span className="font-medium">
                        {template.recommendedSettings.enableRecaptcha ? 'reCAPTCHA' : 'Honeypot'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => handleUseTemplate(template)}
                      className="w-full"
                    >
                      Use This Template
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-gray-500">No templates found matching your search</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

