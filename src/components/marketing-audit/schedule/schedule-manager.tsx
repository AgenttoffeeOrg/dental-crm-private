/**
 * Schedule Manager Component
 * 
 * Complete schedule management UI with create/edit/delete.
 * UX Focus: Simple scheduling, clear next run time, easy management.
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Play, Pause, Trash2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { ScheduleModal } from './schedule-modal';
import { formatScheduleDescription } from '@/lib/marketing-audit/utils/date-helpers';
import { EmptyState } from '../shared/empty-state';

interface ScheduleManagerProps {
  practiceId: string;
}

export function ScheduleManager({ practiceId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  
  useEffect(() => {
    fetchSchedules();
  }, [practiceId]);
  
  async function fetchSchedules() {
    const supabase = createClient();
    const { data } = await supabase
      .from('marketing_audit_schedules')
      .select('*')
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false });
    
    setSchedules(data || []);
    setLoading(false);
  }
  
  async function handleToggleActive(scheduleId: string, currentActive: boolean) {
    const supabase = createClient();
    await supabase
      .from('marketing_audit_schedules')
      .update({ active: !currentActive })
      .eq('id', scheduleId);
    
    fetchSchedules();
  }
  
  async function handleDelete(scheduleId: string) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    const supabase = createClient();
    await supabase
      .from('marketing_audit_schedules')
      .delete()
      .eq('id', scheduleId);
    
    fetchSchedules();
  }
  
  function handleEdit(schedule: any) {
    setEditingSchedule(schedule);
    setShowModal(true);
  }
  
  function handleModalClose() {
    setShowModal(false);
    setEditingSchedule(null);
    fetchSchedules();
  }
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }
  
  if (schedules.length === 0) {
    return (
      <>
        <EmptyState
          icon={Calendar}
          title="No Scheduled Audits"
          description="Schedule automated audits to track your marketing performance over time without manual work."
          action={{
            label: 'Create Schedule',
            onClick: () => setShowModal(true),
          }}
        />
        
        <ScheduleModal
          isOpen={showModal}
          onClose={handleModalClose}
          practiceId={practiceId}
        />
      </>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Audit Schedules
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>
      
      {/* Schedules List */}
      <div className="space-y-3">
        {schedules.map(schedule => {
          const nextRun = schedule.next_run_at ? new Date(schedule.next_run_at) : null;
          const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
          
          return (
            <div
              key={schedule.id}
              className={`
                bg-white dark:bg-gray-800 rounded-lg border-2 p-5
                ${schedule.active 
                  ? 'border-green-200 dark:border-green-800' 
                  : 'border-gray-200 dark:border-gray-700'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Schedule Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`
                      p-2 rounded-lg
                      ${schedule.active 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-gray-100 dark:bg-gray-700'
                      }
                    `}>
                      <Calendar className={`w-5 h-5 ${
                        schedule.active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatScheduleDescription(
                          schedule.frequency,
                          schedule.day_of_week,
                          schedule.day_of_month,
                          schedule.hour
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {schedule.email_report && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email enabled
                          </span>
                        )}
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                          ${schedule.active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }
                        `}>
                          {schedule.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timing Info */}
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    {nextRun && schedule.active && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Next run: {nextRun.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    {lastRun && (
                      <div>
                        Last run: {lastRun.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(schedule.id, schedule.active)}
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    title={schedule.active ? 'Pause schedule' : 'Resume schedule'}
                  >
                    {schedule.active ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showModal}
        onClose={handleModalClose}
        existingSchedule={editingSchedule}
        practiceId={practiceId}
      />
    </div>
  );
}

