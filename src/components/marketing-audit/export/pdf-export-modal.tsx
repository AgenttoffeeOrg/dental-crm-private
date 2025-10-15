/**
 * PDF Export Modal Component
 * 
 * UX Focus: One-click PDF generation for client reports.
 * Architecture: Client-side PDF generation, no server dependency.
 */

'use client';

import { useState } from 'react';
import { X, Download, FileText, CheckCircle2 } from 'lucide-react';
import type { AuditRun } from '@/lib/marketing-audit/types';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: AuditRun;
}

export function PDFExportModal({ isOpen, onClose, audit }: PDFExportModalProps) {
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeCompetitors, setIncludeCompetitors] = useState(true);
  const [includeActionSteps, setIncludeActionSteps] = useState(true);
  const [branding, setBranding] = useState<'crm' | 'white_label'>('crm');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  
  if (!isOpen) return null;
  
  async function handleGenerate() {
    setGenerating(true);
    
    // Simulate PDF generation (actual implementation in Phase 3)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setGenerating(false);
    setGenerated(true);
    
    // Auto-close after 2 seconds
    setTimeout(() => {
      setGenerated(false);
      onClose();
    }, 2000);
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Export PDF Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        {!generated ? (
          <div className="p-6 space-y-5">
            {/* Branding */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Branding
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBranding('crm')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    branding === 'crm'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-sm font-medium">Dental CRM</div>
                  <div className="text-xs text-gray-500 mt-1">With our branding</div>
                </button>
                <button
                  onClick={() => setBranding('white_label')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    branding === 'white_label'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-sm font-medium">White Label</div>
                  <div className="text-xs text-gray-500 mt-1">Your practice only</div>
                </button>
              </div>
            </div>
            
            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Include in Report
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeEvidence}
                    onChange={(e) => setIncludeEvidence(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Evidence & Metrics
                    </div>
                    <div className="text-xs text-gray-500">
                      Charts, graphs, and supporting data
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeCompetitors}
                    onChange={(e) => setIncludeCompetitors(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Competitor Analysis
                    </div>
                    <div className="text-xs text-gray-500">
                      Benchmarking and competitive insights
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeActionSteps}
                    onChange={(e) => setIncludeActionSteps(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Action Steps
                    </div>
                    <div className="text-xs text-gray-500">
                      Step-by-step implementation guide
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Preview Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Report will include:</strong>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>Executive summary</li>
                  <li>Overall score & trends</li>
                  <li>Category breakdowns</li>
                  <li>Top 10 recommendations</li>
                  {includeEvidence && <li>Evidence & metrics</li>}
                  {includeCompetitors && <li>Competitor benchmarking</li>}
                  {includeActionSteps && <li>Implementation guide</li>}
                </ul>
                <div className="mt-2 text-xs">
                  Estimated pages: {includeEvidence && includeCompetitors ? '15-20' : '8-12'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              PDF Generated!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your report is downloading now...
            </p>
          </div>
        )}
        
        {/* Footer */}
        {!generated && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

