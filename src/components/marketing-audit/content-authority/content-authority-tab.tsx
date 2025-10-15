/**
 * Content & Authority Tab Component
 * 
 * Content quality and domain authority metrics:
 * - Phase 1: Indexed pages, organic traffic
 * - Phase 3: Backlinks, referring domains, authority score, keywords
 */

'use client';

import type { ContentMetrics, Recommendation } from '@/lib/marketing-audit/types';
import { FileText, Lock } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';

interface ContentAuthorityTabProps {
  metrics: ContentMetrics;
  score: number;
  recommendations: Recommendation[];
  phase: 1 | 2 | 3;
}

export function ContentAuthorityTab({ metrics, score, recommendations, phase }: ContentAuthorityTabProps) {
  const hasFullData = phase === 3 && metrics.authority_score > 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-green-600" />
            Content & Authority
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Content quality, backlinks, and domain authority
          </p>
        </div>
        <ScoreBadge score={score} size="lg" showLabel />
      </div>
      
      {/* Phase 1: Basic Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Content Metrics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Indexed Pages
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.indexed_pages}
            </div>
            <div className="text-xs text-gray-500">
              Target: 50-100+
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Content Freshness
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.content_freshness_score}
            </div>
            <div className="text-xs text-gray-500">
              Score out of 100
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Organic Keywords
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.organic_keywords || '—'}
            </div>
            <div className="text-xs text-gray-500">
              {hasFullData ? 'From Semrush' : 'Phase 3 feature'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Phase 3: Full Backlink Data */}
      {hasFullData ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Backlink Profile
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Authority Score
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.authority_score}
              </div>
              <div className="text-xs text-gray-500">
                Semrush scale (0-100)
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Referring Domains
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.referring_domains}
              </div>
              <div className="text-xs text-gray-500">
                Target: 50-100+
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Backlinks
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.total_backlinks.toLocaleString()}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Toxic Backlinks
              </div>
              <div className={`text-3xl font-bold ${metrics.toxic_backlinks_percent > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.toxic_backlinks_percent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                Target: <5%
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Unlock Full Backlink Analysis (Phase 3)
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Upgrade to Enterprise plan to get:
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Complete Backlink Profile (all links analyzed)</li>
                <li>• Domain Authority Score (Semrush)</li>
                <li>• Toxic Backlink Detection & Disavow List</li>
                <li>• Competitor Backlink Gap Analysis</li>
                <li>• Organic Keywords Rankings (200+ keywords)</li>
                <li>• Content Opportunity Finder</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Content & Authority Recommendations ({recommendations.length})
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={rec.id || index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {index + 1}. {rec.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

