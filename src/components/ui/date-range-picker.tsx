'use client'

import { useState } from 'react'
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type DateRangePreset = '7d' | '30d' | '90d' | '12m' | 'mtd' | 'ytd' | 'custom'

interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange, preset?: DateRangePreset) => void
  presets?: DateRangePreset[]
  showComparison?: boolean
  className?: string
}

const DEFAULT_PRESETS: DateRangePreset[] = ['7d', '30d', '90d', '12m', 'mtd', 'ytd']

const PRESET_LABELS: Record<DateRangePreset, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  '12m': 'Last 12 Months',
  'mtd': 'Month to Date',
  'ytd': 'Year to Date',
  'custom': 'Custom Range',
}

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  showComparison = false,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('30d')
  const [isOpen, setIsOpen] = useState(false)

  const getDateRangeForPreset = (preset: DateRangePreset): DateRange => {
    const now = new Date()
    
    switch (preset) {
      case '7d':
        return { from: subDays(now, 7), to: now }
      case '30d':
        return { from: subDays(now, 30), to: now }
      case '90d':
        return { from: subDays(now, 90), to: now }
      case '12m':
        return { from: subMonths(now, 12), to: now }
      case 'mtd':
        return { from: startOfMonth(now), to: now }
      case 'ytd':
        return { from: startOfYear(now), to: now }
      default:
        return { from: subDays(now, 30), to: now }
    }
  }

  const handlePresetClick = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    const range = getDateRangeForPreset(preset)
    onChange?.(range, preset)
    setIsOpen(false)
  }

  const currentRange = value || getDateRangeForPreset(selectedPreset)

  const formatDateRange = (range: DateRange): string => {
    if (selectedPreset && selectedPreset !== 'custom') {
      return PRESET_LABELS[selectedPreset]
    }
    return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(currentRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-2">
            <div className="text-sm font-semibold text-gray-700 mb-2">Select Date Range</div>
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                  selectedPreset === preset
                    ? 'bg-blue-100 text-blue-900 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                )}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {showComparison && (
        <div className="text-xs text-gray-500 px-3 py-1 bg-gray-50 rounded-md border border-gray-200">
          vs Previous Period
        </div>
      )}
    </div>
  )
}


