'use client'

import { LayoutList } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

type Density = 'compact' | 'comfortable' | 'spacious'

interface DensityToggleProps {
  density: Density
  onDensityChange: (density: Density) => void
}

export function DensityToggle({ density, onDensityChange }: DensityToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutList className="h-4 w-4 mr-2" />
          Density
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onDensityChange('compact')}>
          {density === 'compact' && '✓ '}Compact
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDensityChange('comfortable')}>
          {density === 'comfortable' && '✓ '}Comfortable
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDensityChange('spacious')}>
          {density === 'spacious' && '✓ '}Spacious
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


