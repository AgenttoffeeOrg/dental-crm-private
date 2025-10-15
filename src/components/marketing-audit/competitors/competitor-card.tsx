/**
 * Competitor Card Component
 * 
 * Individual competitor display with key metrics.
 * UX Focus: Quick comparison, visual ranking indicators.
 */

'use client';

import { ExternalLink, Star, MapPin, TrendingUp, Award } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';
import { formatNumber } from '@/lib/marketing-audit/utils/format';

interface CompetitorCardProps {
  competitor: {
    name: string;
    website?: string;
    distance_km?: number;
    rank?: number;
    score?: number;
    reviews_count?: number;
    avg_rating?: number;
    indexed_pages?: number;
    is_top_performer?: boolean;
  };
  yourRank?: number;
  onViewDetails?: () => void;
}

export function CompetitorCard({ competitor, yourRank, onViewDetails }: CompetitorCardProps) {
  const isAhead = yourRank !== undefined && competitor.rank !== undefined && yourRank < competitor.rank;
  const isBehind = yourRank !== undefined && competitor.rank !== undefined && yourRank > competitor.rank;
  
  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg border-2 transition-all hover:shadow-md
      ${competitor.is_top_performer 
        ? 'border-yellow-400 dark:border-yellow-600' 
        : 'border-gray-200 dark:border-gray-700'
      }
    `}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {competitor.name}
              </h3>
              {competitor.is_top_performer && (
                <Award className="w-4 h-4 text-yellow-600" title="Top Performer" />
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
              {competitor.distance_km !== undefined && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {competitor.distance_km.toFixed(1)} km
                </div>
              )}
              
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit
                </a>
              )}
            </div>
          </div>
          
          {/* Rank Badge */}
          {competitor.rank !== undefined && (
            <div className={`
              px-3 py-1 rounded-full text-xs font-bold
              ${isAhead 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : isBehind
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            `}>
              #{competitor.rank}
            </div>
          )}
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Score */}
          {competitor.score !== undefined && (
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {competitor.score.toFixed(0)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Score</div>
            </div>
          )}
          
          {/* Reviews */}
          {competitor.reviews_count !== undefined && (
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatNumber(competitor.reviews_count)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Reviews</div>
            </div>
          )}
          
          {/* Rating */}
          {competitor.avg_rating !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {competitor.avg_rating.toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rating</div>
            </div>
          )}
        </div>
        
        {/* Comparison Indicator */}
        {yourRank !== undefined && competitor.rank !== undefined && (
          <div className={`
            flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium
            ${isAhead
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : isBehind
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
            }
          `}>
            {isAhead ? (
              <>
                <TrendingUp className="w-4 h-4" />
                You're ahead
              </>
            ) : isBehind ? (
              <>
                <TrendingUp className="w-4 h-4 rotate-180" />
                They're ahead
              </>
            ) : (
              <>Equal ranking</>
            )}
          </div>
        )}
        
        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full mt-3 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            View Detailed Comparison
          </button>
        )}
      </div>
    </div>
  );
}

