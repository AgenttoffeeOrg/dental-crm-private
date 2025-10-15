/**
 * Analytics Hygiene Tab Component
 * 
 * Analytics setup quality check:
 * - GA4 connection and setup
 * - Google Search Console setup
 * - UTM parameter usage
 * - Consent and compliance
 */

'use client';

import type { AnalyticsMetrics, Recommendation } from '@/lib/marketing-audit/types';
import { BarChart3, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';

interface AnalyticsHygieneTabProps {
  metrics: AnalyticsMetrics;
  score: number;
  recommendations: Recommendation[];
}

export function AnalyticsHygieneTab({ metrics, score, recommendations }: AnalyticsHygieneTabProps) {
  const StatusIcon = ({ connected }: { connected: boolean }) =>
    connected ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-orange-600" />
            Analytics Hygiene
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analytics setup quality and tracking accuracy
          </p>
        </div>
        <ScoreBadge score={score} size="lg" showLabel />
      </div>
      
      {/* GA4 Setup */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <StatusIcon connected={metrics.ga4.connected} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Google Analytics 4 (GA4)
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Connection Status
            </div>
            <div className={`text-lg font-bold ${metrics.ga4.connected ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.ga4.connected ? 'Connected' : 'Not Connected'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Custom Events
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.ga4.custom_events}
            </div>
            <div className="text-xs text-gray-500">Target: 5+</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Conversions
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.ga4.conversions}
            </div>
            <div className="text-xs text-gray-500">Target: 2+</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Enhanced Measurement
            </div>
            <div className={`text-lg font-bold ${metrics.ga4.enhanced_measurement ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.ga4.enhanced_measurement ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>
      
      {/* GSC Setup */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <StatusIcon connected={metrics.gsc.connected} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Google Search Console (GSC)
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Connection Status
            </div>
            <div className={`text-lg font-bold ${metrics.gsc.connected ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.gsc.connected ? 'Connected' : 'Not Connected'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Data History
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.gsc.data_months} months
            </div>
            <div className="text-xs text-gray-500">Target: 3+ months</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Search Queries
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.gsc.queries.toLocaleString()}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Clicks
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics.gsc.clicks.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* UTM Discipline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className={`w-5 h-5 ${metrics.utm_usage_rate >= 80 ? 'text-green-600' : 'text-yellow-600'}`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            UTM Parameter Usage
          </h3>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Campaign Traffic Tagged
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.utm_usage_rate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-full rounded-full transition-all ${metrics.utm_usage_rate >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${metrics.utm_usage_rate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>Target: 90-95%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Compliance Checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Compliance Checklist
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Cookie Consent Banner
            </span>
            <StatusIcon connected={metrics.has_cookie_banner} />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Privacy Policy Page
            </span>
            <StatusIcon connected={metrics.privacy_policy} />
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Analytics Recommendations ({recommendations.length})
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

