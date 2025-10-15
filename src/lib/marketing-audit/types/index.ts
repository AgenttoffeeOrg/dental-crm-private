/**
 * Marketing Audit Module - TypeScript Type Definitions
 * 
 * Complete type definitions for the Marketing Audit & Benchmarking system.
 * These types match the database schema and API responses.
 */

// ============================================
// CORE AUDIT TYPES
// ============================================

export interface AuditRun {
  id: string;
  practice_id: string;
  domain: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Scores
  composite_score: number;
  technical_score: number;
  local_score: number;
  content_score: number;
  analytics_score: number;
  conversion_score: number;
  
  // Metadata
  run_type: 'manual' | 'scheduled' | 'triggered';
  phase: 1 | 2 | 3;
  peer_group_id?: string;
  percentile_rank?: number;
  
  // Error tracking
  error_message?: string;
  error_details?: any;
  
  // Timestamps
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  
  // Meta
  api_calls: Record<string, number>;
  api_costs_usd: number;
  
  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Multi-tenancy
  tenant_id: string;
  
  // Relationships (when populated)
  metrics?: AuditMetric[];
  recommendations?: Recommendation[];
  competitors?: Competitor[];
  alerts?: Alert[];
  benchmarking?: BenchmarkData;
}

export interface SubScore {
  score: number; // 0-100
  weight: number; // 0-1
  weighted_contribution: number;
}

export interface Scores {
  composite: number;
  technical: number;
  local: number;
  content: number;
  analytics: number;
  conversion: number;
}

// ============================================
// METRICS TYPES
// ============================================

export interface AuditMetric {
  id: string;
  run_id: string;
  
  category: 'technical' | 'local' | 'content' | 'analytics' | 'conversion';
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  
  source: 'psi' | 'gsc' | 'ga4' | 'places_api' | 'mobile_friendly' | 'brightlocal' | 'semrush' | 'manual' | 'calculated';
  raw_data?: any;
  evidence_url?: string;
  
  collected_at: string;
  tenant_id: string;
}

export interface TechnicalMetrics {
  core_web_vitals: {
    lcp: number; // seconds
    fid: number; // milliseconds
    cls: number; // score
    assessment: 'good' | 'needs_improvement' | 'poor';
  };
  lighthouse: {
    performance: number; // 0-100
    accessibility: number;
    best_practices: number;
    seo: number;
  };
  indexation: {
    indexed_pages: number;
    submitted_pages: number;
    coverage_ratio: number;
    errors: number;
    warnings: number;
  };
  https: boolean;
  mobile_friendly: boolean;
  has_sitemap: boolean;
}

export interface LocalMetrics {
  gbp_completeness: number; // 0-100
  reviews: {
    total_count: number;
    avg_rating: number;
    last_30_days: number;
    response_rate: number;
    avg_response_time_hours: number;
  };
  nap_consistency: number; // 0-100
  citations: {
    total_found: number;
    top_50_coverage: number;
    inconsistent: number;
  };
  local_pack_appearances: number;
}

export interface ContentMetrics {
  authority_score: number; // 0-100 (Semrush)
  referring_domains: number;
  total_backlinks: number;
  toxic_backlinks_percent: number;
  content_freshness_score: number;
  indexed_pages: number;
  organic_keywords: number;
}

export interface AnalyticsMetrics {
  ga4: {
    connected: boolean;
    custom_events: number;
    conversions: number;
    enhanced_measurement: boolean;
    data_months: number;
  };
  gsc: {
    connected: boolean;
    data_months: number;
    queries: number;
    clicks: number;
  };
  utm_usage_rate: number; // 0-100
  has_cookie_banner: boolean;
  privacy_policy: boolean;
}

export interface ConversionMetrics {
  has_online_booking: boolean;
  has_click_to_call: boolean;
  phone_in_header: boolean;
  contact_form_accessible: boolean;
  mobile_responsive: boolean;
  has_trust_signals: boolean;
  ctas_above_fold: number;
}

export interface AllMetrics {
  technical: TechnicalMetrics;
  local: LocalMetrics;
  content: ContentMetrics;
  analytics: AnalyticsMetrics;
  conversion: ConversionMetrics;
}

// ============================================
// RECOMMENDATIONS TYPES
// ============================================

export interface Recommendation {
  id: string;
  run_id: string;
  
  category: 'technical_seo' | 'local_presence' | 'content_authority' | 'analytics_hygiene' | 'conversion_ux';
  title: string;
  description: string;
  
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  
  estimated_hours: number;
  priority_score: number; // 0-100
  
  current_value?: number;
  target_value?: number;
  
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed' | 'archived';
  
  // CRM Integration
  task_id?: string;
  deal_id?: string;
  
  // Evidence
  evidence: Evidence[];
  action_steps: string[];
  
  // Tracking
  completed_at?: string;
  dismissed_at?: string;
  dismissed_reason?: string;
  
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface Evidence {
  metric: string;
  source: string;
  value: number | string;
  url?: string;
  timestamp?: string;
}

// ============================================
// COMPETITORS TYPES
// ============================================

export interface Competitor {
  id: string;
  run_id: string;
  
  competitor_name: string;
  competitor_domain?: string;
  competitor_place_id?: string;
  competitor_address?: string;
  
  // Scores
  composite_score: number;
  technical_score?: number;
  local_score?: number;
  content_score?: number;
  analytics_score?: number;
  conversion_score?: number;
  
  // Key metrics
  metrics: {
    reviews_count: number;
    avg_rating: number;
    referring_domains?: number;
    indexed_pages?: number;
  };
  
  rank: number;
  distance_miles?: number;
  
  discovered_at: string;
  last_updated_at: string;
  tenant_id: string;
}

// ============================================
// BENCHMARKING TYPES
// ============================================

export interface BenchmarkData {
  peer_group_id?: string;
  peer_count: number;
  your_rank: number;
  percentile: number;
  gap_to_median: number;
  gap_to_top_3_avg: number;
}

export interface PeerGroup {
  id: string;
  practice_id: string;
  
  name: string;
  description?: string;
  
  // Auto-discovery criteria
  auto_discover: boolean;
  category?: string;
  radius_miles: number;
  center_lat?: number;
  center_lng?: number;
  max_competitors: number;
  
  // Manual members
  manual_competitor_ids: string[];
  excluded_competitor_ids: string[];
  
  is_default: boolean;
  
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

// ============================================
// SCHEDULING TYPES
// ============================================

export interface AuditSchedule {
  id: string;
  practice_id: string;
  
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  day_of_week?: number; // 0-6
  day_of_month?: number; // 1-31
  time_of_day: string; // HH:mm:ss
  timezone: string;
  
  enabled: boolean;
  next_run_at?: string;
  last_run_at?: string;
  last_run_id?: string;
  
  // Notifications
  notify_on_completion: boolean;
  notify_on_regression: boolean;
  regression_threshold: number;
  notification_emails: string[];
  
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

// ============================================
// ALERTS TYPES
// ============================================

export interface Alert {
  id: string;
  run_id: string;
  practice_id: string;
  
  alert_type: 'regression' | 'achievement' | 'warning' | 'critical' | 'info';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  title: string;
  description: string;
  
  metric_name?: string;
  previous_value?: number;
  current_value?: number;
  delta?: number;
  
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  
  notification_sent: boolean;
  notification_sent_at?: string;
  
  tenant_id: string;
}

// ============================================
// API CREDENTIALS TYPES
// ============================================

export interface APICredential {
  id: string;
  practice_id: string;
  
  provider: 'google' | 'brightlocal' | 'semrush' | 'ahrefs' | 'moz';
  
  // Encrypted tokens
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at?: string;
  
  scopes: string[];
  
  // OAuth state
  authorization_url?: string;
  state?: string;
  code_verifier?: string;
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'error';
  last_error?: string;
  
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PSIResponse {
  captchaResult: string;
  kind: string;
  id: string;
  loadingExperience: any;
  lighthouseResult: {
    requestedUrl: string;
    finalUrl: string;
    lighthouseVersion: string;
    userAgent: string;
    fetchTime: string;
    environment: any;
    runWarnings: string[];
    configSettings: any;
    audits: Record<string, any>;
    categories: {
      performance: { score: number };
      accessibility: { score: number };
      'best-practices': { score: number };
      seo: { score: number };
    };
  };
}

export interface CoreWebVitals {
  lcp: number;
  fid: number;
  cls: number;
  assessment: 'good' | 'needs_improvement' | 'poor';
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ============================================
// META TYPES
// ============================================

export interface MetaData {
  api_calls: Record<string, number>;
  api_costs_usd: number;
  processing_time_seconds: number;
  data_sources: string[];
  phase: 'phase_1' | 'phase_2' | 'phase_3';
}

// ============================================
// PRACTICE TYPE (for reference)
// ============================================

export interface Practice {
  id: string;
  name: string;
  domain: string;
  place_id?: string;
  lat?: number;
  lng?: number;
  address?: string;
  phone?: string;
  category?: string;
  radius_miles?: number;
  ga4_property_id?: string;
  gsc_property_url?: string;
  tenant_id: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export type ImpactLevel = 'high' | 'medium' | 'low';
export type EffortLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type MetricCategory = 'technical' | 'local' | 'content' | 'analytics' | 'conversion';
export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RecommendationStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed' | 'archived';

