/**
 * Conversion UX Tab Component
 * 
 * Conversion-focused UX analysis:
 * - Online booking
 * - Click-to-call
 * - Contact forms
 * - Mobile experience
 * - Trust signals
 */

'use client';

import type { ConversionMetrics, Recommendation } from '@/lib/marketing-audit/types';
import { MousePointerClick, CheckCircle, XCircle } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';

interface ConversionUXTabProps {
  metrics: ConversionMetrics;
  score: number;
  recommendations: Recommendation[];
}

export function ConversionUXTab({ metrics, score, recommendations }: ConversionUXTabProps) {
  const checklist = [
    { label: 'Online Booking Widget', value: metrics.has_online_booking, impact: 'High Impact' },
    { label: 'Click-to-Call Enabled (Mobile)', value: metrics.has_click_to_call, impact: 'High Impact' },
    { label: 'Phone Number in Header', value: metrics.phone_in_header, impact: 'Medium Impact' },
    { label: 'Contact Form Accessible', value: metrics.contact_form_accessible, impact: 'Medium Impact' },
    { label: 'Mobile Responsive Design', value: metrics.mobile_responsive, impact: 'High Impact' },
    { label: 'Trust Signals (Reviews, Certs)', value: metrics.has_trust_signals, impact: 'Medium Impact' },
  ];
  
  const passedCount = checklist.filter(item => item.value).length;
  const passRate = (passedCount / checklist.length) * 100;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MousePointerClick className="w-7 h-7 text-pink-600" />
            Conversion UX
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            User experience factors that drive bookings and inquiries
          </p>
        </div>
        <ScoreBadge score={score} size="lg" showLabel />
      </div>
      
      {/* Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversion Checklist
          </h3>
          <div className="text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">
              {passedCount}/{checklist.length}
            </span>
            <span className="text-gray-500 ml-1">passed</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-full rounded-full transition-all ${passRate >= 80 ? 'bg-green-500' : passRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${passRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>{passRate.toFixed(0)}% Complete</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Checklist Items */}
        <div className="space-y-3">
          {checklist.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg ${item.value ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}
            >
              <div className="flex items-center gap-3">
                {item.value ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.impact}
                  </div>
                </div>
              </div>
              <div className={`text-xs font-semibold px-2 py-1 rounded ${item.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {item.value ? 'PASS' : 'FAIL'}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* CTAs Above Fold */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Call-to-Action (CTA) Analysis
        </h3>
        
        <div className="flex items-center gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              CTAs Above Fold
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.ctas_above_fold}
            </div>
            <div className="text-xs text-gray-500">
              Recommended: 2-3
            </div>
          </div>
          
          <div className="flex-1">
            <div className={`p-4 rounded-lg ${metrics.ctas_above_fold >= 2 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {metrics.ctas_above_fold >= 2
                  ? '✓ Good CTA placement. Users can easily find booking and contact options.'
                  : '⚠ Add more CTAs above the fold. Make it easy for visitors to book or contact you.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Conversion UX Recommendations ({recommendations.length})
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

