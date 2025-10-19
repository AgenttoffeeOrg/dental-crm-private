/**
 * =====================================================
 * TREATMENT TAGS SETTINGS - TAG MANAGEMENT UI
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 4 - Settings UI
 * =====================================================
 * 
 * PURPOSE:
 * Complete UI for managing treatment tags (create, edit, delete, bulk operations)
 * 
 * FEATURES:
 * - CRUD operations for treatment tags
 * - Visual tag customization (color, icon)
 * - Keyword management (multi-input with chips)
 * - Location-specific vs organization-wide tags
 * - Tag statistics (usage count, conversion rate)
 * - Search and filter
 * - Bulk import/export (CSV)
 * - Predefined tag suggestions
 * - Permission-based access control
 * - Real-time validation
 * 
 * USAGE:
 * ```typescript
 * <TreatmentTagsSettings tenantId={tenantId} />
 * ```
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { handleDatabaseError, checkTableExists } from '@/lib/treatment-routing/migration-checker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  Sparkles,
  TrendingUp,
  X,
  AlertCircle,
  CheckCircle,
  Building,
  MapPin
} from 'lucide-react'
import { invalidateRoutingCache } from '@/lib/treatment-routing'
import { BulkImportExport } from './bulk-import-export'

// =====================================================
// TYPES
// =====================================================

interface TreatmentTag {
  id: string
  tenant_id: string
  location_id: string | null
  name: string
  description: string | null
  keywords: string[]
  color: string
  icon: string
  category: string | null
  min_value_cents: number | null
  priority: number
  is_active: boolean
  is_system_tag: boolean
  scope: 'organization' | 'location'
  usage_count: number
  conversion_rate: number | null
  avg_deal_value_cents: number | null
  created_at: string
}

interface Location {
  id: string
  name: string
}

// =====================================================
// PREDEFINED TAG SUGGESTIONS
// =====================================================

const SUGGESTED_TAGS = [
  {
    name: 'Dental Implant',
    keywords: ['implant', 'implants', 'dental implant', 'tooth implant'],
    category: 'high_value',
    color: '#9333ea',
    icon: '🦷',
    min_value_cents: 500000 // £5,000
  },
  {
    name: 'Invisalign',
    keywords: ['invisalign', 'invisible braces', 'clear aligners'],
    category: 'orthodontics',
    color: '#3b82f6',
    icon: '😁',
    min_value_cents: 300000 // £3,000
  },
  {
    name: 'Veneers',
    keywords: ['veneer', 'veneers', 'porcelain veneers', 'composite veneers'],
    category: 'cosmetic',
    color: '#ec4899',
    icon: '✨',
    min_value_cents: 200000 // £2,000
  },
  {
    name: 'Crown',
    keywords: ['crown', 'dental crown', 'cap', 'crown restoration'],
    category: 'general',
    color: '#10b981',
    icon: '👑',
    min_value_cents: 80000 // £800
  },
  {
    name: 'Root Canal',
    keywords: ['root canal', 'endodontic', 'root treatment'],
    category: 'general',
    color: '#f59e0b',
    icon: '🔧',
    min_value_cents: 60000 // £600
  },
  {
    name: 'Emergency',
    keywords: ['emergency', 'urgent', 'same day', 'pain', 'trauma'],
    category: 'emergency',
    color: '#ef4444',
    icon: '🚨',
    min_value_cents: null
  },
  {
    name: 'Whitening',
    keywords: ['whitening', 'bleaching', 'teeth whitening', 'smile whitening'],
    category: 'cosmetic',
    color: '#06b6d4',
    icon: '🌟',
    min_value_cents: 30000 // £300
  },
  {
    name: 'Braces',
    keywords: ['braces', 'orthodontic braces', 'metal braces', 'traditional braces'],
    category: 'orthodontics',
    color: '#8b5cf6',
    icon: '🎯',
    min_value_cents: 250000 // £2,500
  }
]

const COLOR_OPTIONS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#10b981', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#9333ea', label: 'Violet' },
  { value: '#6b7280', label: 'Gray' }
]

const ICON_OPTIONS = ['🦷', '😁', '✨', '👑', '🔧', '🚨', '🌟', '🎯', '💎', '⭐', '🏥', '🩺', '💊', '🔬', '🎨']

const CATEGORY_OPTIONS = [
  { value: 'high_value', label: 'High-Value' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'orthodontics', label: 'Orthodontics' },
  { value: 'general', label: 'General' },
  { value: 'custom', label: 'Custom' }
]

// =====================================================
// CREATE/EDIT TAG DIALOG
// =====================================================

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: TreatmentTag | null
  tenantId: string
  locations: Location[]
  onSaved: () => void
}

function TagDialog({ open, onOpenChange, tag, tenantId, locations, onSaved }: TagDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [icon, setIcon] = useState('🦷')
  const [category, setCategory] = useState<string>('general')
  const [minValue, setMinValue] = useState('')
  const [priority, setPriority] = useState('50')
  const [scope, setScope] = useState<'organization' | 'location'>('organization')
  const [locationId, setLocationId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  // Populate form when editing
  useEffect(() => {
    if (tag) {
      setName(tag.name)
      setDescription(tag.description || '')
      setKeywords(tag.keywords)
      setColor(tag.color)
      setIcon(tag.icon)
      setCategory(tag.category || 'general')
      setMinValue(tag.min_value_cents ? (tag.min_value_cents / 100).toString() : '')
      setPriority(tag.priority.toString())
      setScope(tag.scope)
      setLocationId(tag.location_id || '')
    } else {
      // Reset for new tag
      setName('')
      setDescription('')
      setKeywords([])
      setKeywordInput('')
      setColor('#3b82f6')
      setIcon('🦷')
      setCategory('general')
      setMinValue('')
      setPriority('50')
      setScope('organization')
      setLocationId('')
    }
  }, [tag, open])

  const addKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword))
  }

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Tag name is required')
      return
    }

    if (keywords.length === 0) {
      toast.error('At least one keyword is required')
      return
    }

    if (scope === 'location' && !locationId) {
      toast.error('Please select a location')
      return
    }

    try {
      setSaving(true)

      const tagData = {
        tenant_id: tenantId,
        location_id: scope === 'location' ? locationId : null,
        name: name.trim(),
        description: description.trim() || null,
        keywords,
        color,
        icon,
        category,
        min_value_cents: minValue ? Math.round(parseFloat(minValue) * 100) : null,
        priority: parseInt(priority),
        scope,
        is_active: true,
        updated_at: new Date().toISOString()
      }

      let error

      if (tag) {
        // Update existing tag
        const result = await supabase
          .from('treatment_tags')
          .update(tagData)
          .eq('id', tag.id)
        error = result.error
      } else {
        // Create new tag
        const result = await supabase
          .from('treatment_tags')
          .insert(tagData)
        error = result.error
      }

      if (error) throw error

      // Clear cache so routing engine picks up changes
      invalidateRoutingCache(tenantId)

      toast.success(tag ? 'Tag updated successfully' : 'Tag created successfully')
      onSaved()
      onOpenChange(false)
    } catch (error) {
      const errorInfo = handleDatabaseError(error, 'SaveTag')
      console.error('Error saving tag:', error)
      
      if (errorInfo.isTableMissing) {
        toast.error('Treatment routing system is not yet set up. Please contact your administrator.')
      } else {
        toast.error(errorInfo.userMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const loadSuggestedTag = (suggested: typeof SUGGESTED_TAGS[0]) => {
    setName(suggested.name)
    setKeywords(suggested.keywords)
    setCategory(suggested.category)
    setColor(suggested.color)
    setIcon(suggested.icon)
    setMinValue(suggested.min_value_cents ? (suggested.min_value_cents / 100).toString() : '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tag ? 'Edit Treatment Tag' : 'Create Treatment Tag'}</DialogTitle>
          <DialogDescription>
            {tag 
              ? 'Update the treatment tag details and keywords for intelligent routing.'
              : 'Create a new treatment tag to automatically route deals to the correct pipeline.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Suggested Tags (only for new tags) */}
          {!tag && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Quick Start: Use a Template
              </Label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.map(suggested => (
                  <Button
                    key={suggested.name}
                    variant="outline"
                    size="sm"
                    onClick={() => loadSuggestedTag(suggested)}
                    className="text-xs"
                  >
                    {suggested.icon} {suggested.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Tag Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Tag Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dental Implant"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for your team..."
              rows={2}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>
              Keywords <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-600">
              Add keywords that will trigger this tag (press Enter to add)
            </p>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addKeyword()
                  }
                }}
                placeholder="e.g., implant"
              />
              <Button onClick={addKeyword} type="button">
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Visual Customization */}
          <div className="grid grid-cols-2 gap-4">
            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                    <span>{COLOR_OPTIONS.find(c => c.value === color)?.label}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: option.value }} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <span className="text-xl">{icon}</span>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(emoji => (
                    <SelectItem key={emoji} value={emoji}>
                      <span className="text-xl">{emoji}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min Value & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minValue">Min Deal Value (£)</Label>
              <Input
                id="minValue"
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="e.g., 1000"
                min="0"
                step="100"
              />
              <p className="text-xs text-gray-600">Only route deals ≥ this value</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (0-100)</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-600">Higher = checked first</p>
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v: 'organization' | 'location') => setScope(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Organization-wide (all locations)
                  </div>
                </SelectItem>
                <SelectItem value="location">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location-specific
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Selector (if scope is location) */}
          {scope === 'location' && (
            <div className="space-y-2">
              <Label>
                Location <span className="text-red-500">*</span>
              </Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : tag ? 'Update Tag' : 'Create Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// DELETE TAG CONFIRMATION
// =====================================================

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: TreatmentTag | null
  onConfirm: () => void
}

function DeleteDialog({ open, onOpenChange, tag, onConfirm }: DeleteDialogProps) {
  const hasUsage = tag && tag.usage_count > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Treatment Tag?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the tag <strong>&quot;{tag?.name}&quot;</strong>?
            
            {hasUsage && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">This tag is in use!</p>
                    <p className="text-orange-700 mt-1">
                      This tag is used by {tag.usage_count} deal{tag.usage_count > 1 ? 's' : ''}. 
                      Deleting it won&apos;t affect existing deals, but new deals won&apos;t be able to use this tag.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="mt-3 text-sm">
              This action cannot be undone. Pipeline mappings using this tag will also be removed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Tag
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function TreatmentTagsSettings({ tenantId }: { tenantId: string }) {
  const [tags, setTags] = useState<TreatmentTag[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterScope, setFilterScope] = useState<'all' | 'organization' | 'location'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TreatmentTag | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTag, setDeletingTag] = useState<TreatmentTag | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadTags()
    loadLocations()
  }, [tenantId])

  const loadTags = async () => {
    try {
      setLoading(true)

      // Check if table exists first
      const tableExists = await checkTableExists('treatment_tags')
      if (!tableExists) {
        console.warn('[TreatmentTags] Database tables not yet created. Migrations need to be run.')
        setTags([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('treatment_tags')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: false })

      if (error) throw error

      setTags(data || [])
    } catch (error) {
      const errorInfo = handleDatabaseError(error, 'LoadTags')
      console.error('Error loading tags:', error)
      
      if (errorInfo.isTableMissing) {
        toast.info('Treatment routing system is not yet set up. Database migrations need to be run.')
        setTags([])
      } else {
        toast.error(errorInfo.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_locations')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      if (error) throw error

      setLocations(data || [])
    } catch (error) {
      // Silently handle missing practice_locations table
      // This table is optional and created by a separate migration
      console.info('[Treatment Tags] practice_locations table not available - multi-location features disabled')
      setLocations([])
    }
  }

  const handleDelete = async () => {
    if (!deletingTag) return

    try {
      const { error } = await supabase
        .from('treatment_tags')
        .delete()
        .eq('id', deletingTag.id)

      if (error) throw error

      // Clear cache
      invalidateRoutingCache(tenantId)

      toast.success('Tag deleted successfully')
      loadTags()
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('Failed to delete tag')
    } finally {
      setDeleteDialogOpen(false)
      setDeletingTag(null)
    }
  }

  // Filter tags
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.keywords.some(k => k.includes(searchQuery.toLowerCase()))
    
    const matchesScope = filterScope === 'all' || tag.scope === filterScope

    return matchesSearch && matchesScope
  })

  // Statistics
  const totalTags = tags.length
  const activeTags = tags.filter(t => t.is_active).length
  const totalUsage = tags.reduce((sum, t) => sum + t.usage_count, 0)
  const avgConversion = tags.filter(t => t.conversion_rate !== null).length > 0
    ? tags.reduce((sum, t) => sum + (t.conversion_rate || 0), 0) / tags.filter(t => t.conversion_rate !== null).length
    : 0

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tags</p>
                <p className="text-2xl font-bold">{totalTags}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tags</p>
                <p className="text-2xl font-bold">{activeTags}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Conversion</p>
                <p className="text-2xl font-bold">{avgConversion.toFixed(1)}%</p>
              </div>
              <Sparkles className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Treatment Tags</CardTitle>
              <CardDescription>
                Manage treatment tags for automatic deal routing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                setEditingTag(null)
                setDialogOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Bulk Import/Export */}
          <BulkImportExport tenantId={tenantId} onImportComplete={loadTags} />

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tags or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterScope} onValueChange={(v: any) => setFilterScope(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                <SelectItem value="organization">Organization-wide</SelectItem>
                <SelectItem value="location">Location-specific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading tags...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No tags found matching your search' : 'No treatment tags yet'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Tag
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTags.map(tag => (
                <Card key={tag.id} className="relative">
                  <CardContent className="pt-6">
                    {/* Tag Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                          style={{ backgroundColor: tag.color + '20' }}
                        >
                          {tag.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{tag.name}</h3>
                          {tag.category && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {CATEGORY_OPTIONS.find(c => c.value === tag.category)?.label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {tag.scope === 'location' && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          Location
                        </Badge>
                      )}
                    </div>

                    {/* Keywords */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-1">Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {tag.keywords.slice(0, 3).map(keyword => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {tag.keywords.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{tag.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Usage</p>
                        <p className="font-semibold">{tag.usage_count} deals</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Conversion</p>
                        <p className="font-semibold">
                          {tag.conversion_rate !== null ? `${tag.conversion_rate.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingTag(tag)
                          setDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                      {!tag.is_system_tag && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            setDeletingTag(tag)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tag={editingTag}
        tenantId={tenantId}
        locations={locations}
        onSaved={loadTags}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tag={deletingTag}
        onConfirm={handleDelete}
      />
    </div>
  )
}

