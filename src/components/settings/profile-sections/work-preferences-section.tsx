'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Briefcase, Clock, Globe, Calendar, HelpCircle } from 'lucide-react'
import type { AppUser, WorkingHours, DaySchedule } from '@/types/database'

interface WorkPreferencesSectionProps {
  profile: AppUser
  onChange: (field: keyof AppUser, value: any) => void
  hasChanges: boolean
}

const TIMEZONES = [
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (25/10/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (10/25/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-10-25)' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (25 Oct 2025)' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Oct 25, 2025)' },
]

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export function WorkPreferencesSection({
  profile,
  onChange,
  hasChanges
}: WorkPreferencesSectionProps) {
  const [showWorkingHours, setShowWorkingHours] = useState(false)

  // Helper function to get default working hours - defined before usage
  const getDefaultWorkingHours = (): WorkingHours => ({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  })

  const workingHours = profile.working_hours_json || getDefaultWorkingHours()

  const updateWorkingHours = (day: keyof WorkingHours, schedule: DaySchedule) => {
    const updated = {
      ...workingHours,
      [day]: schedule
    }
    onChange('working_hours_json', updated)
  }

  const capitalizeDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 text-purple-600" />
          Work Preferences
          {hasChanges && (
            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-300">
              Unsaved changes
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Customize your work settings and availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Timezone */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Your local timezone for displaying dates and times</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-3 max-w-md">
            <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <Select 
              value={profile.timezone || 'Europe/London'} 
              onValueChange={(value) => onChange('timezone', value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="language">Language</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Your preferred language for the interface</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select 
            value={profile.language || 'en'} 
            onValueChange={(value) => onChange('language', value)}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date & Time Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="date_format">Date Format</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">How dates should be displayed</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={profile.date_format || 'DD/MM/YYYY'} 
              onValueChange={(value) => onChange('date_format', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(format => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="time_format">Time Format</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">12-hour (AM/PM) or 24-hour format</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={profile.time_format || '24h'} 
              onValueChange={(value) => onChange('time_format', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (3:30 PM)</SelectItem>
                <SelectItem value="24h">24-hour (15:30)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Working Hours */}
        <div className="space-y-1.5 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>Working Hours</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Define your typical working schedule</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[11px] text-gray-500">
                Set your typical availability throughout the week
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkingHours(!showWorkingHours)}
            >
              <Clock className="h-3.5 w-3.5 mr-2" />
              {showWorkingHours ? 'Hide' : 'Configure'}
            </Button>
          </div>

          {showWorkingHours && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-md">
              {DAYS.map(day => {
                const schedule = workingHours[day] || { enabled: false, start: '09:00', end: '17:00' }
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked) => 
                            updateWorkingHours(day, { ...schedule, enabled: checked })
                          }
                        />
                        <span className="text-xs font-medium">
                          {capitalizeDay(day)}
                        </span>
                      </div>
                    </div>

                    {schedule.enabled ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={schedule.start}
                          onChange={(e) => 
                            updateWorkingHours(day, { ...schedule, start: e.target.value })
                          }
                          className="w-32"
                        />
                        <span className="text-[11px] text-gray-500">to</span>
                        <Input
                          type="time"
                          value={schedule.end}
                          onChange={(e) => 
                            updateWorkingHours(day, { ...schedule, end: e.target.value })
                          }
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Not working</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

