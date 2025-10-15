'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfQuarter,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  subDays,
  subWeeks,
  subMonths
} from 'date-fns'

export interface DateRange {
  from: Date
  to: Date
  label: string
}

interface TimePeriodSelectorProps {
  value: string
  onChange: (period: string, range: DateRange) => void
  className?: string
}

export function TimePeriodSelector({ value, onChange, className = '' }: TimePeriodSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(value)

  const calculateDateRange = (period: string): DateRange => {
    const now = new Date()
    
    switch (period) {
      case 'today':
        return {
          from: startOfDay(now),
          to: endOfDay(now),
          label: 'Today'
        }
      
      case 'yesterday':
        const yesterday = subDays(now, 1)
        return {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday),
          label: 'Yesterday'
        }
      
      case 'week':
        return {
          from: startOfWeek(now),
          to: endOfWeek(now),
          label: 'This Week'
        }
      
      case 'last-week':
        const lastWeekStart = subWeeks(startOfWeek(now), 1)
        return {
          from: lastWeekStart,
          to: endOfWeek(lastWeekStart),
          label: 'Last Week'
        }
      
      case 'month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
          label: 'This Month'
        }
      
      case 'last-month':
        const lastMonthStart = subMonths(startOfMonth(now), 1)
        return {
          from: lastMonthStart,
          to: endOfMonth(lastMonthStart),
          label: 'Last Month'
        }
      
      case 'quarter':
        return {
          from: startOfQuarter(now),
          to: endOfQuarter(now),
          label: 'This Quarter'
        }
      
      case 'year':
        return {
          from: startOfYear(now),
          to: endOfYear(now),
          label: 'This Year'
        }
      
      case 'all':
        return {
          from: new Date('2020-01-01'),
          to: now,
          label: 'All Time'
        }
      
      default:
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
          label: 'This Month'
        }
    }
  }

  const handleChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod)
    const range = calculateDateRange(newPeriod)
    onChange(newPeriod, range)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select value={selectedPeriod} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="last-week">Last Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

