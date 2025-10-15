'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { 
  Type,
  AtSign,
  Phone,
  Calendar,
  Upload,
  Star,
  CheckSquare,
  Circle,
  List,
  MessageSquare,
  Sliders,
  PenTool,
  Hash,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import type { FormField } from '@/hooks/use-marketing-forms'

const FIELD_TYPES = [
  {
    type: 'text' as const,
    label: 'Text Input',
    icon: Type,
    description: 'Single line text field',
    category: 'basic',
  },
  {
    type: 'email' as const,
    label: 'Email',
    icon: AtSign,
    description: 'Email address with validation',
    category: 'basic',
  },
  {
    type: 'phone' as const,
    label: 'Phone',
    icon: Phone,
    description: 'Phone number with formatting',
    category: 'basic',
  },
  {
    type: 'textarea' as const,
    label: 'Text Area',
    icon: MessageSquare,
    description: 'Multi-line text input',
    category: 'basic',
  },
  {
    type: 'select' as const,
    label: 'Dropdown',
    icon: List,
    description: 'Select from options',
    category: 'choice',
  },
  {
    type: 'radio' as const,
    label: 'Radio Buttons',
    icon: Circle,
    description: 'Choose one option',
    category: 'choice',
  },
  {
    type: 'checkbox' as const,
    label: 'Checkbox',
    icon: CheckSquare,
    description: 'Yes/no or multiple selections',
    category: 'choice',
  },
  {
    type: 'date' as const,
    label: 'Date Picker',
    icon: Calendar,
    description: 'Select a date',
    category: 'advanced',
  },
  {
    type: 'scale' as const,
    label: 'Scale/Slider',
    icon: Sliders,
    description: 'Numeric scale (e.g., 0-10)',
    category: 'advanced',
  },
  {
    type: 'rating' as const,
    label: 'Star Rating',
    icon: Star,
    description: 'Rate with stars',
    category: 'advanced',
  },
  {
    type: 'file' as const,
    label: 'File Upload',
    icon: Upload,
    description: 'Upload documents or images',
    category: 'advanced',
  },
  {
    type: 'signature' as const,
    label: 'Signature',
    icon: PenTool,
    description: 'Draw signature',
    category: 'advanced',
  },
]

interface FieldPaletteProps {
  onAddField: (fieldType: FormField['type']) => void
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'basic' | 'choice' | 'advanced'>('all')

  const filteredFields = FIELD_TYPES.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === 'all' || field.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Field Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2">
          {(['all', 'basic', 'choice', 'advanced'] as const).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="flex-1 capitalize text-xs"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Field List */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {filteredFields.map((field) => {
              const Icon = field.icon
              return (
                <button
                  key={field.type}
                  onClick={() => onAddField(field.type)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all group cursor-move"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData('fieldType', field.type)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-gray-100 group-hover:bg-blue-100 dark:bg-gray-800 dark:group-hover:bg-blue-900">
                      <Icon className="h-4 w-4 text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {field.description}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>

        {filteredFields.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No fields match your search
          </div>
        )}
      </CardContent>
    </Card>
  )
}

