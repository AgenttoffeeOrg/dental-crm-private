/**
 * Sub-Scores Grid Component
 * 
 * Displays the 5 category scores in a grid layout:
 * - Technical SEO
 * - Local Presence
 * - Content & Authority
 * - Analytics Hygiene
 * - Conversion UX
 */

'use client';

import { 
  Gauge, 
  MapPin, 
  FileText, 
  BarChart3, 
  MousePointerClick,
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuditRun } from '@/lib/marketing-audit/types';

interface SubScoresGridProps {
  audit: AuditRun | null;
  onViewDetails?: (category: string) => void;
}

export function SubScoresGrid({ audit, onViewDetails }: SubScoresGridProps) {
  const hasData = audit !== null;
  
  const scores = [
    {
      category: 'technical',
      label: 'Technical SEO',
      score: audit?.technical_score || 0,
      weight: '25%',
      icon: Gauge,
      description: 'Site speed, Core Web Vitals, indexation',
      color: 'purple',
    },
    {
      category: 'local',
      label: 'Local Presence',
      score: audit?.local_score || 0,
      weight: '30%',
      icon: MapPin,
      description: 'Google Business Profile, reviews, citations',
      color: 'blue',
    },
    {
      category: 'content',
      label: 'Content & Authority',
      score: audit?.content_score || 0,
      weight: '20%',
      icon: FileText,
      description: 'Backlinks, domain authority, content quality',
      color: 'green',
    },
    {
      category: 'analytics',
      label: 'Analytics Hygiene',
      score: audit?.analytics_score || 0,
      weight: '15%',
      icon: BarChart3,
      description: 'GA4, Search Console, tracking setup',
      color: 'orange',
    },
    {
      category: 'conversion',
      label: 'Conversion UX',
      score: audit?.conversion_score || 0,
      weight: '10%',
      icon: MousePointerClick,
      description: 'Booking widgets, CTAs, mobile experience',
      color: 'pink',
    },
  ];
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' };
    if (score >= 40) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  };
  
  const getColorClasses = (color: string) => {
    const colors: Record<string, { icon: string; bar: string; light: string }> = {
      purple: { icon: 'text-purple-600', bar: 'bg-purple-500', light: 'bg-purple-50' },
      blue: { icon: 'text-blue-600', bar: 'bg-blue-500', light: 'bg-blue-50' },
      green: { icon: 'text-green-600', bar: 'bg-green-500', light: 'bg-green-50' },
      orange: { icon: 'text-orange-600', bar: 'bg-orange-500', light: 'bg-orange-50' },
      pink: { icon: 'text-pink-600', bar: 'bg-pink-500', light: 'bg-pink-50' },
    };
    return colors[color] || colors.purple;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {scores.map((item) => {
        const scoreColor = getScoreColor(item.score);
        const colorClasses = getColorClasses(item.color);
        const Icon = item.icon;
        
        return (
          <div
            key={item.category}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${colorClasses.light}`}>
                <Icon className={`w-5 h-5 ${colorClasses.icon}`} />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Weight: {item.weight}
              </span>
            </div>
            
            {/* Score */}
            <div className="mb-3">
              <div className="flex items-baseline gap-2 mb-1">
                {hasData ? (
                  <>
                    <span className={`text-3xl font-bold ${scoreColor.text}`}>
                      {item.score.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      / 100
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-gray-400">
                      —
                    </span>
                    <span className="text-sm text-gray-400">
                      N/A
                    </span>
                  </>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                {hasData ? (
                  <div
                    className={`h-full ${scoreColor.bg} transition-all duration-500`}
                    style={{ width: `${item.score}%` }}
                  />
                ) : (
                  <div className="h-full bg-gray-300 w-0" />
                )}
              </div>
            </div>
            
            {/* Label */}
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
              {item.label}
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
              {item.description}
            </p>
            
            {/* View Details Button */}
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => onViewDetails(item.category)}
                disabled={!hasData}
              >
                {hasData ? 'View Details' : 'Pending Audit'}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

