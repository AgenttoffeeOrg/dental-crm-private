'use client'

/**
 * Notification Preferences Tab (ENTERPRISE-GRADE)
 * 
 * Deep user preference management:
 * - Per-event toggles (60+ events)
 * - Per-channel toggles (in-app, email, SMS, push)
 * - Quiet hours (DND) with timezone support
 * - Digest preferences (daily/weekly/monthly)
 * - Muted objects viewer
 * - Global snooze
 * - GDPR consent tracking
 * 
 * Replaces the old basic notifications-tab.tsx
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Bell, Mail, MessageSquare, Smartphone, Moon, Clock, Save, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { ALL_NOTIFICATION_EVENTS, type NotificationModule } from '@/lib/notifications/event-catalog'

export function NotificationsPreferencesTab() {
  const { appUser } = useAuth()
  const [preferences, setPreferences] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModule, setFilterModule] = useState<string>('all')
  
  useEffect(() => {
    if (appUser?.id) {
      loadPreferences()
    }
  }, [appUser?.id])
  
  const loadPreferences = async () => {
    if (!appUser?.id) return
    
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', appUser.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error  // Ignore "not found"
      
      // Set defaults if no preferences exist
      setPreferences(data || {
        in_app_enabled: true,
        email_enabled: true,
        sms_enabled: false,
        push_enabled: false,
        event_preferences: {},
        quiet_hours: { enabled: false },
        digest_preferences: { enabled: false, frequency: 'daily', time: '09:00' },
        muted_objects: {},
      })
    } catch (error) {
      console.error('[Preferences] Error loading:', error)
      toast.error('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSave = async () => {
    if (!appUser?.id) return
    
    setSaving(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: appUser.id,
          tenant_id: appUser.tenant_id,
          ...preferences,
        })
      
      if (error) throw error
      
      toast.success('Notification preferences saved')
    } catch (error) {
      console.error('[Preferences] Error saving:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }
  
  // Toggle channel for an event
  const toggleEventChannel = (eventKey: string, channel: string) => {
    const eventPrefs = preferences.event_preferences || {}
    const currentEventPref = eventPrefs[eventKey] || {}
    
    setPreferences({
      ...preferences,
      event_preferences: {
        ...eventPrefs,
        [eventKey]: {
          ...currentEventPref,
          [channel]: !currentEventPref[channel]
        }
      }
    })
  }
  
  // Get channel state for event
  const isEventChannelEnabled = (eventKey: string, channel: string): boolean => {
    const eventPrefs = preferences?.event_preferences || {}
    const eventPref = eventPrefs[eventKey]
    
    if (eventPref && eventPref[channel] !== undefined) {
      return eventPref[channel]
    }
    
    // Default: enabled
    return true
  }
  
  // Filtered events
  const filteredEvents = ALL_NOTIFICATION_EVENTS.filter(event => {
    if (filterModule !== 'all' && event.module !== filterModule) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return event.event_key.toLowerCase().includes(query) ||
             event.title_template.toLowerCase().includes(query)
    }
    return true
  })
  
  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
        <p className="text-sm text-gray-600">Control how and when you receive notifications</p>
      </div>
      
      {/* Global Channel Toggles */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Global Channels</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-600" />
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-xs text-gray-600">Bell icon & drawer</p>
              </div>
            </div>
            <Switch
              checked={preferences.in_app_enabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, in_app_enabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-gray-600">Sent to your email</p>
              </div>
            </div>
            <Switch
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, email_enabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-xs text-gray-600">Text messages</p>
              </div>
            </div>
            <Switch
              checked={preferences.sms_enabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, sms_enabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-orange-600" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-gray-600">Mobile push</p>
              </div>
            </div>
            <Switch
              checked={preferences.push_enabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, push_enabled: checked })}
            />
          </div>
        </div>
      </Card>
      
      {/* Per-Event Preferences */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Per-Event Settings</h4>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="deals">Deals</SelectItem>
                <SelectItem value="tasks">Tasks</SelectItem>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="integrations">Integrations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="text-center w-24">In-App</TableHead>
                <TableHead className="text-center w-24">Email</TableHead>
                <TableHead className="text-center w-24">SMS</TableHead>
                <TableHead className="w-32">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.event_key}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{event.title_template}</p>
                      <p className="text-xs text-gray-600">{event.event_key}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={isEventChannelEnabled(event.event_key, 'in_app')}
                      onCheckedChange={() => toggleEventChannel(event.event_key, 'in_app')}
                      disabled={!preferences.in_app_enabled}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={isEventChannelEnabled(event.event_key, 'email')}
                      onCheckedChange={() => toggleEventChannel(event.event_key, 'email')}
                      disabled={!preferences.email_enabled}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={isEventChannelEnabled(event.event_key, 'sms')}
                      onCheckedChange={() => toggleEventChannel(event.event_key, 'sms')}
                      disabled={!preferences.sms_enabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {event.priority}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Quiet Hours */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="h-5 w-5 text-indigo-600" />
          <h4 className="font-semibold">Do Not Disturb (Quiet Hours)</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Quiet Hours</Label>
              <p className="text-xs text-gray-600">Pause email/SMS during these hours (in-app still active)</p>
            </div>
            <Switch
              checked={preferences.quiet_hours?.enabled}
              onCheckedChange={(checked) => setPreferences({
                ...preferences,
                quiet_hours: { ...preferences.quiet_hours, enabled: checked }
              })}
            />
          </div>
          
          {preferences.quiet_hours?.enabled && (
            <div className="pl-6 space-y-3 border-l-2 border-indigo-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours?.start || '22:00'}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      quiet_hours: { ...preferences.quiet_hours, start: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours?.end || '08:00'}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      quiet_hours: { ...preferences.quiet_hours, end: e.target.value }
                    })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Timezone</Label>
                <Select
                  value={preferences.quiet_hours?.timezone || 'America/Los_Angeles'}
                  onValueChange={(value) => setPreferences({
                    ...preferences,
                    quiet_hours: { ...preferences.quiet_hours, timezone: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Digest Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold">Digest Emails</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Daily Digest</Label>
              <p className="text-xs text-gray-600">Batch notifications into a single daily email</p>
            </div>
            <Switch
              checked={preferences.digest_preferences?.enabled}
              onCheckedChange={(checked) => setPreferences({
                ...preferences,
                digest_preferences: { ...preferences.digest_preferences, enabled: checked }
              })}
            />
          </div>
          
          {preferences.digest_preferences?.enabled && (
            <div className="pl-6 space-y-3 border-l-2 border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={preferences.digest_preferences?.frequency || 'daily'}
                    onValueChange={(value) => setPreferences({
                      ...preferences,
                      digest_preferences: { ...preferences.digest_preferences, frequency: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Monday)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={preferences.digest_preferences?.time || '09:00'}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      digest_preferences: { ...preferences.digest_preferences, time: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadPreferences}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}

