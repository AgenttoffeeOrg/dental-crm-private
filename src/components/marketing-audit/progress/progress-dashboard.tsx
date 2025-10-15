/**
 * Progress Dashboard Component
 * 
 * Phase 2: Track progress over time with visual trends.
 * UX Focus: Show improvements clearly, motivate continued optimization.
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { TrendChart } from '../history/trend-chart';
import { formatNumber } from '@/lib/marketing-audit/utils/format';

interface ProgressDashboardProps {
  practiceId: string;
}

export function ProgressDashboard({ practiceId }: ProgressDashboardProps) {
  const [audits, setAudits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProgressData();
  }, [practiceId]);
  
  async function fetchProgressData() {
    const supabase = createClient();
    
    // Get all completed audits
    const { data: auditData } = await supabase
      .from('marketing_audit_runs')
      .select('*')
      .eq('practice_id', practiceId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });
    
    setAudits(auditData || []);
    
    // Calculate statistics
    if (auditData && auditData.length > 0) {
      const scores = auditData.map(a => a.composite_score);
      const first = scores[0];
      const latest = scores[scores.length - 1];
      const improvement = latest - first;
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      setStats({
        totalAudits: auditData.length,
        firstScore: first,
        latestScore: latest,
        improvement,
        avgScore,
        maxScore,
        minScore,
        improvementPercent: first > 0 ? (improvement / first) * 100 : 0,
      });
    }
    
    setLoading(false);
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  
  if (!stats || audits.length < 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Progress Data Yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Run at least 2 audits to see your progress over time.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Progress Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Improvement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              stats.improvement > 0 
                ? 'bg-green-100 dark:bg-green-900/20' 
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                stats.improvement > 0 ? 'text-green-600' : 'text-red-600 rotate-180'
              }`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            stats.improvement > 0 
              ? 'text-green-600' 
              : stats.improvement < 0 
              ? 'text-red-600' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {stats.improvement > 0 ? '+' : ''}{stats.improvement.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Improvement
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.improvementPercent > 0 ? '+' : ''}{stats.improvementPercent.toFixed(1)}% change
          </div>
        </div>
        
        {/* Best Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.maxScore.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Best Score
          </div>
        </div>
        
        {/* Average Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.avgScore.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Average Score
          </div>
        </div>
        
        {/* Total Audits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(stats.totalAudits)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Audits
          </div>
        </div>
      </div>
      
      {/* Trend Chart */}
      <TrendChart audits={audits} metric="composite" height={250} />
      
      {/* Category Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Category Trends
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { key: 'technical', label: 'Technical SEO', color: 'purple' },
            { key: 'local', label: 'Local Presence', color: 'blue' },
            { key: 'content', label: 'Content', color: 'green' },
            { key: 'analytics', label: 'Analytics', color: 'orange' },
            { key: 'conversion', label: 'Conversion', color: 'pink' },
          ].map(category => {
            const scores = audits.map(a => a[`${category.key}_score`] || 0);
            const latest = scores[scores.length - 1];
            const first = scores[0];
            const change = latest - first;
            
            return (
              <div key={category.key} className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {category.label}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {latest.toFixed(1)}
                </div>
                <div className={`text-xs font-medium ${
                  change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Progress Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📈 Progress Insights
        </h3>
        
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          {stats.improvement > 5 && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0" />
              <p>
                <strong>Great progress!</strong> Your score improved by {stats.improvement.toFixed(1)} points 
                since your first audit. Keep implementing recommendations!
              </p>
            </div>
          )}
          
          {stats.improvement < -3 && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5 flex-shrink-0" />
              <p>
                <strong>Attention needed:</strong> Your score has declined. Review recent website changes 
                and check for technical issues.
              </p>
            </div>
          )}
          
          {stats.totalAudits >= 10 && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
              <p>
                <strong>Data-rich insights:</strong> With {stats.totalAudits} audits, we have strong trend data. 
                Your average score is {stats.avgScore.toFixed(1)}.
              </p>
            </div>
          )}
          
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0" />
            <p>
              <strong>Consistency is key:</strong> Continue running regular audits to track improvements 
              and catch issues early.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

