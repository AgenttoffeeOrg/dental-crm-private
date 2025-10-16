'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProvidersManagerProps {
  tenantId: string
}

export function ProvidersManager({ tenantId }: ProvidersManagerProps) {
  const supabase = createClient()
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    calendar_color: '#3B82F6',
    is_active: true,
  })

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      if (error) throw error
      setProviders(data || [])
    } catch (error) {
      console.error('Error loading providers:', error)
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProvider) {
        const { error } = await supabase
          .from('providers')
          .update(formData)
          .eq('id', editingProvider.id)

        if (error) throw error
        toast.success('Provider updated!')
      } else {
        const { error } = await supabase
          .from('providers')
          .insert([{ ...formData, tenant_id: tenantId }])

        if (error) throw error
        toast.success('Provider added!')
      }

      setDialogOpen(false)
      setEditingProvider(null)
      resetForm()
      loadProviders()
    } catch (error) {
      console.error('Error saving provider:', error)
      toast.error('Failed to save provider')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this provider? Their appointments will remain but provider will be unassigned.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Provider deleted')
      loadProviders()
    } catch (error) {
      console.error('Error deleting provider:', error)
      toast.error('Failed to delete provider')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      calendar_color: '#3B82F6',
      is_active: true,
    })
  }

  const openEditDialog = (provider: any) => {
    setEditingProvider(provider)
    setFormData({
      name: provider.name,
      email: provider.email || '',
      phone: provider.phone || '',
      specialty: provider.specialty || '',
      calendar_color: provider.calendar_color || '#3B82F6',
      is_active: provider.is_active,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Providers</CardTitle>
            <CardDescription>
              Manage healthcare providers (dentists, hygienists, specialists)
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setEditingProvider(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No providers configured</p>
              <p className="text-sm">Add your first provider to start scheduling</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <Card key={provider.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: provider.calendar_color }}
                        />
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {provider.name}
                            {!provider.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          {provider.specialty && (
                            <div className="text-sm text-gray-600">{provider.specialty}</div>
                          )}
                          {provider.email && (
                            <div className="text-sm text-gray-500">{provider.email}</div>
                          )}
                          {provider.phone && (
                            <div className="text-sm text-gray-500">{provider.phone}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(provider)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(provider.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="e.g., General Dentist, Orthodontist, Hygienist"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Calendar Color</Label>
              <Input
                type="color"
                value={formData.calendar_color}
                onChange={(e) => setFormData({ ...formData, calendar_color: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Active (show in calendar)</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProvider ? 'Update' : 'Add'} Provider
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

