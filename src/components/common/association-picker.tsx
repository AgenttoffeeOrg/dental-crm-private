'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Link2, X, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface AssociationPickerProps {
  type: 'deal' | 'contact'
  selected: Array<{ id: string; name: string }>
  onChange: (selected: Array<{ id: string; name: string }>) => void
  placeholder?: string
  maxSelections?: number
}

export function AssociationPicker({ 
  type, 
  selected, 
  onChange, 
  placeholder, 
  maxSelections 
}: AssociationPickerProps) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadOptions()
    }
  }, [open, type])

  const loadOptions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      let query
      if (type === 'deal') {
        query = supabase
          .from('deals')
          .select('id, title')
          .order('created_at', { ascending: false })
          .limit(50)
      } else {
        query = supabase
          .from('contacts')
          .select('id, full_name')
          .order('full_name')
          .limit(50)
      }

      const { data, error } = await query

      if (error) throw error
      
      const formatted = data?.map(item => ({
        id: item.id,
        name: type === 'deal' ? item.title : item.full_name
      })) || []

      setOptions(formatted)
    } catch (error) {
      console.error('Error loading', type, 's:', error)
      toast.error(`Failed to load ${type}s`)
    } finally {
      setLoading(false)
    }
  }

  const addSelection = (option: { id: string; name: string }) => {
    if (maxSelections && selected.length >= maxSelections) {
      toast.error(`Maximum ${maxSelections} ${type}s allowed`)
      return
    }

    if (!selected.find(s => s.id === option.id)) {
      onChange([...selected, option])
    }
    setOpen(false)
  }

  const removeSelection = (id: string) => {
    onChange(selected.filter(s => s.id !== id))
  }

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selected.find(s => s.id === opt.id)
  )

  return (
    <div className="space-y-2">
      {/* Selected Items */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <Badge key={item.id} variant="secondary" className="pl-2 pr-1">
              <Link2 className="h-3 w-3 mr-1" />
              {item.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => removeSelection(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <Link2 className="h-4 w-4 mr-2" />
            {placeholder || `Link ${type}...`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <Input
              placeholder={`Search ${type}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 h-10"
            />
          </div>
          
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : filteredOptions.length > 0 ? (
              <div className="p-2">
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => addSelection(option)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm transition-colors"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500">
                No {type}s found
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}


