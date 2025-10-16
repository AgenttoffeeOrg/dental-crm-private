'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CalendarSettingsGeneralProps {
  tenantId: string
}

export function CalendarSettingsGeneral({ tenantId }: CalendarSettingsGeneralProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure default calendar preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default View</Label>
            <Select defaultValue="week">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="agenda">Agenda</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Week Starts On</Label>
            <Select defaultValue="monday">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Time Zone</Label>
            <Select defaultValue="Europe/London">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Slot Duration (minutes)</Label>
            <Select defaultValue="30">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Working Hours Start</Label>
            <Input type="time" defaultValue="07:00" />
          </div>

          <div>
            <Label>Working Hours End</Label>
            <Input type="time" defaultValue="19:00" />
          </div>

          <div className="pt-4">
            <Button onClick={() => toast.success('Settings saved!')}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Rules</CardTitle>
          <CardDescription>Default rules for appointment booking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Minimum Notice (hours)</Label>
            <Input type="number" defaultValue="24" min="0" />
            <p className="text-sm text-gray-500 mt-1">
              Minimum time in advance patients must book
            </p>
          </div>

          <div>
            <Label>Maximum Advance Booking (days)</Label>
            <Input type="number" defaultValue="90" min="1" />
            <p className="text-sm text-gray-500 mt-1">
              How far in advance patients can book
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="allow_double_booking" />
            <Label htmlFor="allow_double_booking">
              Allow double-booking (requires permission)
            </Label>
          </div>

          <div className="pt-4">
            <Button onClick={() => toast.success('Booking rules saved!')}>
              Save Booking Rules
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

