/**
 * Backlinks Dashboard Component
 * 
 * Phase 3: Enterprise backlink analysis powered by Semrush.
 * UX Focus: Understand link profile, identify opportunities, spot toxic links.
 */

'use client';

import { useState } from 'react';
import { ExternalLink, TrendingUp, AlertTriangle, Award, Link as LinkIcon } from 'lucide-react';
import { formatNumber, formatCompactNumber } from '@/lib/marketing-audit/utils/format';

interface BacklinksDashboardProps {
  data: {
    total_backlinks: number;
    referring_domains: number;
    dofollow_backlinks: number;
    nofollow_backlinks: number;
    authority_score: number;
    toxic_score: number;
    top_backlinks: Array<{
      source_url: string;
      target_url: string;
      anchor_text: string;
      authority_score: number;
      follow_type: 'dofollow' | 'nofollow';
      first_seen: string;
    }>;
  };
  loading?: boolean;
}

export function BacklinksDashboard({ data, loading = false }: BacklinksDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'dofollow' | 'nofollow'>('all');
  const [sortBy, setSortBy] = useState<'authority' | 'date'>('authority');
  
  const filtered = data.top_backlinks.filter(link => {
    if (filter === 'all') return true;
    return link.follow_type === filter;
  });
  
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'authority') {
      return b.authority_score - a.authority_score;
    }
    return new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime();
  });
  
  const dofollowPercent = data.total_backlinks > 0
    ? (data.dofollow_backlinks / data.total_backlinks) * 100
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Backlinks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <LinkIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCompactNumber(data.total_backlinks)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Backlinks
          </div>
        </div>
        
        {/* Referring Domains */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCompactNumber(data.referring_domains)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Referring Domains
          </div>
        </div>
        
        {/* Authority Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.authority_score}/100
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Authority Score
          </div>
        </div>
        
        {/* DoFollow Ratio */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              dofollowPercent >= 60 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                dofollowPercent >= 60 ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {dofollowPercent.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            DoFollow Links
          </div>
        </div>
      </div>
      
      {/* Toxic Score Alert */}
      {data.toxic_score > 30 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-base font-bold text-red-900 dark:text-red-200 mb-2">
                High Toxic Score Detected
              </h4>
              <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                Your backlink profile has a toxic score of <strong>{data.toxic_score}%</strong>. 
                This could negatively impact your search rankings.
              </p>
              <button className="text-sm font-medium text-red-600 hover:text-red-700 underline">
                Learn how to disavow toxic links →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Backlinks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Backlinks
            </h3>
            
            <div className="flex items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Links</option>
                <option value="dofollow">DoFollow Only</option>
                <option value="nofollow">NoFollow Only</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="authority">Sort by Authority</option>
                <option value="date">Sort by Date</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Source Domain
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Anchor Text
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Authority
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.slice(0, 20).map((link, index) => {
                const domain = new URL(link.source_url).hostname.replace('www.', '');
                
                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {domain}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {link.source_url}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {link.anchor_text || '(no anchor text)'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-bold
                        ${link.authority_score >= 60 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : link.authority_score >= 40
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }
                      `}>
                        {link.authority_score}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-medium
                        ${link.follow_type === 'dofollow'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }
                      `}>
                        {link.follow_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a
                        href={link.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

