'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Save, RotateCcw } from 'lucide-react'
import {
  loadPreferences,
  savePreferences,
  resetPreferences,
  DEFAULT_PREFERENCES,
  type UserPreferences
} from '@/lib/user-preferences'

export function PipelinePreferencesTab() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setPrefs(loadPreferences())
  }, [])

  const updatePref = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    savePreferences(prefs)
    setHasChanges(false)
    toast.success('Preferences saved successfully')
  }

  const handleReset = () => {
    if (confirm('Reset all preferences to defaults?')) {
      resetPreferences()
      setPrefs(DEFAULT_PREFERENCES)
      setHasChanges(false)
      toast.success('Preferences reset to defaults')
    }
  }

  return (
    <div className="space-y-6">
      {/* Save/Reset Bar */}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Unsaved Changes</Badge>
            <span className="text-sm text-gray-700">You have unsaved preference changes</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Display & View Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display & View Settings</CardTitle>
          <CardDescription>
            Customize how pipelines and deals are displayed by default
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="defaultView">Default View</Label>
              <Select
                value={prefs.defaultView}
                onValueChange={(value: 'board' | 'list' | 'auto') => updatePref('defaultView', value)}
              >
                <SelectTrigger id="defaultView">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Board (Kanban)</SelectItem>
                  <SelectItem value="list">List (Table)</SelectItem>
                  <SelectItem value="auto">Auto (Board for single, List for all)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultPipeline">Default Pipeline</Label>
              <Select
                value={prefs.defaultPipeline}
                onValueChange={(value: string) => updatePref('defaultPipeline', value)}
              >
                <SelectTrigger id="defaultPipeline">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_deals">All Deals</SelectItem>
                  <SelectItem value="last_viewed">Last Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardDensity">Card Density</Label>
              <Select
                value={prefs.cardDensity}
                onValueChange={(value: 'compact' | 'comfortable' | 'spacious') => updatePref('cardDensity', value)}
              >
                <SelectTrigger id="cardDensity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact (More deals visible)</SelectItem>
                  <SelectItem value="comfortable">Comfortable (Balanced)</SelectItem>
                  <SelectItem value="spacious">Spacious (More details)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultSort">Default Sort Order</Label>
              <Select
                value={prefs.defaultSort}
                onValueChange={(value: 'value' | 'activity' | 'stage' | 'age') => updatePref('defaultSort', value)}
              >
                <SelectTrigger id="defaultSort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">By Value (Highest first)</SelectItem>
                  <SelectItem value="activity">By Last Activity</SelectItem>
                  <SelectItem value="stage">By Stage</SelectItem>
                  <SelectItem value="age">By Age (Oldest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Card Display</CardTitle>
          <CardDescription>
            Choose what information to show on deal cards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showContactPhoto" className="cursor-pointer">
                Contact Photo
              </Label>
              <Switch
                id="showContactPhoto"
                checked={prefs.showContactPhoto}
                onCheckedChange={(checked) => updatePref('showContactPhoto', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showDealValue" className="cursor-pointer">
                Deal Value
              </Label>
              <Switch
                id="showDealValue"
                checked={prefs.showDealValue}
                onCheckedChange={(checked) => updatePref('showDealValue', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showLastActivity" className="cursor-pointer">
                Last Activity
              </Label>
              <Switch
                id="showLastActivity"
                checked={prefs.showLastActivity}
                onCheckedChange={(checked) => updatePref('showLastActivity', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showTreatmentTags" className="cursor-pointer">
                Treatment Tags
              </Label>
              <Switch
                id="showTreatmentTags"
                checked={prefs.showTreatmentTags}
                onCheckedChange={(checked) => updatePref('showTreatmentTags', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showHealthScore" className="cursor-pointer">
                Health Score
              </Label>
              <Switch
                id="showHealthScore"
                checked={prefs.showHealthScore}
                onCheckedChange={(checked) => updatePref('showHealthScore', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showOwnerAvatar" className="cursor-pointer">
                Owner Avatar
              </Label>
              <Switch
                id="showOwnerAvatar"
                checked={prefs.showOwnerAvatar}
                onCheckedChange={(checked) => updatePref('showOwnerAvatar', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showUrgencyIndicator" className="cursor-pointer">
                Urgency Indicator
              </Label>
              <Switch
                id="showUrgencyIndicator"
                checked={prefs.showUrgencyIndicator}
                onCheckedChange={(checked) => updatePref('showUrgencyIndicator', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Coding */}
      <Card>
        <CardHeader>
          <CardTitle>Color Coding</CardTitle>
          <CardDescription>
            Choose how to color-code your deal cards for quick identification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="colorBy">Color Cards By</Label>
            <Select
              value={prefs.colorBy}
              onValueChange={(value: 'value' | 'age' | 'health' | 'none') => updatePref('colorBy', value)}
            >
              <SelectTrigger id="colorBy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="health">
                  Deal Health (🟢 Healthy / 🟡 At Risk / 🔴 Dying)
                </SelectItem>
                <SelectItem value="value">
                  Deal Value (Green=High / Yellow=Medium / Gray=Low)
                </SelectItem>
                <SelectItem value="age">
                  Deal Age (Green=Fresh / Yellow=Aging / Red=Old)
                </SelectItem>
                <SelectItem value="none">No Color Coding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quick Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Filters</CardTitle>
          <CardDescription>
            Set default filters for your pipeline view
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="myDealsOnly" className="cursor-pointer font-medium">
                Show My Deals Only
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Filter to only show deals assigned to you
              </p>
            </div>
            <Switch
              id="myDealsOnly"
              checked={prefs.myDealsOnly}
              onCheckedChange={(checked) => updatePref('myDealsOnly', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="highValueOnly" className="cursor-pointer font-medium">
                High Value Deals Only
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Show only deals above £5,000
              </p>
            </div>
            <Switch
              id="highValueOnly"
              checked={prefs.highValueOnly}
              onCheckedChange={(checked) => updatePref('highValueOnly', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Bar */}
      {hasChanges && (
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  )
}

