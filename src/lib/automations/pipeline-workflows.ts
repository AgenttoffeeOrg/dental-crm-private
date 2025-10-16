/**
 * PIPELINE AUTOMATION WORKFLOWS
 * 
 * Pre-built automation templates for pipeline management
 */

import { WorkflowTemplate } from './prebuilt-workflows'

export const PIPELINE_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'pipeline_capacity_alert',
    name: 'Pipeline Capacity → Pause & Alert',
    description: 'When pipeline reaches 80% capacity, pause new assignments and alert manager',
    category: 'pipeline',
    icon: 'AlertTriangle',
    trigger_type: 'pipeline_capacity_reached',
    trigger_config: {
      threshold_percent: 80,
    },
    actions: [
      {
        type: 'pause_pipeline_intake',
        config: {
          reason: 'Capacity reached (80%)',
        },
      },
      {
        type: 'send_notification',
        config: {
          message: 'Pipeline at 80% capacity - intake paused',
          priority: 'urgent',
          to_role: 'manager',
        },
      },
      {
        type: 'send_email',
        config: {
          template_id: 'pipeline_capacity_alert',
          subject: 'Pipeline Capacity Alert',
          to_role: 'manager',
        },
      },
    ],
  },

  {
    id: 'bottleneck_escalation',
    name: 'Bottleneck Detected → Escalate',
    description: 'When stage has 10+ stuck deals, notify manager and create review task',
    category: 'pipeline',
    icon: 'AlertOctagon',
    trigger_type: 'pipeline_bottleneck',
    trigger_config: {
      stuck_deals_min: 10,
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          message: 'Bottleneck detected in pipeline',
          priority: 'urgent',
          to_role: 'manager',
        },
      },
      {
        type: 'create_task',
        config: {
          title: '🚨 Review pipeline bottleneck',
          priority: 'urgent',
          due_in_hours: 4,
          assign_to_role: 'manager',
        },
      },
    ],
  },

  {
    id: 'velocity_slow_alert',
    name: 'Slow Velocity → Manager Alert',
    description: 'When pipeline velocity drops below target, alert manager for review',
    category: 'pipeline',
    icon: 'TrendingDown',
    trigger_type: 'pipeline_velocity_slow',
    trigger_config: {},
    actions: [
      {
        type: 'send_notification',
        config: {
          message: 'Pipeline velocity below target',
          priority: 'high',
          to_role: 'manager',
        },
      },
      {
        type: 'generate_report',
        config: {
          report_type: 'velocity_analysis',
        },
      },
    ],
  },

  {
    id: 'stage_sla_escalation',
    name: 'Stage SLA Breach → Escalate Deal',
    description: 'When deal exceeds stage SLA, escalate to manager and create urgent task',
    category: 'pipeline',
    icon: 'Clock',
    trigger_type: 'stage_sla_breached',
    trigger_config: {},
    actions: [
      {
        type: 'create_task',
        config: {
          title: '⚠️ SLA breach - immediate action needed',
          priority: 'urgent',
          due_in_hours: 2,
          assign_to_role: 'manager',
        },
      },
      {
        type: 'send_notification',
        config: {
          message: 'Deal has breached stage SLA',
          priority: 'urgent',
          to_user: 'owner',
        },
      },
      {
        type: 'wait',
        config: {
          duration: 2,
          unit: 'hours',
        },
        delay_minutes: 120,
      },
      {
        type: 'send_notification',
        config: {
          message: 'Escalating SLA breach to manager',
          priority: 'urgent',
          to_role: 'manager',
        },
      },
    ],
  },
]

