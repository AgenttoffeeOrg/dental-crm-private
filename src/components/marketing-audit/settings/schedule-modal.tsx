/**
 * Schedule Audit Modal Component
 * 
 * UX Focus: Simple, clear scheduling interface.
 * Architecture: Handles schedule CRUD operations.
 */

'use client';

import { useState } from 'react';
import { X, Calendar, Mail, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSchedule?: {
    id: string;
    frequency: 'weekly' | 'monthly';
    day_of_week?: number;
    day_of_month?: number;
    hour: number;
    email_report: boolean;
    active: boolean;
  };
  practiceId: string;
}

export function ScheduleModal({ isOpen, onClose, existingSchedule, practiceId }: ScheduleModalProps) {
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>(existingSchedule?.frequency || 'monthly');
  const [dayOfWeek, setDayOfWeek] = useState(existingSchedule?.day_of_week || 1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(existingSchedule?.day_of_month || 1);
  const [hour, setHour] = useState(existingSchedule?.hour || 9);
  const [emailReport, setEmailReport] = useState(existingSchedule?.email_report ?? true);
  const [active, setActive] = useState(existingSchedule?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!isOpen) return null;
  
  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];
  
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`,
  }));
  
  async function handleSave() {
    setSaving(true);
    setError(null);
    
    const supabase = createClient();
    
    const scheduleData = {
      practice_id: practiceId,
      frequency,
      day_of_week: frequency === 'weekly' ? dayOfWeek : null,
      day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      hour,
      email_report: emailReport,
      active,
    };
    
    try {
      if (existingSchedule) {
        // Update
        const { error: updateError } = await supabase
          .from('marketing_audit_schedules')
          .update(scheduleData)
          .eq('id', existingSchedule.id);
        
        if (updateError) throw updateError;
      } else {
        // Create
        const { error: createError } = await supabase
          .from('marketing_audit_schedules')
          .insert([scheduleData]);
        
        if (createError) throw createError;
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {existingSchedule ? 'Edit Schedule' : 'Schedule Audits'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFrequency('weekly')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  frequency === 'weekly'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <div className="text-sm font-medium">Weekly</div>
              </button>
              <button
                onClick={() => setFrequency('monthly')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  frequency === 'monthly'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <div className="text-sm font-medium">Monthly</div>
              </button>
            </div>
          </div>
          
          {/* Day Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
            </label>
            {frequency === 'weekly' ? (
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {daysOfWeek.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            ) : (
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            )}
          </div>
          
          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time (UTC)
            </label>
            <select
              value={hour}
              onChange={(e) => setHour(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {hours.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          
          {/* Email Report */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Report
                </div>
                <div className="text-xs text-gray-500">
                  Receive email when audit completes
                </div>
              </div>
            </div>
            <button
              onClick={() => setEmailReport(!emailReport)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailReport ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailReport ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Active
              </div>
              <div className="text-xs text-gray-500">
                {active ? 'Schedule is running' : 'Schedule is paused'}
              </div>
            </div>
            <button
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : existingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

