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

// Lead Management Interfaces
export interface DentalService {
  id: string;
  tenant_id: string;
  name: string;
  category: 'treatment' | 'preventive' | 'cosmetic' | 'emergency';
  description?: string;
  average_value_cents?: number;
  typical_duration_days?: number;
  keywords: string[];
  color?: string;
  active: boolean;
  created_at: string;
}

export interface LeadSource {
  id: string;
  tenant_id: string;
  name: string;
  source_type: 'facebook_ads' | 'instagram' | 'google_ads' | 'whatsapp' | 'website' | 'referral' | 'walk_in' | 'phone' | 'email' | 'other';
  integration_config?: Record<string, unknown>;
  auto_categorization_rules?: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export interface LeadIntake {
  id: string;
  tenant_id: string;
  lead_source_id?: string;
  contact_id?: string;
  deal_id?: string;
  dental_service_id?: string;
  original_message?: string;
  lead_score: number;
  qualification_status: 'unqualified' | 'qualified' | 'disqualified';
  auto_categorized: boolean;
  categorization_confidence: number;
  suggested_services?: string[];
  external_id?: string;
  raw_data?: Record<string, unknown>;
  processed_at?: string;
  created_at: string;
}

// Extended types for lead management
export interface LeadIntakeWithRelations extends LeadIntake {
  lead_source?: LeadSource;
  dental_service?: DentalService;
  contact?: Contact;
  deal?: Deal;
}

export interface DealWithLeadInfo extends DealWithRelations {
  dental_service?: DentalService;
  lead_intake?: LeadIntake;
}

export interface ContactWithLeadInfo extends ContactWithRelations {
  lead_source?: LeadSource;
}

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
