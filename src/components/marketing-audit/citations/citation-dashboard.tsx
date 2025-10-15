/**
 * Citation Dashboard Component
 * 
 * Phase 2: BrightLocal citation tracking & NAP consistency.
 * UX Focus: Clear visibility into local listings, prioritized fixes.
 */

'use client';

import { useState } from 'react';
import { MapPin, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { formatNumber } from '@/lib/marketing-audit/utils/format';

interface CitationDashboardProps {
  citationData: {
    total_citations: number;
    top_50_coverage: number;
    inconsistent_citations: number;
    citations_by_source: Array<{
      source: string;
      name: string;
      address: string;
      phone: string;
      website: string;
      consistent: boolean;
    }>;
  };
  onRefresh?: () => void;
  loading?: boolean;
}

export function CitationDashboard({ citationData, onRefresh, loading = false }: CitationDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'consistent' | 'inconsistent'>('all');
  
  const filtered = citationData.citations_by_source.filter(citation => {
    if (filter === 'consistent') return citation.consistent;
    if (filter === 'inconsistent') return !citation.consistent;
    return true;
  });
  
  const consistencyRate = citationData.total_citations > 0
    ? ((citationData.total_citations - citationData.inconsistent_citations) / citationData.total_citations) * 100
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Citations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(citationData.total_citations)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Citations Found
          </div>
        </div>
        
        {/* Top 50 Coverage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {citationData.top_50_coverage.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Top 50 Directory Coverage
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${citationData.top_50_coverage}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* NAP Consistency */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${
              citationData.inconsistent_citations === 0
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              {citationData.inconsistent_citations === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {consistencyRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            NAP Consistency Rate
          </div>
          {citationData.inconsistent_citations > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {citationData.inconsistent_citations} inconsistent listing{citationData.inconsistent_citations !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      
      {/* Citations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Citation Details
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Citations</option>
                <option value="consistent">Consistent Only</option>
                <option value="inconsistent">Issues Only</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Directory
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Business Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((citation, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {citation.source}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {citation.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {citation.address}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {citation.phone || 'Not listed'}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {citation.consistent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Consistent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        Needs Fix
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                    {citation.website && (
                      <a
                        href={citation.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-500">
              No citations match the selected filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

