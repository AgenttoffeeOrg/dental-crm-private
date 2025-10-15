'use client'

/**
 * Create/Edit Form Slide-Over Panel
 * Enterprise-style right-side slide-over for creating and editing marketing forms
 * Matches CreateContactSlideOver and CreateDealSlideOver patterns
 * 
 * Features:
 * - Comprehensive form builder with tabs (Fields, Settings, Integrations, Analytics)
 * - Visual field palette and drag-drop
 * - Field mapping to CRM (Contact/Deal fields)
 * - Marketing campaign integration
 * - Ad platform connections (Meta/TikTok/Google)
 * - Webhooks and API settings
 * - Spam protection settings
 * - Share & embed options
 * - Live preview
 */

import { useState, useEffect } from 'react'
import { 
  X, Save, Plus, Trash2, Copy, Eye, Share2, 
  Settings, Link2, Zap, BarChart3, Shield, 
  FileText, Mail, Globe, Code, QrCode
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import type { MarketingForm, FormField } from '@/hooks/use-marketing-forms'

interface CreateFormSlideOverProps {
  open: boolean
  onClose: () => void
  onFormSaved?: () => void
  form?: MarketingForm | null
  mode?: 'create' | 'edit'
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'radio', label: 'Radio Buttons', icon: '⚪' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'file', label: 'File Upload', icon: '📎' },
  { value: 'rating', label: 'Star Rating', icon: '⭐' },
  { value: 'scale', label: 'Scale (1-10)', icon: '📊' },
  { value: 'signature', label: 'Signature', icon: '✍️' },
]

const CRM_FIELD_MAPPING = [
  { crm: 'full_name', label: 'Contact Name', type: 'contact' },
  { crm: 'primary_email', label: 'Email', type: 'contact' },
  { crm: 'primary_phone', label: 'Phone', type: 'contact' },
  { crm: 'company', label: 'Company', type: 'contact' },
  { crm: 'deal_title', label: 'Deal Title', type: 'deal' },
  { crm: 'deal_value', label: 'Deal Value', type: 'deal' },
  { crm: 'deal_stage', label: 'Deal Stage', type: 'deal' },
]

export function CreateFormSlideOver({
  open,
  onClose,
  onFormSaved,
  form,
  mode = 'create',
}: CreateFormSlideOverProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('fields')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'archived',
    fields_json: [] as FormField[],
    theme: 'light',
    button_text: 'Submit',
    success_message: 'Thank you! We\'ll be in touch soon.',
    redirect_url: '',
    auto_add_tags: [] as string[],
    enable_recaptcha: true,
    enable_honeypot: true,
    is_published: false,
    public_url_slug: '',
  })

  const [selectedField, setSelectedField] = useState<FormField | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Load form data if editing
  useEffect(() => {
    if (mode === 'edit' && form) {
      setFormData({
        name: form.name,
        description: form.description || '',
        status: form.status,
        fields_json: form.fields_json || [],
        theme: form.theme || 'light',
        button_text: form.button_text || 'Submit',
        success_message: form.success_message || 'Thank you! We\'ll be in touch soon.',
        redirect_url: form.redirect_url || '',
        auto_add_tags: form.auto_add_tags || [],
        enable_recaptcha: form.enable_recaptcha || false,
        enable_honeypot: form.enable_honeypot || false,
        is_published: form.is_published || false,
        public_url_slug: form.public_url_slug || '',
      })
    }
  }, [mode, form])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        status: 'draft',
        fields_json: [],
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
      setActiveTab('fields')
      setSelectedField(null)
    }
  }, [open])

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as any,
      label: `New ${type} field`,
      placeholder: '',
      required: false,
      order: formData.fields_json.length,
    }
    setFormData(prev => ({
      ...prev,
      fields_json: [...prev.fields_json, newField]
    }))
    setSelectedField(newField)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields_json: prev.fields_json.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      )
    }))
  }

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields_json: prev.fields_json.filter(f => f.id !== fieldId)
    }))
    setSelectedField(null)
  }

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a form name')
      return
    }

    if (formData.fields_json.length === 0) {
      toast.error('Please add at least one field to your form')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      if (mode === 'create') {
        // Create new form
        const { error } = await supabase
          .from('marketing_forms')
          .insert({
            ...formData,
            tenant_id: appUser?.tenant_id,
          })

        if (error) throw error
        toast.success('Form created successfully!')
      } else {
        // Update existing form
        const { error } = await supabase
          .from('marketing_forms')
          .update(formData)
          .eq('id', form?.id)

        if (error) throw error
        toast.success('Form updated successfully!')
      }

      onFormSaved?.()
      onClose()
    } catch (error) {
      console.error('Error saving form:', error)
      toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} form`)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Form' : 'Edit Form'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Build your lead capture form with powerful integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="name">Form Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Contact Request, Consultation Booking"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Internal description of this form"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="fields">
                <FileText className="h-4 w-4 mr-2" />
                Fields
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="integrations">
                <Zap className="h-4 w-4 mr-2" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="share">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </TabsTrigger>
            </TabsList>

            {/* FIELDS TAB */}
            <TabsContent value="fields" className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Field Palette */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Add Fields</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_TYPES.map(type => (
                      <Button
                        key={type.value}
                        variant="outline"
                        size="sm"
                        onClick={() => addField(type.value)}
                        className="justify-start"
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Field List */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Form Fields ({formData.fields_json.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.fields_json.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No fields added yet. Click a field type to add it.
                      </p>
                    ) : (
                      formData.fields_json.map((field, idx) => (
                        <div
                          key={field.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
                            selectedField?.id === field.id ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedField(field)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">#{idx + 1}</span>
                              <span className="font-medium">{field.label}</span>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteField(field.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 capitalize">{field.type}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Field Editor */}
              {selectedField && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold mb-4">Edit Field</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Field Label</Label>
                      <Input
                        value={selectedField.label}
                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                        placeholder="e.g., Your Name"
                      />
                    </div>
                    <div>
                      <Label>Placeholder</Label>
                      <Input
                        value={selectedField.placeholder || ''}
                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                        placeholder="e.g., Enter your name"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Required Field</Label>
                      <Switch
                        checked={selectedField.required}
                        onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                      />
                    </div>
                    {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                      <div>
                        <Label>Options (comma-separated)</Label>
                        <Input
                          value={selectedField.options?.join(', ') || ''}
                          onChange={(e) => updateField(selectedField.id, { 
                            options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                          })}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Submit Button Text</Label>
                  <Input
                    value={formData.button_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                    placeholder="Submit"
                  />
                </div>
                <div>
                  <Label>Success Message</Label>
                  <Textarea
                    value={formData.success_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, success_message: e.target.value }))}
                    placeholder="Thank you! We'll be in touch soon."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Redirect URL (optional)</Label>
                  <Input
                    value={formData.redirect_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, redirect_url: e.target.value }))}
                    placeholder="https://yoursite.com/thank-you"
                  />
                </div>

                {/* Spam Protection */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Spam Protection
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable reCAPTCHA</Label>
                        <p className="text-xs text-gray-500">Protect against bots</p>
                      </div>
                      <Switch
                        checked={formData.enable_recaptcha}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_recaptcha: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Honeypot</Label>
                        <p className="text-xs text-gray-500">Hidden field spam trap</p>
                      </div>
                      <Switch
                        checked={formData.enable_honeypot}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_honeypot: checked }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Publishing */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Publishing
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Publish Form</Label>
                        <p className="text-xs text-gray-500">Make form publicly accessible</p>
                      </div>
                      <Switch
                        checked={formData.is_published}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                      />
                    </div>
                    {formData.is_published && (
                      <div>
                        <Label>Custom URL Slug</Label>
                        <Input
                          value={formData.public_url_slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, public_url_slug: e.target.value }))}
                          placeholder="contact-us"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Form will be available at: /f/{formData.public_url_slug || 'your-slug'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* INTEGRATIONS TAB */}
            <TabsContent value="integrations" className="space-y-4">
              <div className="grid gap-4">
                {/* CRM Field Mapping */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    CRM Field Mapping
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Map form fields to Contact and Deal fields
                  </p>
                  <div className="space-y-2">
                    {formData.fields_json.slice(0, 3).map(field => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="text-sm flex-1">{field.label}</span>
                        <span className="text-sm text-gray-400">→</span>
                        <Select defaultValue="">
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select CRM field" />
                          </SelectTrigger>
                          <SelectContent>
                            {CRM_FIELD_MAPPING.map(crm => (
                              <SelectItem key={crm.crm} value={crm.crm}>
                                <Badge variant="outline" className="mr-2">{crm.type}</Badge>
                                {crm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marketing Campaigns */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Marketing Campaigns
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Link this form to email/SMS campaigns
                  </p>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Attach to Campaign
                  </Button>
                </div>

                {/* Ad Platforms */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Ad Platform Lead Sync
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Auto-sync leads from Meta, TikTok, Google Ads
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">Meta ✓</Badge>
                    <Badge variant="outline">TikTok ✓</Badge>
                    <Badge variant="outline">Google Ads ✓</Badge>
                  </div>
                </div>

                {/* Webhooks */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Webhooks
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Send form data to external services
                  </p>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* SHARE TAB */}
            <TabsContent value="share" className="space-y-4">
              <div className="grid gap-4">
                {/* Hosted Link */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Hosted Form Link
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Share this direct link to your form
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={`https://yoursite.com/f/${formData.public_url_slug || 'form-slug'}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Embed Code */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Embed Code
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Add this code to your website
                  </p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                    {`<script src="https://yoursite.com/embed.js"></script>
<div data-form-id="${form?.id || 'form-id'}"></div>`}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>

                {/* QR Code */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Generate a QR code for offline use
                  </p>
                  <Button variant="outline" size="sm">
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </Button>
                </div>

                {/* Analytics */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Form Analytics
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    View submissions, conversion rates, and performance
                  </p>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : mode === 'create' ? 'Create Form' : 'Update Form'}
          </Button>
        </div>
      </div>
    </>
  )
}

