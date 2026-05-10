// Database entity types matching the Supabase schema

export interface Tenant {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  tenant_id: string | null; // Nullable - users can exist without tenants (membership-based architecture)
  full_name: string;
  email?: string;
  status?: string;
  avatar_url?: string;
  timezone?: string;
  profile_id?: string;
  custom_role_id?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at?: string;
  // Email verification status (added by auth hook)
  email_verified?: boolean;
  email_confirmed_at?: string | null;
}

export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_admin: boolean;
  is_system_role: boolean;
  color: string;
  icon?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionDefinition {
  key: string;
  category: string;
  subcategory?: string;
  label: string;
  description?: string;
  requires_ownership: boolean;
  display_order: number;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_key: string;
  granted: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  role_id?: string;
  settings: Record<string, any>;
  created_by_user_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditTrail {
  id: string;
  tenant_id: string;
  user_id?: string;
  action_type: string;
  action_category: string;
  action_description?: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  changed_fields?: string[];
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  visible_to_admin_only: boolean;
  sensitive_data: boolean;
  tags?: string[];
  severity: string;
  created_at: string;
}

export interface PipelineSettings {
  id: string;
  pipeline_id: string;
  tenant_id: string;
  icon?: string;
  color?: string;
  visibility: string;
  visible_to_role_ids?: string[];
  auto_assignment_enabled: boolean;
  auto_assignment_rules?: Record<string, any>;
  enforce_stage_order: boolean;
  stage_time_limits?: Record<string, any>;
  required_fields_per_stage?: Record<string, any>;
  notify_on_stage_change: boolean;
  notify_on_stuck_deal: boolean;
  stuck_deal_threshold_days: number;
  email_templates_per_stage?: Record<string, any>;
  duplicate_prevention: boolean;
  value_min_threshold_cents?: number;
  value_max_threshold_cents?: number;
  require_treatment_tags: boolean;
  webhook_url?: string;
  webhook_events?: string[];
  created_at: string;
  updated_at: string;
}

export interface DealSettings {
  id: string;
  tenant_id: string;
  required_fields?: string[];
  custom_fields?: Record<string, any>;
  field_visibility_by_role?: Record<string, any>;
  value_min_cents: number;
  value_max_cents?: number;
  allow_zero_value: boolean;
  currency_options?: string[];
  default_currency: string;
  duplicate_detection_enabled: boolean;
  duplicate_check_fields?: string[];
  auto_archive_after_days?: number;
  auto_close_lost_after_days?: number;
  required_treatment_tags: boolean;
  min_treatment_tags: number;
  max_treatment_tags?: number;
  allowed_treatment_tags?: string[];
  allow_unassigned: boolean;
  auto_assign_new_deals: boolean;
  assignment_method: string;
  default_stage_id?: string;
  won_stage_ids?: string[];
  lost_stage_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  full_name: string;
  primary_phone?: string;
  primary_email?: string;
  source?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  value_estimate_cents: number;
  currency: string;
  treatment_tags: string[];
  owner_user_id?: string;
  source?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  // Marketing Integration Fields
  marketing_source_type?: string; // 'campaign', 'form', 'landing_page', 'journey', 'manual'
  marketing_source_id?: string;
  marketing_source_name?: string;
  marketing_touchpoints?: any[]; // Array of touchpoint objects
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignee_user_id?: string;
  due_at?: string;
  contact_id?: string;
  deal_id?: string;
  auto_created: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  tenant_id: string;
  type: 'call' | 'email' | 'whatsapp' | 'sms' | 'note';
  direction?: 'inbound' | 'outbound';
  contact_id?: string;
  deal_id?: string;
  occurred_at: string;
  agent_user_id?: string;
  subject?: string;
  snippet?: string;
  /**
   * Long-form body. Populated by ingestLead-driven inbound rows (web form,
   * Google lead form, SMS, WhatsApp, etc.) with the channel message text.
   * Activity feeds should fall back to this when `snippet` is empty so
   * inbound message bodies are visible in the UI.
   */
  description?: string;
  raw?: Record<string, unknown>;
  created_at: string;
}

export interface File {
  id: string;
  tenant_id: string;
  kind: 'audio' | 'attachment' | 'image' | 'other';
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
  created_at: string;
}

export interface ActivityFile {
  activity_id: string;
  file_id: string;
}

export interface AIArtifact {
  id: string;
  tenant_id: string;
  activity_id: string;
  kind: 'transcript' | 'summary' | 'intent' | 'treatments' | 'actions' | 'conversation_analysis' | 'sentiment' | 'urgency';
  data: Record<string, unknown>;
  confidence: number;
  created_at: string;
}

export interface Audit {
  id: number;
  tenant_id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
}

// Extended types with joins for UI components
export interface DealWithRelations extends Deal {
  contact: Contact;
  stage: PipelineStage;
  owner?: AppUser;
  activities?: Activity[];
  tasks?: Task[];
}

export interface TaskWithRelations extends Task {
  contact?: Contact;
  deal?: Deal;
  assignee?: AppUser;
}

export interface ActivityWithRelations extends Activity {
  contact?: Contact;
  deal?: Deal;
  agent?: AppUser;
  files?: File[];
  activity_files?: Array<{
    file_id: string;
    files: File;
  }>;
  ai_artifacts?: AIArtifact[];
}

export interface ContactWithRelations extends Contact {
  deals?: Deal[];
  activities?: Activity[];
  tasks?: Task[];
}

// AI processing types
export interface AICallSummary {
  summary_bullets: string[];
  intent: 'new_lead' | 'existing_patient' | 'complaint' | 'appointment_request' | 'treatment_enquiry';
  treatments: string[];
  confidence: number;
  next_actions: {
    title: string;
    due_hours: number;
  }[];
}

// Form types
export interface CreateContactForm {
  full_name: string;
  primary_phone?: string;
  primary_email?: string;
  source?: string;
  tags: string[];
}

export interface CreateDealForm {
  contact_id: string;
  title: string;
  value_estimate_cents?: number;
  treatment_tags: string[];
  source?: string;
}

export interface CreateTaskForm {
  title: string;
  description?: string;
  priority: Task['priority'];
  assignee_user_id?: string;
  due_at?: string;
  contact_id?: string;
  deal_id?: string;
}

export interface CreateActivityForm {
  type: Activity['type'];
  direction?: Activity['direction'];
  contact_id?: string;
  deal_id?: string;
  subject?: string;
  snippet?: string;
}

// Filter types
export interface DealFilters {
  owner_user_id?: string;
  treatment_tags?: string[];
  search?: string;
  stage_id?: string;
}

export interface TaskFilters {
  assignee_user_id?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  overdue?: boolean;
  due_today?: boolean;
  search?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Treatment tags (used throughout the app)
export const TREATMENT_TAGS = [
  'implants',
  'invisalign',
  'whitening',
  'hygiene',
  'emergency',
  'root_canal',
  'extraction',
  'veneers',
  'crowns',
  'bridges',
  'dentures',
  'orthodontics',
  'periodontics',
  'endodontics',
  'oral_surgery',
  'cosmetic',
  'preventive',
  'restorative',
] as const;

export type TreatmentTag = typeof TREATMENT_TAGS[number];

// Phase 2a.5: removed DentalService, LeadSource, LeadIntake,
// LeadIntakeWithRelations, DealWithLeadInfo, ContactWithLeadInfo interfaces.
// The underlying tables (lead_intakes, lead_sources) and the
// dental_services-based lead intake pipeline predated ingestLead() and were
// never wired to it. The tables were dropped in migration
// 20260504_phase_2a_5_drop_legacy_lead_intake.sql. Use the canonical
// attribution_touchpoints / treatment_offerings / deals types instead.

// Lead categorization result
export interface LeadCategorizationResult {
  service_id: string;
  confidence: number;
  service_name: string;
}

// Lead intake analytics
export interface LeadPipelineAnalytics {
  service_name: string;
  service_category: string;
  source_name: string;
  source_type: string;
  total_leads: number;
  qualified_leads: number;
  converted_deals: number;
  avg_lead_score: number;
  total_pipeline_value: number;
}

export type ScriptTrigger =
  | 'price_objection'
  | 'dental_anxiety'
  | 'timing_conflict'
  | 'trust_and_credibility'
  | 'finance_and_insurance'
  | 'alternative_seeking'
  | 'pain_urgency'
  | 'second_opinion'
  | 'universal';

export interface SalesScript {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description?: string | null;
  persona?: string | null;
  stage_id?: string | null;
  is_active: boolean;
  category?: string | null;
  marketing_hook?: string | null;
  created_by?: string | null;
  archived_at?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SalesScriptVersion {
  id: string;
  tenant_id: string;
  script_id: string;
  slug: string;
  version_number: number;
  title: string;
  content: string;
  trigger_type?: ScriptTrigger | null;
  persona_tags: string[];
  tone_descriptor?: string | null;
  target_persona?: string | null;
  hypothesis?: string | null;
  rollout_strategy?: string | null;
  variant_label?: string | null;
  estimated_duration_seconds?: number | null;
  usage_count: number;
  helpful_count: number;
  success_rate: number;
  last_used_at?: string | null;
  outcome_count: number;
  positive_outcome_count: number;
  total_revenue_cents: number;
  last_outcome_at?: string | null;
  metadata: Record<string, any>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SalesScriptUsage {
  id: string;
  tenant_id: string;
  script_id: string;
  script_version_id: string;
  contact_id?: string | null;
  deal_id?: string | null;
  activity_id?: string | null;
  trigger_type?: string | null;
  persona_snapshot: Record<string, any>;
  used_by?: string | null;
  used_at: string;
  helpful?: boolean | null;
  helpful_recorded_at?: string | null;
  feedback?: string | null;
  context: Record<string, any>;
  metadata: Record<string, any>;
}

export interface ConversationOutcome {
  id: string;
  tenant_id: string;
  usage_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  activity_id?: string | null;
  outcome_type: 'appointment_booked' | 'deal_won' | 'deal_lost' | 'follow_up' | 'not_helpful' | 'other';
  outcome_score?: number | null;
  notes?: string | null;
  revenue_cents: number;
  occurred_at: string;
  recorded_by?: string | null;
  metadata: Record<string, any>;
}

export interface ContactPsychProfile {
  id: string;
  tenant_id: string;
  contact_id: string;
  location_id?: string | null;
  snapshot: Record<string, any>;
  anxiety_level?: number | null;
  trust_score?: number | null;
  decision_style?: string | null;
  communication_style?: string | null;
  recorded_at: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ContactPsychProfileHistory {
  id: string;
  tenant_id: string;
  contact_id: string;
  profile_id?: string | null;
  snapshot: Record<string, any>;
  recorded_at: string;
  recorded_by?: string | null;
  created_at: string;
}

export type EngagementCampaignStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface EngagementCampaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: EngagementCampaignStatus;
  trigger_config: Record<string, any>;
  schedule_config: Record<string, any>;
  ai_config: Record<string, any>;
  timezone: string;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export type EngagementStepType =
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'wait'
  | 'ai_message'
  | 'notify_human'
  | 'webhook'
  | 'branch';

export interface EngagementStep {
  id: string;
  tenant_id: string;
  campaign_id: string;
  step_order: number;
  step_type: EngagementStepType;
  config: Record<string, any>;
  wait_duration_seconds?: number;
  ai_prompt?: string;
  branch_conditions?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type EngagementEnrollmentStatus =
  | 'pending'
  | 'active'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface EngagementEnrollment {
  id: string;
  tenant_id: string;
  campaign_id: string;
  contact_id?: string;
  deal_id?: string;
  status: EngagementEnrollmentStatus;
  current_step_order: number;
  next_run_at?: string;
  last_run_at?: string;
  context: Record<string, any>;
  metadata?: Record<string, any>;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface EngagementEvent {
  id: string;
  tenant_id: string;
  campaign_id?: string;
  enrollment_id?: string;
  step_id?: string;
  event_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  payload: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export type BotSessionStatus = 'active' | 'paused' | 'escalated' | 'closed';
export type BotChannel = 'web' | 'sms' | 'whatsapp' | 'voice' | 'api';

export interface BotSession {
  id: string;
  tenant_id: string;
  contact_id?: string;
  deal_id?: string;
  channel: BotChannel;
  status: BotSessionStatus;
  context: Record<string, any>;
  automation_source?: string;
  assigned_user_id?: string;
  created_by_user_id?: string;
  started_at: string;
  last_activity_at: string;
  closed_at?: string;
  metadata?: Record<string, any>;
}

export type BotTurnRole = 'patient' | 'bot' | 'human' | 'system';

export interface BotTurn {
  id: string;
  tenant_id: string;
  session_id: string;
  role: BotTurnRole;
  message: string;
  metadata?: Record<string, any>;
  confidence_score?: number;
  intent?: string;
  created_at: string;
}

export type BotEscalationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

export interface BotEscalation {
  id: string;
  tenant_id: string;
  session_id: string;
  reason: string;
  requested_by: 'patient' | 'bot' | 'human';
  status: BotEscalationStatus;
  assigned_user_id?: string;
  resolved_by_user_id?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface QueueAlertRule {
  id: string;
  tenant_id?: string | null;
  queue_name: string;
  label: string;
  max_waiting_jobs?: number | null;
  max_delayed_jobs?: number | null;
  max_failed_jobs?: number | null;
  max_oldest_job_seconds?: number | null;
  notify_via: string[];
  enabled: boolean;
  created_by_user_id?: string | null;
  updated_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface QueueHealthIncident {
  id: string;
  rule_id?: string | null;
  tenant_id?: string | null;
  queue_name: string;
  incident_type: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  metrics: Record<string, any>;
  detected_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  acknowledged_by_user_id?: string | null;
  resolved_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupVerificationRun {
  id: string;
  tenant_id?: string | null;
  environment: string;
  status: 'pass' | 'fail' | 'skipped';
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  details: Record<string, any>;
  log_url?: string | null;
  initiated_by_user_id?: string | null;
  created_at: string;
}

export interface FeatureFlagRegistry {
  id: string;
  flag_key: string;
  name: string;
  description?: string | null;
  category: string;
  rollout_type: string;
  default_enabled: boolean;
  allow_tenant_override: boolean;
  metadata: Record<string, any>;
  created_by_user_id?: string | null;
  updated_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagAssignment {
  id: string;
  flag_id: string;
  tenant_id?: string | null;
  environment: string;
  enabled: boolean;
  variant?: string | null;
  rollout_percentage?: number | null;
  reason?: string | null;
  expires_at?: string | null;
  metadata: Record<string, any>;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagAuditLog {
  id: string;
  flag_id?: string | null;
  tenant_id?: string | null;
  environment: string;
  action: 'created' | 'updated' | 'deleted' | 'override_enabled' | 'override_disabled';
  previous_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  context?: Record<string, any> | null;
  performed_by_user_id?: string | null;
  performed_at: string;
}

export interface Competitor {
  id: string;
  tenant_id: string;
  name: string;
  website?: string | null;
  primary_location?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CompetitorPricePoint {
  id: string;
  tenant_id: string;
  competitor_id: string;
  treatment_code?: string | null;
  treatment_name?: string | null;
  price_cents?: number | null;
  collected_at: string;
  source?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CompetitorTouchpoint {
  id: string;
  tenant_id: string;
  competitor_id: string;
  touchpoint_type: string;
  occurred_at: string;
  summary?: string | null;
  link?: string | null;
  captured_by?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CompetitorDocument {
  id: string;
  tenant_id: string;
  competitor_id?: string | null;
  document_path: string;
  source?: string | null;
  captured_at: string;
  checksum?: string | null;
  metadata: Record<string, any>;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type CompetitorIngestionStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface CompetitorIngestionJob {
  id: string;
  tenant_id?: string | null;
  source_name: string;
  source_type: 'manual' | 'webhook' | 'scheduled' | 'api';
  status: CompetitorIngestionStatus;
  payload: Record<string, any>;
  result_summary?: Record<string, any> | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}
