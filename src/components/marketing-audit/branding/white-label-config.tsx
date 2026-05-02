/**
 * White Label Configuration Component
 * 
 * Phase 3: Configure white-label branding for PDFs and reports.
 * UX Focus: Easy customization, live preview, professional results.
 */

'use client';

import { useState } from 'react';
import { Upload, Palette, Type, Save, Eye } from 'lucide-react';

interface WhiteLabelConfigProps {
  practiceId: string;
  currentConfig?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    company_name?: string;
    tagline?: string;
  };
  onSave?: (config: any) => void;
}

export function WhiteLabelConfig({ practiceId, currentConfig, onSave }: WhiteLabelConfigProps) {
  const [config, setConfig] = useState(currentConfig || {
    logo_url: '',
    primary_color: '#8B5CF6', // Purple
    secondary_color: '#3B82F6', // Blue
    company_name: '',
    tagline: '',
  });
  
  const [logoPreview, setLogoPreview] = useState(config.logo_url);
  const [saving, setSaving] = useState(false);
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // TODO: Upload to Supabase Storage
    // const { data } = await supabase.storage.from('practice-logos').upload(`${practiceId}/logo.png`, file);
    // setConfig(prev => ({ ...prev, logo_url: data.path }));
  };
  
  const handleSave = async () => {
    setSaving(true);
    onSave?.(config); // Removed await - function may return void
    setSaving(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Practice Logo
        </h3>
        
        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </div>
          
          {/* Upload */}
          <div className="flex-1">
            <label className="block">
              <span className="sr-only">Choose logo file</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              PNG or SVG recommended. Max 2MB. Square format works best.
            </p>
          </div>
        </div>
      </div>
      
      {/* Colors */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Brand Colors
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.primary_color}
                onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={config.primary_color}
                onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                placeholder="#8B5CF6"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.secondary_color}
                onChange={(e) => setConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={config.secondary_color}
                onChange={(e) => setConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                placeholder="#3B82F6"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Text Customization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Practice Information
          </h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name (appears on reports)
            </label>
            <input
              type="text"
              value={config.company_name}
              onChange={(e) => setConfig(prev => ({ ...prev, company_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Smile Dental Care"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tagline (optional)
            </label>
            <input
              type="text"
              value={config.tagline}
              onChange={(e) => setConfig(prev => ({ ...prev, tagline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Creating Beautiful Smiles Since 1995"
            />
          </div>
        </div>
      </div>
      
      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            PDF Header Preview
          </h3>
        </div>
        
        <div 
          className="p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700"
          style={{ background: `linear-gradient(135deg, ${config.primary_color}15 0%, ${config.secondary_color}15 100%)` }}
        >
          <div className="flex items-center justify-between">
            <div>
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-16 mb-3" />
              )}
              <h1 className="text-2xl font-bold" style={{ color: config.primary_color }}>
                {config.company_name || 'Your Practice Name'}
              </h1>
              {config.tagline && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {config.tagline}
                </p>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">Marketing Audit Report</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}

