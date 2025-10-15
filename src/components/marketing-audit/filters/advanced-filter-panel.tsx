/**
 * Advanced Filter Panel Component
 * 
 * Multi-criteria filtering with saved presets.
 * UX Focus: Power users can filter complex data quickly.
 */

'use client';

import { useState } from 'react';
import { Filter, Save, Trash2, Search } from 'lucide-react';

interface AdvancedFilterPanelProps {
  onFilterChange: (filters: any) => void;
  availableFilters: {
    categories: string[];
    impacts: string[];
    efforts: string[];
    statuses: string[];
  };
}

export function AdvancedFilterPanel({ onFilterChange, availableFilters }: AdvancedFilterPanelProps) {
  const [filters, setFilters] = useState({
    categories: [] as string[],
    impact: [] as string[],
    effort: [] as string[],
    status: [] as string[],
    search: '',
    scoreRange: [0, 100],
  });
  
  const [savedPresets, setSavedPresets] = useState<any[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  const handleToggleFilter = (type: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[type] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      const newFilters = { ...prev, [type]: updated };
      onFilterChange(newFilters);
      return newFilters;
    });
  };
  
  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: { ...filters },
    };
    
    setSavedPresets(prev => [...prev, newPreset]);
    setPresetName('');
    setShowSavePreset(false);
    
    // TODO: Save to database
  };
  
  const handleLoadPreset = (preset: any) => {
    setFilters(preset.filters);
    onFilterChange(preset.filters);
  };
  
  const handleDeletePreset = (presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
    // TODO: Delete from database
  };
  
  const handleClearAll = () => {
    const cleared = {
      categories: [],
      impact: [],
      effort: [],
      status: [],
      search: '',
      scoreRange: [0, 100],
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };
  
  const activeFilterCount = 
    filters.categories.length +
    filters.impact.length +
    filters.effort.length +
    filters.status.length +
    (filters.search ? 1 : 0);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Advanced Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 rounded-full text-xs font-medium">
                {activeFilterCount} active
              </span>
            )}
          </div>
          
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="p-5 space-y-5">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                const newFilters = { ...filters, search: e.target.value };
                setFilters(newFilters);
                onFilterChange(newFilters);
              }}
              className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Search recommendations..."
            />
          </div>
        </div>
        
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {availableFilters.categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleToggleFilter('categories', cat)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${filters.categories.includes(cat)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }
                `}
              >
                {cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        
        {/* Impact */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Impact
          </label>
          <div className="flex gap-2">
            {['high', 'medium', 'low'].map(impact => (
              <button
                key={impact}
                onClick={() => handleToggleFilter('impact', impact)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                  ${filters.impact.includes(impact)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }
                `}
              >
                {impact}
              </button>
            ))}
          </div>
        </div>
        
        {/* Effort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Effort
          </label>
          <div className="flex gap-2">
            {['low', 'medium', 'high'].map(effort => (
              <button
                key={effort}
                onClick={() => handleToggleFilter('effort', effort)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                  ${filters.effort.includes(effort)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }
                `}
              >
                {effort}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Saved Presets */}
      {savedPresets.length > 0 && (
        <div className="p-5 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Saved Filters
          </h4>
          <div className="space-y-2">
            {savedPresets.map(preset => (
              <div key={preset.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                <button
                  onClick={() => handleLoadPreset(preset)}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Save Preset */}
      <div className="p-5 border-t border-gray-200 dark:border-gray-700">
        {showSavePreset ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              placeholder="Preset name..."
              autoFocus
            />
            <button
              onClick={handleSavePreset}
              className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowSavePreset(false)}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSavePreset(true)}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save current filters as preset
          </button>
        )}
      </div>
    </div>
  );
}

