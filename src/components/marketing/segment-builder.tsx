'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, X, Users } from 'lucide-react'
import type { SegmentDefinition, SegmentCondition } from '@/types/marketing'

interface SegmentBuilderProps {
  definition: SegmentDefinition
  onChange: (definition: SegmentDefinition) => void
  onPreview?: () => void
  contactCount?: number
}

const CONTACT_FIELDS = [
  { value: 'full_name', label: 'Full Name', type: 'text' },
  { value: 'primary_email', label: 'Email', type: 'email' },
  { value: 'primary_phone', label: 'Phone', type: 'phone' },
  { value: 'source', label: 'Source', type: 'text' },
  { value: 'city', label: 'City', type: 'text' },
  { value: 'postal_code', label: 'Postal Code', type: 'text' },
  { value: 'tags', label: 'Tags', type: 'tags' },
  { value: 'marketing_consent', label: 'Marketing Consent', type: 'boolean' },
  { value: 'sms_consent', label: 'SMS Consent', type: 'boolean' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
]

const OPERATORS = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
  date: [
    { value: 'equals', label: 'is on' },
    { value: 'greater_than', label: 'is after' },
    { value: 'less_than', label: 'is before' },
  ],
  boolean: [
    { value: 'equals', label: 'is' },
  ],
  tags: [
    { value: 'contains', label: 'includes' },
    { value: 'not_contains', label: 'does not include' },
  ]
}

export function SegmentBuilder({ definition, onChange, onPreview, contactCount }: SegmentBuilderProps) {
  const addCondition = () => {
    const newCondition: SegmentCondition = {
      field: 'full_name',
      operator: 'contains',
      value: '',
      type: 'field'
    }
    
    onChange({
      ...definition,
      conditions: [...definition.conditions, newCondition]
    })
  }

  const updateCondition = (index: number, updates: Partial<SegmentCondition>) => {
    const newConditions = [...definition.conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    
    onChange({
      ...definition,
      conditions: newConditions
    })
  }

  const removeCondition = (index: number) => {
    onChange({
      ...definition,
      conditions: definition.conditions.filter((_, i) => i !== index)
    })
  }

  const toggleOperator = () => {
    onChange({
      ...definition,
      operator: definition.operator === 'AND' ? 'OR' : 'AND'
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Segment Builder
          </CardTitle>
          {contactCount !== undefined && (
            <Badge className="bg-blue-600 text-white">
              {contactCount} contacts match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conditions */}
        <div className="space-y-3">
          {definition.conditions.map((condition, index) => {
            const field = CONTACT_FIELDS.find(f => f.value === condition.field)
            const operators = OPERATORS[field?.type as keyof typeof OPERATORS] || OPERATORS.text

            return (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                {/* Field */}
                <Select 
                  value={condition.field}
                  onValueChange={(value) => updateCondition(index, { field: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_FIELDS.map(field => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator */}
                <Select 
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(index, { operator: value as any })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value */}
                {condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' && (
                  field?.type === 'boolean' ? (
                    <Select 
                      value={String(condition.value)}
                      onValueChange={(value) => updateCondition(index, { value: value === 'true' })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      type={field?.type === 'date' ? 'date' : 'text'}
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Enter value..."
                      className="flex-1"
                    />
                  )
                )}

                {/* Remove */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCondition(index)}
                  className="h-9 w-9 p-0"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* AND/OR Toggle */}
        {definition.conditions.length > 1 && (
          <div className="flex items-center justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleOperator}
              className="font-semibold"
            >
              Match {definition.operator === 'AND' ? 'ALL' : 'ANY'} conditions
              <Badge variant="secondary" className="ml-2">
                {definition.operator}
              </Badge>
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={addCondition}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
          {onPreview && (
            <Button
              onClick={onPreview}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Preview Contacts
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

