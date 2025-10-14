'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, GripVertical, Trash2, Eye } from 'lucide-react'
import type { FormField } from '@/types/marketing'

interface FormBuilderProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
]

const CONTACT_FIELDS = [
  { value: 'full_name', label: 'Full Name' },
  { value: 'primary_email', label: 'Email' },
  { value: 'primary_phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'postal_code', label: 'Postal Code' },
  { value: 'date_of_birth', label: 'Date of Birth' },
]

export function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      field_name: 'full_name',
      required: false,
      width: 'full'
    }
    onChange([...fields, newField])
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id))
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Form Fields</h3>
          <Button size="sm" onClick={addField}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Add Field
          </Button>
        </div>

        {fields.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">No fields yet</p>
            <Button size="sm" onClick={addField}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add First Field
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {fields.map(field => (
              <Card key={field.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-4 w-4 text-gray-400 mt-2 cursor-grab" />
                    
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Field Label"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="text-sm"
                        />
                        <Select 
                          value={field.type} 
                          onValueChange={(value) => updateField(field.id, { type: value as any })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Placeholder text"
                          value={field.placeholder}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          className="text-xs"
                        />
                        <Select 
                          value={field.field_name} 
                          onValueChange={(value) => updateField(field.id, { field_name: value })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Maps to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_FIELDS.map(cf => (
                              <SelectItem key={cf.value} value={cf.value}>
                                {cf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <label className="text-xs text-gray-700">Required field</label>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField(field.id)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Preview</h3>
          <Badge variant="outline">
            <Eye className="h-3 w-3 mr-1" />
            Live Preview
          </Badge>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {fields.map(field => (
                <div key={field.id}>
                  <label className="text-sm font-medium block mb-1">
                    {field.label}
                    {field.required && <span className="text-red-600 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      placeholder={field.placeholder}
                      className="w-full border rounded px-3 py-2 text-sm"
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select className="w-full border rounded px-3 py-2 text-sm">
                      <option>Select...</option>
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" />
                      <span className="text-sm">{field.placeholder || field.label}</span>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <Button className="w-full">Submit</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




