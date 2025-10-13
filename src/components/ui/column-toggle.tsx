'use client'

import { Columns } from 'lucide-react'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Label } from './label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu'

export interface Column {
  id: string
  label: string
  visible: boolean
}

interface ColumnToggleProps {
  columns: Column[]
  onToggle: (columnId: string) => void
}

export function ColumnToggle({ columns, onToggle }: ColumnToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2 space-y-2">
          {columns.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={column.visible}
                onCheckedChange={() => onToggle(column.id)}
              />
              <Label
                htmlFor={column.id}
                className="text-sm font-normal cursor-pointer"
              >
                {column.label}
              </Label>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

