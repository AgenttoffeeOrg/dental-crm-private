'use client'

import { ChevronDown } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

export interface SortOption {
  label: string
  value: string
}

interface SortDropdownProps {
  options: SortOption[]
  value: string
  onValueChange: (value: string) => void
}

export function SortDropdown({ options, value, onValueChange }: SortDropdownProps) {
  const currentOption = options.find(opt => opt.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Sort: {currentOption?.label || 'Select'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

