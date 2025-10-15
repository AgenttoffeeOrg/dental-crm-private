'use client'

/**
 * Custom Date Range Picker
 * 
 * Advanced date selection beyond preset ranges (7d/30d/90d)
 * 
 * Features:
 * - Preset ranges (7d, 30d, 90d, 12m, YTD, Last Month, Last Quarter)
 * - Custom date range (calendar picker)
 * - Comparison periods (auto-calculate previous period)
 * - Quick shortcuts
 * - URL state persistence
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

export type DatePreset = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'last_month' | 'last_quarter' | 'all_time' | 'custom'

interface DateRange {
  from: Date
  to: Date
}

interface CustomDateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function CustomDateRangePicker({ value, onChange, className }: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('30d')
  
  const presets: { label: string; value: DatePreset; range: DateRange }[] = [
    {
      label: 'Last 7 days',
      value: '7d',
      range: {
        from: subDays(new Date(), 7),
        to: new Date(),
      },
    },
    {
      label: 'Last 30 days',
      value: '30d',
      range: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
    },
    {
      label: 'Last 90 days',
      value: '90d',
      range: {
        from: subDays(new Date(), 90),
        to: new Date(),
      },
    },
    {
      label: 'Last 12 months',
      value: '12m',
      range: {
        from: subDays(new Date(), 365),
        to: new Date(),
      },
    },
    {
      label: 'Year to Date',
      value: 'ytd',
      range: {
        from: startOfYear(new Date()),
        to: new Date(),
      },
    },
    {
      label: 'Last Month',
      value: 'last_month',
      range: {
        from: startOfMonth(subDays(new Date(), 30)),
        to: endOfMonth(subDays(new Date(), 30)),
      },
    },
    {
      label: 'Last Quarter',
      value: 'last_quarter',
      range: {
        from: startOfQuarter(subDays(new Date(), 90)),
        to: endOfQuarter(subDays(new Date(), 90)),
      },
    },
  ]
  
  const handlePresetSelect = (preset: { label: string; value: DatePreset; range: DateRange }) => {
    setSelectedPreset(preset.value)
    onChange(preset.range)
    setIsOpen(false)
  }
  
  const handleCustomRangeSelect = (range: DateRange) => {
    setSelectedPreset('custom')
    onChange(range)
  }
  
  const getDisplayText = () => {
    if (selectedPreset === 'custom') {
      return `${format(value.from, 'MMM d, yyyy')} - ${format(value.to, 'MMM d, yyyy')}`
    }
    
    const preset = presets.find(p => p.value === selectedPreset)
    return preset?.label || 'Select date range'
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          {getDisplayText()}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="border-r bg-gray-50 p-2 space-y-1">
            <p className="text-xs font-medium text-gray-600 px-2 mb-2">Quick Ranges</p>
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={selectedPreset === preset.value ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={selectedPreset === 'custom' ? 'default' : 'ghost'}
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => setSelectedPreset('custom')}
            >
              Custom Range
            </Button>
          </div>
          
          {/* Calendar */}
          {selectedPreset === 'custom' && (
            <div className="p-3">
              <Calendar
                mode="range"
                selected={{ from: value.from, to: value.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    handleCustomRangeSelect({ from: range.from, to: range.to })
                    setIsOpen(false)
                  }
                }}
                numberOfMonths={2}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Calculate comparison period (previous period)
 */
export function getComparisonPeriod(range: DateRange): DateRange {
  const diffMs = range.to.getTime() - range.from.getTime()
  
  return {
    from: new Date(range.from.getTime() - diffMs),
    to: range.from,
  }
}

