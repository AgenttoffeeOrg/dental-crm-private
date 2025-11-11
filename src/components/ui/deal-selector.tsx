'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Deal {
  id: string
  title: string
}

interface DealSelectorProps {
  deals: Deal[]
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function DealSelector({
  deals,
  value,
  onValueChange,
  placeholder = 'Select deal...',
  disabled = false,
  required = false,
  className
}: DealSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDeal = deals.find(deal => deal.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          {selectedDeal ? (
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span>{selectedDeal.title}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search deals..." />
          <CommandList>
            <CommandEmpty>No deal found.</CommandEmpty>
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
                  <span className="text-muted-foreground">No deal</span>
                </CommandItem>
              )}
              {deals.map((deal) => (
                <CommandItem
                  key={deal.id}
                  value={`${deal.id} ${deal.title}`}
                  onSelect={() => {
                    onValueChange(deal.id === value ? null : deal.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === deal.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

