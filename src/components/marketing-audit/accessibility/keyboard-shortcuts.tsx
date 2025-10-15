/**
 * Keyboard Shortcuts Component
 * 
 * Global keyboard shortcuts for power users.
 * UX Focus: Efficiency for frequent users, accessible for all.
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsProps {
  onRunAudit?: () => void;
  onViewRecommendations?: () => void;
  onViewCompetitors?: () => void;
}

export function KeyboardShortcuts({
  onRunAudit,
  onViewRecommendations,
  onViewCompetitors,
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K = Run Audit
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onRunAudit?.();
      }
      
      // Cmd/Ctrl + R = View Recommendations
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        onViewRecommendations?.();
      }
      
      // Cmd/Ctrl + B = View Competitors (Benchmark)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onViewCompetitors?.();
      }
      
      // ? = Show keyboard shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp(true);
      }
      
      // Esc = Close help
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRunAudit, onViewRecommendations, onViewCompetitors, showHelp]);
  
  if (!showHelp) {
    return (
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors z-50"
        aria-label="Show keyboard shortcuts"
      >
        <Command className="w-5 h-5" />
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setShowHelp(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Shortcuts List */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Run Audit</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-mono">
              ⌘ K
            </kbd>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">View Recommendations</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-mono">
              ⌘ R
            </kbd>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">View Competitors</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-mono">
              ⌘ B
            </kbd>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Show Help</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-mono">
              ?
            </kbd>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Close Dialog</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-mono">
              Esc
            </kbd>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            On Windows, use Ctrl instead of ⌘
          </p>
        </div>
      </div>
    </div>
  );
}

