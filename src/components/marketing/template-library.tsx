'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { 
  Mail, 
  MessageSquare, 
  Phone,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  Star,
  Eye,
  Layout,
  Sparkles,
  Plus,
  TrendingUp,
  Calendar,
  Folder,
  FolderOpen
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface Template {
  id: string
  name: string
  channel: 'email' | 'sms' | 'whatsapp'
  category: string
  subject_line: string | null
  content_html: string
  content_text: string | null
  is_favorite: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'All Templates', icon: Layout },
  { value: 'welcome', label: 'Welcome', icon: Sparkles },
  { value: 'reminder', label: 'Reminders', icon: Calendar },
  { value: 'promotion', label: 'Promotions', icon: TrendingUp },
  { value: 'newsletter', label: 'Newsletters', icon: Mail },
  { value: 'transactional', label: 'Transactional', icon: MessageSquare },
]

export function TemplateLibrary() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const supabase = createClient()
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'

      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('usage_count', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('[TEMPLATES] Error loading:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (template: Template) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('marketing_templates')
        .update({ is_favorite: !template.is_favorite })
        .eq('id', template.id)

      if (error) throw error
      toast.success(template.is_favorite ? 'Removed from favorites' : 'Added to favorites')
      loadTemplates()
    } catch (error) {
      console.error('[TEMPLATES] Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const handleDuplicate = async (template: Template) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('marketing_templates')
        .insert({
          ...template,
          id: undefined,
          name: `${template.name} (Copy)`,
          usage_count: 0,
          is_favorite: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Template duplicated!')
      loadTemplates()
    } catch (error) {
      console.error('[TEMPLATES] Error duplicating:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const supabase = createClient()
      const { error} = await supabase
        .from('marketing_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      toast.success('Template deleted')
      loadTemplates()
    } catch (error) {
      console.error('[TEMPLATES] Error deleting:', error)
      toast.error('Failed to delete template')
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesChannel = selectedChannel === 'all' || template.channel === selectedChannel
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesFavorites = !showFavoritesOnly || template.is_favorite
    return matchesSearch && matchesChannel && matchesCategory && matchesFavorites
  })

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'whatsapp': return <Phone className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'sms': return 'bg-green-100 text-green-700 border-green-200'
      case 'whatsapp': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters & Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>

          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="gap-2"
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-white' : ''}`} />
            Favorites
          </Button>
        </div>
      </div>

      {/* Channel Tabs */}
      <Tabs value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="all">
            <Layout className="h-4 w-4 mr-2" />
            All
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Phone className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedChannel} className="mt-6">
          {/* Category Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {TEMPLATE_CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className="shrink-0"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.label}
                </Button>
              )
            })}
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layout className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {searchQuery || selectedCategory !== 'all' || showFavoritesOnly
                    ? 'Try adjusting your filters'
                    : 'Create your first template to get started'}
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-all group relative overflow-hidden">
                  {/* Preview Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-50" />
                  
                  <CardContent className="p-6 relative">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${getChannelColor(template.channel)}`}>
                            {getChannelIcon(template.channel)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{template.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFavorite(template)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Star className={`h-4 w-4 ${template.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 min-h-[120px] max-h-[120px] overflow-hidden">
                        {template.channel === 'email' && template.subject_line && (
                          <div className="mb-2 pb-2 border-b border-gray-200">
                            <p className="text-xs text-gray-500">Subject:</p>
                            <p className="font-semibold text-sm line-clamp-1">{template.subject_line}</p>
                          </div>
                        )}
                        <div className="text-xs text-gray-600 line-clamp-3">
                          {template.content_text || template.content_html?.replace(/<[^>]*>/g, '') || 'No preview available'}
                        </div>
                      </div>

                      {/* Footer Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {template.usage_count} uses
                          </span>
                        </div>
                        <span>
                          {new Date(template.updated_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Quick Use Button */}
                      <Button className="w-full" variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}



