'use client'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GripVertical, Trash2, Settings, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useState } from 'react'
import type { FormField } from '@/hooks/use-marketing-forms'
import { ConditionalLogicBuilder, type ConditionalRule } from '@/components/forms/conditional-logic-builder'

interface SortableFieldProps {
  field: FormField
  onUpdate: (field: FormField) => void
  onDelete: () => void
  onSelect?: (field: FormField) => void
  isSelected?: boolean
  allFields?: FormField[] // For conditional logic
}

function SortableField({ field, onUpdate, onDelete, onSelect, isSelected, allFields = [] }: SortableFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`${isDragging ? 'ring-2 ring-blue-500' : ''} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''} cursor-pointer`}
      onClick={() => onSelect?.(field)}
    >
      <CardContent className="p-4">
        {/* Field Header */}
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-move p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </button>

          {/* Field Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{field.label || 'Untitled Field'}</div>
            <div className="text-xs text-gray-500 capitalize">
              {field.type} {field.required && '• Required'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Settings */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div>
              <Label htmlFor={`${field.id}-label`}>Field Label</Label>
              <Input
                id={`${field.id}-label`}
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                placeholder="Enter field label..."
              />
            </div>

            <div>
              <Label htmlFor={`${field.id}-placeholder`}>Placeholder</Label>
              <Input
                id={`${field.id}-placeholder`}
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                placeholder="Enter placeholder text..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`${field.id}-required`}>Required Field</Label>
              <Switch
                id={`${field.id}-required`}
                checked={field.required}
                onCheckedChange={(checked) => onUpdate({ ...field, required: checked })}
              />
            </div>

            {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
              <div>
                <Label>Options (one per line)</Label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  rows={4}
                  value={(field.options || []).join('\n')}
                  onChange={(e) => onUpdate({
                    ...field,
                    options: e.target.value.split('\n').filter(o => o.trim())
                  })}
                  placeholder="Option 1\nOption 2\nOption 3"
                />
              </div>
            )}

            {field.type === 'scale' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.min || 0}
                    onChange={(e) => onUpdate({
                      ...field,
                      validation: {
                        ...field.validation,
                        min: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.max || 10}
                    onChange={(e) => onUpdate({
                      ...field,
                      validation: {
                        ...field.validation,
                        max: parseInt(e.target.value) || 10
                      }
                    })}
                  />
                </div>
              </div>
            )}

            {/* Hidden Field Settings */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={`${field.id}-hidden`}>Hidden Field</Label>
                <p className="text-xs text-gray-500">Field won't be visible to users</p>
              </div>
              <Switch
                id={`${field.id}-hidden`}
                checked={(field as any).hidden === true}
                onCheckedChange={(checked) => onUpdate({ ...field, hidden: checked } as any)}
              />
            </div>

            {(field as any).hidden && (
              <div>
                <Label htmlFor={`${field.id}-default`}>Default Value</Label>
                <Input
                  id={`${field.id}-default`}
                  value={(field as any).defaultValue || ''}
                  onChange={(e) => onUpdate({ ...field, defaultValue: e.target.value } as any)}
                  placeholder="Default value for hidden field"
                />
              </div>
            )}

            {/* URL Prefill Settings */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={`${field.id}-prefill`}>Allow URL Prefill</Label>
                <p className="text-xs text-gray-500">Allow field to be prefilled from URL params</p>
              </div>
              <Switch
                id={`${field.id}-prefill`}
                checked={(field as any).allowPrefill !== false}
                onCheckedChange={(checked) => onUpdate({ ...field, allowPrefill: checked } as any)}
              />
            </div>

            {(field as any).allowPrefill !== false && (
              <div>
                <Label htmlFor={`${field.id}-urlparam`}>URL Parameter Name (optional)</Label>
                <Input
                  id={`${field.id}-urlparam`}
                  value={(field as any).urlParamName || ''}
                  onChange={(e) => onUpdate({ ...field, urlParamName: e.target.value } as any)}
                  placeholder={`Default: ${(field as any).field_name || field.id}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom URL param name (e.g., ?email= vs ?e=)
                </p>
              </div>
            )}

            {/* Conditional Logic */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-yellow-500" />
                <Label>Conditional Logic</Label>
              </div>
              <ConditionalLogicBuilder
                fields={allFields}
                currentFieldId={field.id}
                rules={(field as any).conditionalRules || []}
                onChange={(rules) => onUpdate({ ...field, conditionalRules: rules } as any)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SortableFieldListProps {
  fields: FormField[]
  onReorder: (fields: FormField[]) => void
  onUpdateField: (fieldId: string, field: FormField) => void
  onDeleteField: (fieldId: string) => void
  selectedFieldId?: string | null
  onSelectField?: (field: FormField) => void
}

export function SortableFieldList({ 
  fields, 
  onReorder, 
  onUpdateField, 
  onDeleteField,
  selectedFieldId,
  onSelectField
}: SortableFieldListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)

      const newFields = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
        ...field,
        order: index,
      }))

      onReorder(newFields)
    }
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500 mb-2">No fields yet</p>
        <p className="text-sm text-gray-400">Drag fields from the palette or click to add</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {fields.map((field) => (
            <SortableField
              key={field.id}
              field={field}
              onUpdate={(updatedField) => onUpdateField(field.id, updatedField)}
              onDelete={() => onDeleteField(field.id)}
              onSelect={onSelectField}
              isSelected={selectedFieldId === field.id}
              allFields={fields}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {fields.find(f => f.id === activeId)?.label || 'Untitled Field'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

