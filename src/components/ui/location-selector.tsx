import { Check, ChevronsUpDown, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useState } from 'react'
import type { Location } from '@/lib/hooks/use-locations'

interface LocationSelectorProps {
  locations: Location[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function LocationSelector({
  locations,
  value,
  onValueChange,
  placeholder = 'Select location...',
  disabled = false,
  required = false,
  className
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedLocation = locations.find((location) => location.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {selectedLocation ? (
              <span className="truncate">{selectedLocation.name}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search locations..." />
          <CommandEmpty>No location found.</CommandEmpty>
          <CommandGroup>
            {!required && value && (
              <CommandItem
                value=""
                onSelect={() => {
                  onValueChange(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="text-muted-foreground">No location</span>
              </CommandItem>
            )}
            {locations.map((location) => (
              <CommandItem
                key={location.id}
                value={location.id}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? null : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === location.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{location.name}</span>
                  {location.is_primary && (
                    <span className="text-xs text-muted-foreground">(Primary)</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface MultiLocationSelectorProps {
  locations: Location[]
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiLocationSelector({
  locations,
  values,
  onValuesChange,
  placeholder = 'Select locations...',
  disabled = false,
  className
}: MultiLocationSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedCount = values.length
  const allSelected = selectedCount === locations.length

  const toggleLocation = (locationId: string) => {
    if (values.includes(locationId)) {
      onValuesChange(values.filter(id => id !== locationId))
    } else {
      onValuesChange([...values, locationId])
    }
  }

  const toggleAll = () => {
    if (allSelected) {
      onValuesChange([])
    } else {
      onValuesChange(locations.map(l => l.id))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            selectedCount === 0 && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {selectedCount === 0 ? (
              <span>{placeholder}</span>
            ) : allSelected ? (
              <span>All locations ({selectedCount})</span>
            ) : (
              <span>{selectedCount} location{selectedCount > 1 ? 's' : ''} selected</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search locations..." />
          <CommandEmpty>No location found.</CommandEmpty>
          <CommandGroup>
            <CommandItem onSelect={toggleAll}>
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  allSelected ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span className="font-medium">All locations</span>
            </CommandItem>
            {locations.map((location) => (
              <CommandItem
                key={location.id}
                value={location.id}
                onSelect={() => toggleLocation(location.id)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    values.includes(location.id) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{location.name}</span>
                  {location.is_primary && (
                    <span className="text-xs text-muted-foreground">(Primary)</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

