'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Clock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AppointmentTypesManagerProps {
  tenantId: string
}

export function AppointmentTypesManager({ tenantId }: AppointmentTypesManagerProps) {
  const supabase = createClient()
  const [types, setTypes] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    color: '#8B5CF6',
    default_provider_id: '',
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    allow_online_booking: true,
    min_notice_hours: 24,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [typesRes, providersRes] = await Promise.all([
        supabase
          .from('appointment_types')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('name'),
        supabase
          .from('providers')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name'),
      ])

      if (typesRes.error) throw typesRes.error
      if (providersRes.error) throw providersRes.error

      setTypes(typesRes.data || [])
      setProviders(providersRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load appointment types')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        default_provider_id: formData.default_provider_id || null,
      }

      if (editingType) {
        const { error } = await supabase
          .from('appointment_types')
          .update(data)
          .eq('id', editingType.id)

        if (error) throw error
        toast.success('Appointment type updated!')
      } else {
        const { error } = await supabase
          .from('appointment_types')
          .insert([{ ...data, tenant_id: tenantId }])

        if (error) throw error
        toast.success('Appointment type added!')
      }

      setDialogOpen(false)
      setEditingType(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving appointment type:', error)
      toast.error('Failed to save appointment type')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appointment type?')) return

    try {
      const { error } = await supabase
        .from('appointment_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Appointment type deleted')
      loadData()
    } catch (error) {
      console.error('Error deleting appointment type:', error)
      toast.error('Failed to delete appointment type')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 60,
      color: '#8B5CF6',
      default_provider_id: '',
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      allow_online_booking: true,
      min_notice_hours: 24,
      is_active: true,
    })
  }

  const openEditDialog = (type: any) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      description: type.description || '',
      duration_minutes: type.duration_minutes,
      color: type.color || '#8B5CF6',
      default_provider_id: type.default_provider_id || '',
      buffer_before_minutes: type.buffer_before_minutes || 0,
      buffer_after_minutes: type.buffer_after_minutes || 0,
      allow_online_booking: type.allow_online_booking,
      min_notice_hours: type.min_notice_hours || 24,
      is_active: type.is_active,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointment Types</CardTitle>
            <CardDescription>
              Define appointment templates (Consultation, Hygiene, Surgery, etc.)
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setEditingType(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : types.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No appointment types configured</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {types.map((type) => (
                <Card key={type.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-lg">{type.name}</div>
                            <Badge variant="secondary">{type.duration_minutes} min</Badge>
                            {!type.is_active && <Badge>Inactive</Badge>}
                            {type.allow_online_booking && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Online Booking
                              </Badge>
                            )}
                          </div>
                          {type.description && (
                            <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-600">
                            {type.buffer_before_minutes > 0 && (
                              <span>Buffer before: {type.buffer_before_minutes} min</span>
                            )}
                            {type.buffer_after_minutes > 0 && (
                              <span>Buffer after: {type.buffer_after_minutes} min</span>
                            )}
                            {type.min_notice_hours && (
                              <span>Min notice: {type.min_notice_hours}h</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(type)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Appointment Type' : 'Add Appointment Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Consultation, Hygiene, Implant Surgery"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this appointment type"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  required
                  min="15"
                  step="15"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Default Provider</Label>
              <Select
                value={formData.default_provider_id}
                onValueChange={(value) => setFormData({ ...formData, default_provider_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default provider..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No default</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Buffer Before (minutes)</Label>
                <Input
                  type="number"
                  value={formData.buffer_before_minutes}
                  onChange={(e) => setFormData({ ...formData, buffer_before_minutes: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="5"
                />
              </div>
              <div>
                <Label>Buffer After (minutes)</Label>
                <Input
                  type="number"
                  value={formData.buffer_after_minutes}
                  onChange={(e) => setFormData({ ...formData, buffer_after_minutes: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="5"
                />
              </div>
            </div>
            <div>
              <Label>Minimum Notice (hours)</Label>
              <Input
                type="number"
                value={formData.min_notice_hours}
                onChange={(e) => setFormData({ ...formData, min_notice_hours: parseInt(e.target.value) || 24 })}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allow_online_booking"
                  checked={formData.allow_online_booking}
                  onChange={(e) => setFormData({ ...formData, allow_online_booking: e.target.checked })}
                />
                <Label htmlFor="allow_online_booking">Allow online booking</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingType ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

