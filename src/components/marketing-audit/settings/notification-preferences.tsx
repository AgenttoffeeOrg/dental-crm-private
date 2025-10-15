/**
 * Notification Preferences Component
 * 
 * Manage email and in-app notification settings for audits.
 * UX Focus: Clear controls, instant feedback, sensible defaults.
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface NotificationPreferencesProps {
  practiceId: string;
}

export function NotificationPreferences({ practiceId }: NotificationPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [preferences, setPreferences] = useState({
    email_audit_complete: true,
    email_score_regression: true,
    email_new_competitor: false,
    email_weekly_summary: true,
    email_monthly_report: true,
    inapp_audit_complete: true,
    inapp_score_regression: true,
    inapp_new_recommendation: true,
    push_critical_alerts: true,
  });
  
  useEffect(() => {
    fetchPreferences();
  }, [practiceId]);
  
  async function fetchPreferences() {
    const supabase = createClient();
    const { data } = await supabase
      .from('marketing_audit_notification_preferences')
      .select('*')
      .eq('practice_id', practiceId)
      .single();
    
    if (data) {
      setPreferences(data.preferences);
    }
    
    setLoading(false);
  }
  
  async function handleSave() {
    setSaving(true);
    
    const supabase = createClient();
    await supabase
      .from('marketing_audit_notification_preferences')
      .upsert({
        practice_id: practiceId,
        preferences,
        updated_at: new Date().toISOString(),
      });
    
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }
  
  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Notifications
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Receive updates via email
          </p>
        </div>
        
        <div className="p-5 space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Audit Complete
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get notified when scheduled audits finish
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_audit_complete}
              onChange={() => togglePreference('email_audit_complete')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Score Regression Alert
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Alert when your score drops significantly (>5 points)
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_score_regression}
              onChange={() => togglePreference('email_score_regression')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                New Competitor Detected
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get notified when new competitors appear in your area
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_new_competitor}
              onChange={() => togglePreference('email_new_competitor')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Weekly Summary
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Weekly digest of your marketing performance
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_weekly_summary}
              onChange={() => togglePreference('email_weekly_summary')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Monthly Report
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive monthly marketing report
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_monthly_report}
              onChange={() => togglePreference('email_monthly_report')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
        </div>
      </div>
      
      {/* In-App Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              In-App Notifications
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            See notifications while using the app
          </p>
        </div>
        
        <div className="p-5 space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Audit Complete
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Show banner when audit finishes
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.inapp_audit_complete}
              onChange={() => togglePreference('inapp_audit_complete')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Score Regression
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Alert when score drops
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.inapp_score_regression}
              onChange={() => togglePreference('inapp_score_regression')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                New Recommendations
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Notify when new high-priority recommendations appear
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.inapp_new_recommendation}
              onChange={() => togglePreference('inapp_new_recommendation')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
        </div>
      </div>
      
      {/* Push Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Push Notifications
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Receive push notifications on your device
          </p>
        </div>
        
        <div className="p-5 space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Critical Alerts Only
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Only urgent issues (website down, major score drop, etc.)
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.push_critical_alerts}
              onChange={() => togglePreference('push_critical_alerts')}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Preferences saved
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

