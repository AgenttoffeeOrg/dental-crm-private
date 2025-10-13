/**
 * MARKETING ACTIVITY EVENT HELPERS
 * Styling and icons for marketing event types in activity timelines
 */

import { Mail, MousePointerClick, FileText, Zap, TrendingUp } from 'lucide-react';

export type MarketingEventType = 
  | 'email_sent'
  | 'email_opened'
  | 'email_bounced'
  | 'link_clicked'
  | 'form_filled'
  | 'journey_step'
  | 'campaign_received';

export function getMarketingEventIcon(eventType: string) {
  switch (eventType) {
    case 'email_sent':
      return Mail;
    case 'email_opened':
      return Mail;
    case 'email_bounced':
      return Mail;
    case 'link_clicked':
      return MousePointerClick;
    case 'form_filled':
      return FileText;
    case 'journey_step':
      return Zap;
    case 'campaign_received':
      return TrendingUp;
    default:
      return Mail;
  }
}

export function getMarketingEventColor(eventType: string): string {
  switch (eventType) {
    case 'email_sent':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'email_opened':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'email_bounced':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'link_clicked':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'form_filled':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'journey_step':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'campaign_received':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getMarketingEventLabel(eventType: string): string {
  switch (eventType) {
    case 'email_sent':
      return 'Campaign Email Sent';
    case 'email_opened':
      return 'Email Opened';
    case 'email_bounced':
      return 'Email Bounced';
    case 'link_clicked':
      return 'Link Clicked';
    case 'form_filled':
      return 'Form Submitted';
    case 'journey_step':
      return 'Journey Step';
    case 'campaign_received':
      return 'Campaign Received';
    default:
      return 'Marketing Event';
  }
}

export function isMarketingEvent(activity: any): boolean {
  return !!(activity.marketing_event_type || activity.marketing_campaign_id);
}

export function getEngagementIndicator(eventType: string): { show: boolean; icon: any; label: string } | null {
  switch (eventType) {
    case 'email_opened':
      return { show: true, icon: MousePointerClick, label: 'Opened' };
    case 'link_clicked':
      return { show: true, icon: MousePointerClick, label: 'Clicked' };
    case 'form_filled':
      return { show: true, icon: FileText, label: 'Submitted' };
    default:
      return null;
  }
}

