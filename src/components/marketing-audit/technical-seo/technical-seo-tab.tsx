/**
 * Technical SEO Tab Component
 * 
 * Deep-dive into technical SEO metrics:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Lighthouse Scores
 * - Indexation Status
 * - Evidence cards with recommendations
 */

'use client';

import type { TechnicalMetrics, Recommendation } from '@/lib/marketing-audit/types';
import { Gauge, Zap, Search, Shield } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';

interface TechnicalSEOTabProps {
  metrics: TechnicalMetrics;
  score: number;
  recommendations: Recommendation[];
}

export function TechnicalSEOTab({ metrics, score, recommendations }: TechnicalSEOTabProps) {
  const cwv = metrics.core_web_vitals;
  const lighthouse = metrics.lighthouse;
  const indexation = metrics.indexation;
  
  const getCWVStatus = (metric: string, value: number) => {
    if (metric === 'lcp') {
      if (value <= 2.5) return { status: 'Good', color: 'text-green-600', bg: 'bg-green-50' };
      if (value <= 4.0) return { status: 'Needs Improvement', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      return { status: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (metric === 'fid') {
      if (value <= 100) return { status: 'Good', color: 'text-green-600', bg: 'bg-green-50' };
      if (value <= 300) return { status: 'Needs Improvement', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      return { status: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (metric === 'cls') {
      if (value <= 0.1) return { status: 'Good', color: 'text-green-600', bg: 'bg-green-50' };
      if (value <= 0.25) return { status: 'Needs Improvement', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      return { status: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
    }
    return { status: 'Unknown', color: 'text-gray-600', bg: 'bg-gray-50' };
  };
  
  const lcpStatus = getCWVStatus('lcp', cwv.lcp);
  const fidStatus = getCWVStatus('fid', cwv.fid);
  const clsStatus = getCWVStatus('cls', cwv.cls);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Gauge className="w-7 h-7 text-purple-600" />
            Technical SEO & Core Web Vitals
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Site performance, indexation, and technical health
          </p>
        </div>
        <ScoreBadge score={score} size="lg" showLabel />
      </div>
      
      {/* Core Web Vitals */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Core Web Vitals
          </h3>
          <span className="text-xs text-gray-500 ml-2">from Google PageSpeed Insights</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LCP */}
          <div className={`p-4 rounded-lg ${lcpStatus.bg} border border-${lcpStatus.color.split('-')[1]}-200`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Largest Contentful Paint (LCP)
              </span>
              <span className={`text-xs font-semibold ${lcpStatus.color}`}>
                {lcpStatus.status}
              </span>
            </div>
            <div className={`text-3xl font-bold ${lcpStatus.color} mb-1`}>
              {cwv.lcp.toFixed(2)}s
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Good: ≤2.5s</span>
              <span>Poor: &gt;4.0s</span>
            </div>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${lcpStatus.color.replace('text', 'bg')}`}
                style={{ width: `${Math.min((cwv.lcp / 4) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {/* FID */}
          <div className={`p-4 rounded-lg ${fidStatus.bg} border border-${fidStatus.color.split('-')[1]}-200`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                First Input Delay (FID)
              </span>
              <span className={`text-xs font-semibold ${fidStatus.color}`}>
                {fidStatus.status}
              </span>
            </div>
            <div className={`text-3xl font-bold ${fidStatus.color} mb-1`}>
              {cwv.fid.toFixed(0)}ms
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Good: ≤100ms</span>
              <span>Poor: &gt;300ms</span>
            </div>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${fidStatus.color.replace('text', 'bg')}`}
                style={{ width: `${Math.min((cwv.fid / 300) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {/* CLS */}
          <div className={`p-4 rounded-lg ${clsStatus.bg} border border-${clsStatus.color.split('-')[1]}-200`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cumulative Layout Shift (CLS)
              </span>
              <span className={`text-xs font-semibold ${clsStatus.color}`}>
                {clsStatus.status}
              </span>
            </div>
            <div className={`text-3xl font-bold ${clsStatus.color} mb-1`}>
              {cwv.cls.toFixed(3)}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Good: ≤0.1</span>
              <span>Poor: &gt;0.25</span>
            </div>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${clsStatus.color.replace('text', 'bg')}`}
                style={{ width: `${Math.min((cwv.cls / 0.25) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Lighthouse Scores */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lighthouse Scores
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Performance', score: lighthouse.performance, target: 90 },
            { label: 'Accessibility', score: lighthouse.accessibility, target: 95 },
            { label: 'Best Practices', score: lighthouse.bestPractices, target: 95 },
            { label: 'SEO', score: lighthouse.seo, target: 100 },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {item.label}
              </div>
              <div className={`text-3xl font-bold mb-2 ${item.score >= item.target ? 'text-green-600' : 'text-yellow-600'}`}>
                {item.score}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${item.score >= item.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Target: {item.target}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Indexation Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Indexation & Crawl Health
          </h3>
          <span className="text-xs text-gray-500 ml-2">from Google Search Console</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Indexed Pages
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {indexation.indexed_pages}
            </div>
            <div className="text-xs text-gray-500">
              of {indexation.submitted_pages} submitted
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Coverage Ratio
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {indexation.coverage_ratio.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              Target: 95%+
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Errors
            </div>
            <div className={`text-2xl font-bold ${indexation.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {indexation.errors}
            </div>
            <div className="text-xs text-gray-500">
              {indexation.errors === 0 ? 'Perfect!' : 'Need fixing'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Warnings
            </div>
            <div className={`text-2xl font-bold ${indexation.warnings > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {indexation.warnings}
            </div>
            <div className="text-xs text-gray-500">
              {indexation.warnings === 0 ? 'Clean!' : 'Review'}
            </div>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${metrics.https ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              HTTPS {metrics.https ? 'Enabled' : 'Not Enabled'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${metrics.mobile_friendly ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Mobile Friendly {metrics.mobile_friendly ? '✓' : '✗'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${metrics.has_sitemap ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Sitemap {metrics.has_sitemap ? 'Present' : 'Missing'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Recommendations for this category */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Technical SEO Recommendations ({recommendations.length})
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

