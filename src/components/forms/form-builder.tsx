'use client'

/**
 * Form Builder - Main Component
 * Enterprise-grade form management with beautiful UI
 * 
 * Features:
 * - Beautiful card grid with stats and quick actions
 * - Right-side slide-over for create/edit (matches CRM pattern)
 * - Visual status indicators and badges
 * - Quick access to analytics, submissions, sharing
 * - Integration badges
 * - Templates library
 */

import { useState } from 'react'
import { useMarketingForms, type MarketingForm } from '@/hooks/use-marketing-forms'
import { CreateFormSlideOver } from '@/components/forms/create-form-slide-over'
import { FormSubmissionsModal } from '@/components/forms/form-submissions-modal'
import { FormTemplatesModal } from '@/components/forms/form-templates-modal'
import { EmbedCodeModal } from '@/components/forms/embed-code-modal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsGearButton } from '@/components/ui/settings-gear-button'
import { 
  Plus, 
  Edit, 
  Eye, 
  Copy, 
  Share2,
  Trash2,
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Link2,
  Globe,
  Zap,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export function FormBuilder() {
  const { forms, loading, deleteForm, duplicateForm, loadForms, createForm } = useMarketingForms()
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<MarketingForm | null>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')

  const handleCreate = () => {
    setSelectedForm(null)
    setMode('create')
    setSlideOverOpen(true)
  }

  const handleSelectTemplate = async (template: any) => {
    // Create form from template
    const newForm = await createForm({
      name: template.name,
      description: template.description,
      status: 'draft',
      fields_json: template.fields,
      theme: 'light',
      button_text: 'Submit',
      success_message: 'Thank you! We\'ll be in touch soon.',
      redirect_url: '',
      auto_add_tags: [],
      enable_recaptcha: true,
      enable_honeypot: true,
      is_published: false,
      public_url_slug: '',
    })

    if (newForm) {
      toast.success('Form created from template!')
      loadForms()
    }
  }

  const handleEdit = (form: MarketingForm) => {
    setSelectedForm(form)
    setMode('edit')
    setSlideOverOpen(true)
  }

  const handleDuplicate = async (form: MarketingForm) => {
    const duplicated = await duplicateForm(form.id)
    if (duplicated) {
      toast.success('Form duplicated successfully!')
    }
  }

  const handleDelete = async (form: MarketingForm) => {
    if (confirm(`Are you sure you want to delete "${form.name}"?`)) {
      const success = await deleteForm(form.id)
      if (success) {
        toast.success('Form deleted successfully!')
      }
    }
  }

  const handleViewSubmissions = (form: MarketingForm) => {
    setSelectedForm(form)
    setSubmissionsModalOpen(true)
  }

  const handleShare = (form: MarketingForm) => {
    setSelectedForm(form)
    setShareModalOpen(true)
  }

  const getStatusBadge = (status: string, isPublished: boolean) => {
    if (isPublished && status === 'active') {
      return <Badge className="bg-green-500">Published</Badge>
    }
    if (status === 'active') {
      return <Badge className="bg-blue-500">Active</Badge>
    }
    if (status === 'draft') {
      return <Badge variant="outline">Draft</Badge>
    }
    return <Badge variant="secondary">Archived</Badge>
  }

  const getConversionRate = (form: MarketingForm) => {
    if (!form.total_views || form.total_views === 0) return 0
    return ((form.total_submissions / form.total_views) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading forms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Forms</h2>
            <SettingsGearButton tab="forms" label="Forms Settings" />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage lead capture forms with powerful integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplatesModalOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" asChild>
            <a href="/forms/templates">
              View All Templates →
            </a>
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Form
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {forms.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Forms</p>
                <p className="text-2xl font-bold">{forms.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">
                  {forms.reduce((sum, f) => sum + (f.total_views || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold">
                  {forms.reduce((sum, f) => sum + (f.total_submissions || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Avg. Conversion</p>
                <p className="text-2xl font-bold">
                  {forms.length > 0
                    ? (
                        forms.reduce((sum, f) => sum + (f.conversion_rate || 0), 0) / forms.length
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Forms Grid */}
      {forms.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first lead capture form and start collecting submissions with powerful integrations
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
              <Button variant="outline" onClick={() => setTemplatesModalOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Templates
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{form.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {form.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(form.status, form.is_published)}
                      <Badge variant="outline" className="text-xs">
                        {form.fields_json?.length || 0} fields
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(form)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(form)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Analytics coming soon!')}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(form)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share & Embed
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(form)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
                  <div>
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-lg font-semibold">{form.total_views?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Submissions</p>
                    <p className="text-lg font-semibold">{form.total_submissions?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conv. Rate</p>
                    <p className="text-lg font-semibold">{getConversionRate(form)}%</p>
                  </div>
                </div>

                {/* Integrations */}
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Active Integrations</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {form.enable_recaptcha && (
                      <Badge variant="secondary" className="text-xs">
                        🛡️ reCAPTCHA
                      </Badge>
                    )}
                    {form.is_published && (
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        Hosted
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      <Link2 className="h-3 w-3 mr-1" />
                      CRM Sync
                    </Badge>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(form)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewSubmissions(form)}
                  >
                    <Users className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toast.info('Analytics coming soon!')}
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare(form)}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slide-Over */}
      <CreateFormSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onFormSaved={() => {
          loadForms()
          setSlideOverOpen(false)
        }}
        form={selectedForm}
        mode={mode}
      />

      {/* Submissions Modal */}
      {selectedForm && (
        <FormSubmissionsModal
          open={submissionsModalOpen}
          onClose={() => setSubmissionsModalOpen(false)}
          form={selectedForm}
        />
      )}

      {/* Templates Modal */}
      <FormTemplatesModal
        open={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Share/Embed Modal */}
      {selectedForm && (
        <EmbedCodeModal
          form={selectedForm}
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  )
}

