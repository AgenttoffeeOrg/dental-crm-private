/**
 * Local Presence Tab Component
 * 
 * Deep-dive into local SEO metrics:
 * - Google Reviews (count, rating, velocity)
 * - GBP Completeness (Phase 2)
 * - NAP Consistency (Phase 2)
 * - Citations (Phase 2)
 */

'use client';

import type { LocalMetrics, Recommendation } from '@/lib/marketing-audit/types';
import { MapPin, Star, MessageSquare } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';

interface LocalPresenceTabProps {
  metrics: LocalMetrics;
  score: number;
  recommendations: Recommendation[];
}

export function LocalPresenceTab({ metrics, score, recommendations }: LocalPresenceTabProps) {
  const reviews = metrics.reviews;
  
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-orange-600';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MapPin className="w-7 h-7 text-blue-600" />
            Local Presence & Reviews
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Google Business Profile, reviews, and local citations
          </p>
        </div>
        <ScoreBadge score={score} size="lg" showLabel />
      </div>
      
      {/* Reviews Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Google Reviews
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Reviews
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {reviews.total_count}
            </div>
            <div className="text-xs text-gray-500">
              Target: 100+
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Average Rating
            </div>
            <div className={`text-3xl font-bold ${getRatingColor(reviews.avg_rating)}`}>
              {reviews.avg_rating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 text-yellow-400 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < Math.floor(reviews.avg_rating) ? 'fill-current' : ''}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Reviews (Last 30d)
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {reviews.last_30_days}
            </div>
            <div className="text-xs text-gray-500">
              Target: 15-25/month
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Response Rate
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {reviews.response_rate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">
              Target: 90%+
            </div>
          </div>
        </div>
      </div>
      
      {/* Phase 2 Preview */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Unlock Full Local SEO Audit (Phase 2)
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Upgrade to Professional plan to get:
            </p>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• GBP Completeness Score (40 factors analyzed)</li>
              <li>• NAP Consistency Check (across 50+ directories)</li>
              <li>• Citation Tracking & Gap Analysis</li>
              <li>• Local Pack Rankings (keyword positions)</li>
              <li>• Review Response Time Analysis</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Local Presence Recommendations ({recommendations.length})
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

