'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, User } from 'lucide-react'
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

interface Contact {
  id: string
  full_name: string
}

interface ContactSelectorProps {
  contacts: Contact[]
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function ContactSelector({
  contacts,
  value,
  onValueChange,
  placeholder = 'Select contact...',
  disabled = false,
  required = false,
  className
}: ContactSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const selectedContact = contacts.find(contact => contact.id === value)

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
          {selectedContact ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{selectedContact.full_name}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>No contact found.</CommandEmpty>
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
                  <span className="text-muted-foreground">No contact</span>
                </CommandItem>
              )}
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`${contact.id} ${contact.full_name}`}
                  onSelect={() => {
                    onValueChange(contact.id === value ? null : contact.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === contact.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.full_name}</span>
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

