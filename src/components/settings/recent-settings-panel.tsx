'use client'

/**
 * Recent Settings & Favorites Panel
 * 
 * Quick access to frequently used settings
 * 
 * Features:
 * - Recently accessed settings
 * - Favorited settings
 * - One-click navigation
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Clock, ArrowRight } from 'lucide-react'

interface RecentSetting {
  id: string
  label: string
  tab: string
  section?: string
  accessedAt: Date
  isFavorite: boolean
}

interface RecentSettingsPanelProps {
  onNavigate: (tab: string, section?: string) => void
}

export function RecentSettingsPanel({ onNavigate }: RecentSettingsPanelProps) {
  const [recentSettings, setRecentSettings] = useState<RecentSetting[]>([])
  const [favorites, setFavorites] = useState<RecentSetting[]>([])
  
  useEffect(() => {
    loadRecentSettings()
  }, [])
  
  const loadRecentSettings = () => {
    // In production, load from localStorage or database
    const mockRecent: RecentSetting[] = [
      {
        id: '1',
        label: 'Pipeline Settings',
        tab: 'preferences',
        accessedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
        isFavorite: true,
      },
      {
        id: '2',
        label: 'Email Configuration',
        tab: 'email-config',
        accessedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        isFavorite: true,
      },
      {
        id: '3',
        label: 'Team Members',
        tab: 'team',
        accessedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        isFavorite: false,
      },
    ]
    
    setRecentSettings(mockRecent)
    setFavorites(mockRecent.filter(s => s.isFavorite))
  }
  
  const toggleFavorite = (settingId: string) => {
    setRecentSettings(prev =>
      prev.map(s => s.id === settingId ? { ...s, isFavorite: !s.isFavorite } : s)
    )
    setFavorites(recentSettings.filter(s => s.isFavorite))
  }
  
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }
  
  return (
    <Card className="p-4">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-yellow-600" />
            <h4 className="font-semibold text-sm">Favorites</h4>
            <Badge variant="outline" className="text-xs">{favorites.length}</Badge>
          </div>
          <div className="space-y-1">
            {favorites.map((setting) => (
              <button
                key={setting.id}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded transition text-left"
                onClick={() => onNavigate(setting.tab, setting.section)}
              >
                <span className="text-sm font-medium text-gray-900">{setting.label}</span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-blue-600" />
          <h4 className="font-semibold text-sm">Recently Accessed</h4>
          <Badge variant="outline" className="text-xs">{recentSettings.length}</Badge>
        </div>
        <div className="space-y-1">
          {recentSettings.slice(0, 5).map((setting) => (
            <button
              key={setting.id}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded transition text-left"
              onClick={() => onNavigate(setting.tab, setting.section)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">{setting.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(setting.id)
                  }}
                  className="hover:scale-110 transition"
                >
                  <Star
                    className={`h-3 w-3 ${
                      setting.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                    }`}
                  />
                </button>
              </div>
              <span className="text-xs text-gray-500">{formatTimeAgo(setting.accessedAt)}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

