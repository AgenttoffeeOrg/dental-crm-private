'use client'

/**
 * Unified Field Mapping Component
 * 
 * Maps external integration fields → CRM fields (Contacts, Deals, Tasks)
 * 
 * Reuses pattern from form-builder field mapping
 * 
 * Supports:
 * - Meta Lead Ads fields
 * - Google Ads Lead Form fields
 * - TikTok Lead Gen fields
 * - Custom integration fields
 * 
 * Features:
 * - Drag-and-drop mapping
 * - Dropdown mapping
 * - Required field validation
 * - Preview mapped data
 * - Save to integration_connections.mapping_config
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight, Check, AlertCircle } from 'lucide-react'

export interface FieldMappingConfig {
  sourceField: string
  sourceFieldLabel: string
  targetEntity: 'contact' | 'deal' | 'task'
  targetField: string
  required: boolean
  dataType?: string
}

interface FieldMapperProps {
  integrationName: string
  sourceFields: Array<{
    key: string
    label: string
    type?: string
    required?: boolean
  }>
  mapping: Record<string, string>
  onMappingChange: (mapping: Record<string, string>) => void
  onSave: () => void
}

const CRM_FIELDS = {
  contact: [
    { value: 'full_name', label: 'Full Name', required: true },
    { value: 'first_name', label: 'First Name', required: false },
    { value: 'last_name', label: 'Last Name', required: false },
    { value: 'primary_email', label: 'Primary Email', required: true },
    { value: 'secondary_email', label: 'Secondary Email', required: false },
    { value: 'primary_phone', label: 'Primary Phone', required: true },
    { value: 'secondary_phone', label: 'Secondary Phone', required: false },
    { value: 'company', label: 'Company', required: false },
    { value: 'job_title', label: 'Job Title', required: false },
    { value: 'address', label: 'Address', required: false },
    { value: 'city', label: 'City', required: false },
    { value: 'state', label: 'State', required: false },
    { value: 'postal_code', label: 'Postal Code', required: false },
    { value: 'country', label: 'Country', required: false },
    { value: 'source', label: 'Source', required: false },
    { value: 'notes', label: 'Notes', required: false },
  ],
  deal: [
    { value: 'title', label: 'Deal Title', required: true },
    { value: 'value', label: 'Deal Value', required: false },
    { value: 'stage_id', label: 'Pipeline Stage', required: false },
    { value: 'expected_close_date', label: 'Expected Close Date', required: false },
    { value: 'description', label: 'Description', required: false },
    { value: 'source', label: 'Deal Source', required: false },
  ],
  task: [
    { value: 'title', label: 'Task Title', required: true },
    { value: 'description', label: 'Task Description', required: false },
    { value: 'due_date', label: 'Due Date', required: false },
    { value: 'priority', label: 'Priority', required: false },
  ],
}

export function FieldMapper({
  integrationName,
  sourceFields,
  mapping,
  onMappingChange,
  onSave,
}: FieldMapperProps) {
  const [localMapping, setLocalMapping] = useState<Record<string, string>>(mapping)
  const [selectedEntity, setSelectedEntity] = useState<'contact' | 'deal' | 'task'>('contact')

  const handleFieldMapping = (sourceKey: string, targetField: string) => {
    const newMapping = {
      ...localMapping,
      [sourceKey]: `${selectedEntity}.${targetField}`,
    }
    setLocalMapping(newMapping)
    onMappingChange(newMapping)
  }

  const removeMapping = (sourceKey: string) => {
    const newMapping = { ...localMapping }
    delete newMapping[sourceKey]
    setLocalMapping(newMapping)
    onMappingChange(newMapping)
  }

  const requiredFieldsMapped = sourceFields
    .filter(f => f.required)
    .every(f => localMapping[f.key])

  const mappedCount = Object.keys(localMapping).length
  const totalFields = sourceFields.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Field Mapping</h3>
        <p className="text-sm text-gray-600">
          Map {integrationName} fields to your CRM fields
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={requiredFieldsMapped ? 'default' : 'destructive'}>
            {mappedCount}/{totalFields} fields mapped
          </Badge>
          {requiredFieldsMapped ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              All required fields mapped
            </span>
          ) : (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Map required fields
            </span>
          )}
        </div>
      </div>

      {/* Entity Selector */}
      <div>
        <Label>Map to:</Label>
        <div className="flex gap-2 mt-2">
          <Button
            variant={selectedEntity === 'contact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedEntity('contact')}
          >
            Contact
          </Button>
          <Button
            variant={selectedEntity === 'deal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedEntity('deal')}
          >
            Deal
          </Button>
          <Button
            variant={selectedEntity === 'task' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedEntity('task')}
          >
            Task
          </Button>
        </div>
      </div>

      {/* Field Mappings */}
      <div className="space-y-3">
        {sourceFields.map((sourceField) => (
          <Card key={sourceField.key} className="p-4">
            <div className="flex items-center gap-4">
              {/* Source Field */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">{sourceField.label}</Label>
                  {sourceField.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {integrationName} field: {sourceField.key}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-5 w-5 text-gray-400" />

              {/* Target Field Selector */}
              <div className="flex-1">
                <Select
                  value={localMapping[sourceField.key]?.split('.')[1] || ''}
                  onValueChange={(value) => handleFieldMapping(sourceField.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CRM field" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_FIELDS[selectedEntity].map((crmField) => (
                      <SelectItem key={crmField.value} value={crmField.value}>
                        <div className="flex items-center gap-2">
                          {crmField.label}
                          {crmField.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {localMapping[sourceField.key] && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Mapped to {localMapping[sourceField.key]}
                  </p>
                )}
              </div>

              {/* Remove Mapping */}
              {localMapping[sourceField.key] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMapping(sourceField.key)}
                >
                  Clear
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={onSave}
          disabled={!requiredFieldsMapped}
        >
          Save Field Mapping
        </Button>
      </div>
    </div>
  )
}

