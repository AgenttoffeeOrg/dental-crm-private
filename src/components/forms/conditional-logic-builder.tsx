'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Zap } from 'lucide-react'
import type { FormField } from '@/hooks/use-marketing-forms'

export interface ConditionalRule {
  id: string
  condition: {
    field: string // field ID
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'
    value: string
  }
  action: 'show' | 'hide' | 'require' | 'optional'
  targetField: string // field ID to apply action to
  logic?: 'AND' | 'OR' // for multiple conditions
}

interface ConditionalLogicBuilderProps {
  fields: FormField[]
  currentFieldId: string
  rules: ConditionalRule[]
  onChange: (rules: ConditionalRule[]) => void
}

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

const ACTIONS = [
  { value: 'show', label: 'Show field' },
  { value: 'hide', label: 'Hide field' },
  { value: 'require', label: 'Make required' },
  { value: 'optional', label: 'Make optional' },
]

export function ConditionalLogicBuilder({
  fields,
  currentFieldId,
  rules,
  onChange,
}: ConditionalLogicBuilderProps) {
  const addRule = () => {
    const availableFields = fields.filter(f => f.id !== currentFieldId)
    if (availableFields.length === 0) return

    const newRule: ConditionalRule = {
      id: `rule-${Date.now()}`,
      condition: {
        field: availableFields[0].id,
        operator: 'equals',
        value: '',
      },
      action: 'show',
      targetField: currentFieldId,
    }

    onChange([...rules, newRule])
  }

  const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    onChange(rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ))
  }

  const deleteRule = (ruleId: string) => {
    onChange(rules.filter(rule => rule.id !== ruleId))
  }

  const availableSourceFields = fields.filter(f => f.id !== currentFieldId)

  if (availableSourceFields.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-gray-500 text-sm">
          Add more fields to enable conditional logic
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Conditional Logic
          </CardTitle>
          <Button onClick={addRule} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Show or hide this field based on other fields
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No rules yet. Click "Add Rule" to create conditional logic.
          </div>
        ) : (
          rules.map((rule, index) => (
            <div key={rule.id} className="border rounded-lg p-4 space-y-3">
              {/* Rule Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Rule {index + 1}
                </span>
                <Button
                  onClick={() => deleteRule(rule.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Condition: IF [field] [operator] [value] */}
              <div className="space-y-2">
                <Label className="text-xs">When</Label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Source Field */}
                  <Select
                    value={rule.condition.field}
                    onValueChange={(value) =>
                      updateRule(rule.id, {
                        condition: { ...rule.condition, field: value },
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSourceFields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Operator */}
                  <Select
                    value={rule.condition.operator}
                    onValueChange={(value: any) =>
                      updateRule(rule.id, {
                        condition: { ...rule.condition, operator: value },
                      })
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Value (hide if operator is is_empty or is_not_empty) */}
                  {!['is_empty', 'is_not_empty'].includes(rule.condition.operator) && (
                    <Input
                      value={rule.condition.value}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          condition: { ...rule.condition, value: e.target.value },
                        })
                      }
                      placeholder="Value"
                      className="text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Action: THEN [action] */}
              <div className="space-y-2">
                <Label className="text-xs">Then</Label>
                <Select
                  value={rule.action}
                  onValueChange={(value: any) =>
                    updateRule(rule.id, { action: value })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Logic Connector for multiple rules */}
              {index < rules.length - 1 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">And</span>
                    <div className="flex-1 border-t"></div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {rules.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Preview:</strong> This field will{' '}
              {rules.length > 0 && rules[0].action === 'show' ? 'show' : 'hide'}{' '}
              when all conditions above are met.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Utility to evaluate conditional logic rules
 */
export function evaluateConditionalRules(
  rules: ConditionalRule[],
  formData: Record<string, any>
): { [targetFieldId: string]: { visible: boolean; required: boolean } } {
  const result: { [targetFieldId: string]: { visible: boolean; required: boolean } } = {}

  for (const rule of rules) {
    const { condition, action, targetField } = rule
    const fieldValue = formData[condition.field]

    // Evaluate condition
    let conditionMet = false

    switch (condition.operator) {
      case 'equals':
        conditionMet = String(fieldValue) === String(condition.value)
        break
      case 'not_equals':
        conditionMet = String(fieldValue) !== String(condition.value)
        break
      case 'contains':
        conditionMet = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase())
        break
      case 'greater_than':
        conditionMet = Number(fieldValue) > Number(condition.value)
        break
      case 'less_than':
        conditionMet = Number(fieldValue) < Number(condition.value)
        break
      case 'is_empty':
        conditionMet = !fieldValue || String(fieldValue).trim() === ''
        break
      case 'is_not_empty':
        conditionMet = fieldValue && String(fieldValue).trim() !== ''
        break
    }

    // Apply action if condition is met
    if (conditionMet) {
      if (!result[targetField]) {
        result[targetField] = { visible: true, required: false }
      }

      switch (action) {
        case 'show':
          result[targetField].visible = true
          break
        case 'hide':
          result[targetField].visible = false
          break
        case 'require':
          result[targetField].required = true
          break
        case 'optional':
          result[targetField].required = false
          break
      }
    }
  }

  return result
}

