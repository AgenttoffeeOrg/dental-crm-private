'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Repeat, Calendar } from 'lucide-react'
import { format, addDays, addWeeks, addMonths } from 'date-fns'

interface RecurringAppointmentDialogProps {
  open: boolean
  onClose: () => void
  onSave: (recurrenceRule: RecurrenceRule) => void
  startDate: Date
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number // Every N days/weeks/months
  daysOfWeek?: number[] // For weekly: 0-6 (Sunday-Saturday)
  dayOfMonth?: number // For monthly: 1-31
  endDate?: Date
  occurrences?: number // Alternative to endDate
}

export function RecurringAppointmentDialog({
  open,
  onClose,
  onSave,
  startDate
}: RecurringAppointmentDialogProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [interval, setInterval] = useState(1)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([startDate.getDay()])
  const [endType, setEndType] = useState<'never' | 'date' | 'after'>('after')
  const [endDate, setEndDate] = useState('')
  const [occurrences, setOccurrences] = useState(10)

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ]

  const toggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day))
    } else {
      setDaysOfWeek([...daysOfWeek, day])
    }
  }

  const getPreview = () => {
    const previews: Date[] = []
    let current = new Date(startDate)
    
    for (let i = 0; i < 5 && i < (occurrences || 5); i++) {
      if (frequency === 'daily') {
        if (i > 0) current = addDays(current, interval)
      } else if (frequency === 'weekly') {
        if (i > 0) current = addWeeks(current, interval)
      } else if (frequency === 'monthly') {
        if (i > 0) current = addMonths(current, interval)
      }
      previews.push(new Date(current))
    }

    return previews
  }

  const handleSave = () => {
    const rule: RecurrenceRule = {
      frequency,
      interval,
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? startDate.getDate() : undefined,
      endDate: endType === 'date' && endDate ? new Date(endDate) : undefined,
      occurrences: endType === 'after' ? occurrences : undefined,
    }

    onSave(rule)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-blue-600" />
            Recurring Appointment
          </DialogTitle>
          <DialogDescription>
            Set up a repeating appointment schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Repeats</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">
                  {frequency === 'daily' && 'day(s)'}
                  {frequency === 'weekly' && 'week(s)'}
                  {frequency === 'monthly' && 'month(s)'}
                </span>
              </div>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div>
              <Label>Repeat on</Label>
              <div className="flex gap-2 mt-2">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      daysOfWeek.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End Type */}
          <div>
            <Label>Ends</Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="never"
                  checked={endType === 'never'}
                  onChange={() => setEndType('never')}
                />
                <label htmlFor="never" className="text-sm cursor-pointer">
                  Never
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="after"
                  checked={endType === 'after'}
                  onChange={() => setEndType('after')}
                />
                <label htmlFor="after" className="text-sm cursor-pointer">
                  After
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={occurrences}
                  onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                  disabled={endType !== 'after'}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">occurrence(s)</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="date"
                  checked={endType === 'date'}
                  onChange={() => setEndType('date')}
                />
                <label htmlFor="date" className="text-sm cursor-pointer">
                  On date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={endType !== 'date'}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Preview (first 5)</span>
            </div>
            <div className="space-y-2">
              {getPreview().map((date, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {format(date, 'EEEE, MMM d, yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={frequency === 'weekly' && daysOfWeek.length === 0}>
            Create Recurring Series
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

