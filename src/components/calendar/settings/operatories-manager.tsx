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
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'

interface OperatoriesManagerProps {
  tenantId: string
}

export function OperatoriesManager({ tenantId }: OperatoriesManagerProps) {
  const supabase = createClient()
  const [operatories, setOperatories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOperatory, setEditingOperatory] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    operatory_number: '',
    equipment_type: '',
    color: '#10B981',
    is_active: true,
  })

  useEffect(() => {
    loadOperatories()
  }, [])

  const loadOperatories = async () => {
    try {
      const { data, error } = await supabase
        .from('operatories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('operatory_number')

      if (error) throw error
      setOperatories(data || [])
    } catch (error) {
      console.error('Error loading operatories:', error)
      toast.error('Failed to load operatories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        operatory_number: formData.operatory_number ? parseInt(formData.operatory_number) : null,
      }

      if (editingOperatory) {
        const { error } = await supabase
          .from('operatories')
          .update(data)
          .eq('id', editingOperatory.id)

        if (error) throw error
        toast.success('Operatory updated!')
      } else {
        const { error } = await supabase
          .from('operatories')
          .insert([{ ...data, tenant_id: tenantId }])

        if (error) throw error
        toast.success('Operatory added!')
      }

      setDialogOpen(false)
      setEditingOperatory(null)
      resetForm()
      loadOperatories()
    } catch (error) {
      console.error('Error saving operatory:', error)
      toast.error('Failed to save operatory')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this operatory?')) return

    try {
      const { error } = await supabase
        .from('operatories')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Operatory deleted')
      loadOperatories()
    } catch (error) {
      console.error('Error deleting operatory:', error)
      toast.error('Failed to delete operatory')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      operatory_number: '',
      equipment_type: '',
      color: '#10B981',
      is_active: true,
    })
  }

  const openEditDialog = (operatory: any) => {
    setEditingOperatory(operatory)
    setFormData({
      name: operatory.name,
      operatory_number: operatory.operatory_number?.toString() || '',
      equipment_type: operatory.equipment_type || '',
      color: operatory.color || '#10B981',
      is_active: operatory.is_active,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Operatories & Rooms</CardTitle>
            <CardDescription>
              Manage treatment rooms, chairs, and equipment
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setEditingOperatory(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Operatory
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : operatories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No operatories configured</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {operatories.map((operatory) => (
                <Card key={operatory.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: operatory.color }}
                        >
                          {operatory.operatory_number || '?'}
                        </div>
                        <div>
                          <div className="font-semibold">{operatory.name}</div>
                          {operatory.equipment_type && (
                            <div className="text-sm text-gray-600">{operatory.equipment_type}</div>
                          )}
                        </div>
                      </div>
                      {!operatory.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(operatory)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(operatory.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
            <DialogTitle>{editingOperatory ? 'Edit Operatory' : 'Add Operatory'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Op 1, Hygiene Room A"
              />
            </div>
            <div>
              <Label>Operatory Number</Label>
              <Input
                type="number"
                value={formData.operatory_number}
                onChange={(e) => setFormData({ ...formData, operatory_number: e.target.value })}
                placeholder="1"
              />
            </div>
            <div>
              <Label>Equipment Type</Label>
              <Input
                value={formData.equipment_type}
                onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                placeholder="e.g., Standard, Surgical, Hygiene"
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingOperatory ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

