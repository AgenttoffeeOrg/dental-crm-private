/**
 * Public Shared Audit Page
 * 
 * View-only page for shared audit links.
 * UX Focus: Clean, professional presentation for external viewing.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { CompositeScoreCard } from '@/components/marketing-audit/dashboard/composite-score-card';
import { SubScoresGrid } from '@/components/marketing-audit/dashboard/sub-scores-grid';
import { RecommendationsPanel } from '@/components/marketing-audit/dashboard/recommendations-panel';

export default function SharedAuditPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchSharedAudit();
  }, [token]);
  
  async function fetchSharedAudit() {
    const supabase = createClient();
    
    try {
      // Get share record
      const { data: share, error: shareError } = await supabase
        .from('marketing_audit_shares')
        .select('*, audit:marketing_audit_runs(*)')
        .eq('share_token', token)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (shareError || !share) {
        setError('This link is invalid or has expired.');
        return;
      }
      
      // Track access
      await supabase
        .from('marketing_audit_shares')
        .update({
          access_count: share.access_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', share.id);
      
      setAudit(share.audit);
    } catch (err) {
      setError('Failed to load audit.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }
  
  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Audit Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">
            This link may be invalid, expired, or revoked.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            Learn More About Marketing Audits
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Marketing Audit Report
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(audit.completed_at || audit.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Read-only view
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Powered by</div>
              <div className="text-lg font-bold text-purple-600">Dental CRM</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Composite Score */}
          <CompositeScoreCard audit={audit} />
          
          {/* Sub-Scores */}
          <SubScoresGrid audit={audit} />
          
          {/* Recommendations */}
          <RecommendationsPanel
            audit={audit}
            readonly={true}
          />
          
          {/* CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-center text-white">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              Want Your Own Marketing Audit?
            </h2>
            <p className="mb-6 max-w-2xl mx-auto">
              Get comprehensive insights into your practice's online presence,
              competitive benchmarking, and actionable recommendations.
            </p>
            <a
              href="/"
              className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>This audit report was generated by Dental CRM Marketing Audit System</p>
          <p className="mt-2">
            <a href="/privacy" className="text-purple-600 hover:text-purple-700">Privacy Policy</a>
            {' · '}
            <a href="/terms" className="text-purple-600 hover:text-purple-700">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}

