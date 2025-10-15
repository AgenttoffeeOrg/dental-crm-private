'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Plus, Trash2, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'

export interface FieldMapping {
  sourceField: string
  targetField: string
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'phone_format' | 'none'
}

interface FieldMappingEditorProps {
  platform: 'meta' | 'tiktok' | 'google_ads' | 'linkedin' | 'custom'
  sourceFields: { value: string; label: string }[]
  targetFields: { value: string; label: string }[]
  mappings: FieldMapping[]
  onChange: (mappings: FieldMapping[]) => void
}

const CONTACT_TARGET_FIELDS = [
  { value: 'full_name', label: 'Full Name' },
  { value: 'primary_email', label: 'Email Address' },
  { value: 'primary_phone', label: 'Phone Number' },
  { value: 'source', label: 'Lead Source' },
  { value: 'tags', label: 'Tags (comma-separated)' },
]

const TRANSFORMS = [
  { value: 'none', label: 'No Transform' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'phone_format', label: 'Format Phone (E.164)' },
]

export function FieldMappingEditor({
  platform,
  sourceFields,
  targetFields = CONTACT_TARGET_FIELDS,
  mappings,
  onChange,
}: FieldMappingEditorProps) {
  const addMapping = () => {
    const newMapping: FieldMapping = {
      sourceField: sourceFields[0]?.value || '',
      targetField: targetFields[0]?.value || '',
      transform: 'none',
    }
    onChange([...mappings, newMapping])
  }

  const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], ...updates }
    onChange(newMappings)
  }

  const deleteMapping = (index: number) => {
    onChange(mappings.filter((_, i) => i !== index))
  }

  const getPlatformColor = () => {
    switch (platform) {
      case 'meta': return 'bg-blue-600'
      case 'tiktok': return 'bg-black'
      case 'google_ads': return 'bg-green-600'
      case 'linkedin': return 'bg-blue-700'
      default: return 'bg-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Field Mapping
          </CardTitle>
          <Badge className={`${getPlatformColor()} text-white`}>
            {platform.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Map {platform.replace('_', ' ')} lead fields to your CRM contact fields
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {mappings.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No field mappings yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Map source fields to CRM fields to import leads correctly
            </p>
            <Button onClick={addMapping} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        ) : (
          <>
            {mappings.map((mapping, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Mapping {index + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMapping(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-3 items-center">
                  {/* Source Field */}
                  <div className="col-span-3">
                    <Label className="text-xs">Source Field</Label>
                    <Select
                      value={mapping.sourceField}
                      onValueChange={(value) =>
                        updateMapping(index, { sourceField: value })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>

                  {/* Target Field */}
                  <div className="col-span-3">
                    <Label className="text-xs">CRM Field</Label>
                    <Select
                      value={mapping.targetField}
                      onValueChange={(value) =>
                        updateMapping(index, { targetField: value })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Transform */}
                <div>
                  <Label className="text-xs">Transform (Optional)</Label>
                  <Select
                    value={mapping.transform || 'none'}
                    onValueChange={(value: any) =>
                      updateMapping(index, { transform: value })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFORMS.map((transform) => (
                        <SelectItem key={transform.value} value={transform.value}>
                          {transform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            <Button onClick={addMapping} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Mapping
            </Button>
          </>
        )}

        {/* Quick Setup (Common Mappings) */}
        {mappings.length === 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium mb-3">Quick Setup:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onChange([
                    { sourceField: 'full_name', targetField: 'full_name', transform: 'trim' },
                    { sourceField: 'email', targetField: 'primary_email', transform: 'lowercase' },
                    { sourceField: 'phone', targetField: 'primary_phone', transform: 'phone_format' },
                  ])
                }}
              >
                Standard Mapping
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (platform === 'meta') {
                    onChange([
                      { sourceField: 'full_name', targetField: 'full_name', transform: 'trim' },
                      { sourceField: 'email', targetField: 'primary_email', transform: 'lowercase' },
                      { sourceField: 'phone_number', targetField: 'primary_phone', transform: 'phone_format' },
                    ])
                  } else if (platform === 'tiktok') {
                    onChange([
                      { sourceField: 'name', targetField: 'full_name', transform: 'trim' },
                      { sourceField: 'email', targetField: 'primary_email', transform: 'lowercase' },
                      { sourceField: 'phone', targetField: 'primary_phone', transform: 'phone_format' },
                    ])
                  }
                }}
              >
                {platform.toUpperCase()} Preset
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {mappings.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Mapping Preview:</p>
            <div className="space-y-1 text-xs text-blue-800">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded">{mapping.sourceField}</code>
                  <ArrowRight className="h-3 w-3" />
                  <code className="bg-white px-2 py-1 rounded">{mapping.targetField}</code>
                  {mapping.transform && mapping.transform !== 'none' && (
                    <span className="text-xs text-blue-600">({mapping.transform})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

