/**
 * Regression Detector Component
 * 
 * Phase 2: Automatically detect and alert on score regressions.
 * UX Focus: Proactive problem detection, clear actionable alerts.
 */

'use client';

import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface RegressionDetectorProps {
  audits: Array<{
    id: string;
    composite_score: number;
    created_at: string;
    recommendations: any[];
  }>;
  threshold?: number; // Minimum drop to trigger alert (default: 5 points)
}

export function RegressionDetector({ audits, threshold = 5 }: RegressionDetectorProps) {
  // Sort audits by date
  const sorted = [...audits].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  if (sorted.length < 2) {
    return null;
  }
  
  const latest = sorted[0];
  const previous = sorted[1];
  const scoreDrop = previous.composite_score - latest.composite_score;
  
  // No regression
  if (scoreDrop < threshold) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
              No Regressions Detected
            </h4>
            <p className="text-sm text-green-800 dark:text-green-300">
              Your marketing health is stable or improving. Keep up the good work!
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Regression detected
  const severity = scoreDrop >= 10 ? 'critical' : scoreDrop >= 7 ? 'high' : 'medium';
  
  // Find which categories dropped
  const categoryDrops = [
    { name: 'Technical SEO', key: 'technical_score' },
    { name: 'Local Presence', key: 'local_score' },
    { name: 'Content & Authority', key: 'content_score' },
    { name: 'Analytics Hygiene', key: 'analytics_score' },
    { name: 'Conversion UX', key: 'conversion_score' },
  ].map(cat => ({
    ...cat,
    drop: ((previous as any)[cat.key] || 0) - ((latest as any)[cat.key] || 0),
  })).filter(cat => cat.drop >= 3).sort((a, b) => b.drop - a.drop);
  
  return (
    <div className={`
      border-2 rounded-lg p-5
      ${severity === 'critical' 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
        : severity === 'high'
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800'
        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
      }
    `}>
      <div className="flex items-start gap-4">
        <AlertTriangle className={`
          w-6 h-6 flex-shrink-0 mt-0.5
          ${severity === 'critical' ? 'text-red-600' : severity === 'high' ? 'text-orange-600' : 'text-yellow-600'}
        `} />
        
        <div className="flex-1">
          <h4 className={`
            text-base font-bold mb-2
            ${severity === 'critical' ? 'text-red-900 dark:text-red-200' : severity === 'high' ? 'text-orange-900 dark:text-orange-200' : 'text-yellow-900 dark:text-yellow-200'}
          `}>
            {severity === 'critical' ? '🚨 Critical Regression Detected' : severity === 'high' ? '⚠️ Significant Regression Detected' : '⚠️ Regression Detected'}
          </h4>
          
          <p className={`
            text-sm mb-4
            ${severity === 'critical' ? 'text-red-800 dark:text-red-300' : severity === 'high' ? 'text-orange-800 dark:text-orange-300' : 'text-yellow-800 dark:text-yellow-300'}
          `}>
            Your overall score dropped by <strong>{scoreDrop.toFixed(1)} points</strong> since the last audit. 
            This requires immediate attention.
          </p>
          
          {/* Affected Categories */}
          {categoryDrops.length > 0 && (
            <div className="mb-4">
              <h5 className={`
                text-sm font-semibold mb-2
                ${severity === 'critical' ? 'text-red-900 dark:text-red-200' : severity === 'high' ? 'text-orange-900 dark:text-orange-200' : 'text-yellow-900 dark:text-yellow-200'}
              `}>
                Affected Areas:
              </h5>
              <ul className="space-y-1">
                {categoryDrops.map((cat, i) => (
                  <li key={i} className={`
                    text-sm
                    ${severity === 'critical' ? 'text-red-800 dark:text-red-300' : severity === 'high' ? 'text-orange-800 dark:text-orange-300' : 'text-yellow-800 dark:text-yellow-300'}
                  `}>
                    • <strong>{cat.name}</strong>: -{cat.drop.toFixed(1)} points
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommended Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Recommended Actions:
            </h5>
            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-6 list-decimal">
              <li>Review the latest audit recommendations immediately</li>
              <li>Check if any recent website changes caused issues</li>
              <li>Verify your Google Business Profile is still active</li>
              <li>Run a fresh audit to confirm the regression</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

