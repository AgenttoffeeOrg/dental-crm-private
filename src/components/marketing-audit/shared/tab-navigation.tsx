/**
 * Tab Navigation Component
 * 
 * Navigation tabs for deep-dive sections:
 * - Technical SEO
 * - Local Presence
 * - Content & Authority
 * - Analytics Hygiene
 * - Conversion UX
 * - Competitors
 */

'use client';

import { cn } from '@/lib/utils';
import { 
  Gauge, 
  MapPin, 
  FileText, 
  BarChart3, 
  MousePointerClick,
  Users 
} from 'lucide-react';

interface Tab {
  key: string;
  label: string;
  icon: any;
  count?: number;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: Tab[];
}

const defaultTabs: Tab[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'technical', label: 'Technical SEO', icon: Gauge },
  { key: 'local', label: 'Local Presence', icon: MapPin },
  { key: 'content', label: 'Content & Authority', icon: FileText },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'conversion', label: 'Conversion UX', icon: MousePointerClick },
  { key: 'competitors', label: 'Competitors', icon: Users },
];

export function TabNavigation({ activeTab, onTabChange, tabs = defaultTabs }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <Icon
                className={cn(
                  'mr-2 h-5 w-5',
                  isActive
                    ? 'text-purple-500 dark:text-purple-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                )}
              />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-2 py-0.5 px-2 rounded-full text-xs font-medium',
                    isActive
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

