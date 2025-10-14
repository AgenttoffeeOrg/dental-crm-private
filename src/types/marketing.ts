// Marketing Module TypeScript Interfaces
// Maps to marketing database tables

export interface MarketingAudience {
  id: string
  tenant_id: string
  name: string
  description?: string
  created_by_user_id?: string
  is_active: boolean
  contact_count: number
  last_refreshed_at?: string
  created_at: string
  updated_at: string
}

export interface MarketingSegment {
  id: string
  tenant_id: string
  audience_id?: string
  name: string
  description?: string
  definition_json: SegmentDefinition
  is_saved: boolean
  is_dynamic: boolean
  contact_count: number
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface SegmentDefinition {
  conditions: SegmentCondition[]
  operator: 'AND' | 'OR'
}

export interface SegmentCondition {
  field: string // Contact field name
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in'
  value: any
  type?: 'tag' | 'field' | 'behavior' | 'date'
}

export interface MarketingTag {
  id: string
  tenant_id: string
  name: string
  description?: string
  color: string
  category?: string
  usage_count: number
  created_at: string
}

export interface ContactSegmentMembership {
  id: string
  tenant_id: string
  contact_id: string
  segment_id: string
  added_at: string
  last_qualified_at: string
}

export interface MarketingTemplate {
  id: string
  tenant_id: string
  name: string
  description?: string
  type: 'email' | 'sms'
  
  // Email-specific
  subject_line?: string
  preheader?: string
  from_name?: string
  from_email?: string
  
  // Content
  content_html?: string
  content_json?: EmailBlock[]
  content_text?: string
  
  // Metadata
  thumbnail_url?: string
  category?: string
  is_public: boolean
  usage_count: number
  ai_generated: boolean
  ai_prompt?: string
  
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface EmailBlock {
  id: string
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'footer' | 'columns' | 'spacer'
  content?: any
  styles?: BlockStyles
  settings?: BlockSettings
}

export interface BlockStyles {
  backgroundColor?: string
  textColor?: string
  fontSize?: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
  padding?: string
  margin?: string
}

export interface BlockSettings {
  showOnMobile?: boolean
  showOnDesktop?: boolean
  conditionalLogic?: {
    field: string
    operator: string
    value: any
  }
}

export interface MarketingCampaign {
  id: string
  tenant_id: string
  name: string
  type: 'email' | 'email_ab' | 'sms' | 'rss_email'
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  
  // Targeting
  segment_id?: string
  audience_id?: string
  target_count?: number
  
  // Content
  template_id?: string
  subject_line?: string
  preheader?: string
  from_name?: string
  from_email?: string
  reply_to_email?: string
  
  // Scheduling
  schedule_at?: string
  send_started_at?: string
  send_completed_at?: string
  
  // A/B Testing
  is_ab_test: boolean
  ab_test_type?: 'subject' | 'from_name' | 'content'
  ab_test_split_pct: number
  ab_winner_variant_id?: string
  ab_winner_selected_at?: string
  
  // Stats
  total_sends: number
  total_delivered: number
  total_bounces: number
  total_opens: number
  total_unique_opens: number
  total_clicks: number
  total_unique_clicks: number
  total_unsubscribes: number
  total_spam_reports: number
  
  tags: string[]
  notes?: string
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface MarketingCampaignVariant {
  id: string
  campaign_id: string
  variant_key: string
  template_id?: string
  subject_line?: string
  from_name?: string
  content_json?: EmailBlock[]
  send_split_pct: number
  
  // Stats
  sends: number
  delivered: number
  opens: number
  unique_opens: number
  clicks: number
  unique_clicks: number
  unsubscribes: number
  
  created_at: string
}

export interface MarketingSend {
  id: string
  tenant_id: string
  campaign_id: string
  variant_id?: string
  contact_id: string
  
  sent_at: string
  provider?: string
  provider_message_id?: string
  
  status: 'sent' | 'delivered' | 'bounced' | 'failed'
  bounce_type?: 'hard' | 'soft' | 'complaint'
  bounce_reason?: string
  delivered_at?: string
  
  opened_at?: string
  first_click_at?: string
  open_count: number
  click_count: number
  
  subject_line?: string
  from_email?: string
  to_email?: string
  
  created_at: string
}

export interface MarketingEvent {
  id: string
  tenant_id: string
  campaign_id?: string
  contact_id: string
  send_id?: string
  
  event_type: 'delivered' | 'open' | 'click' | 'bounce' | 'unsubscribe' | 'spam_report'
  
  link_url?: string
  link_label?: string
  bounce_type?: 'hard' | 'soft' | 'complaint'
  bounce_reason?: string
  
  user_agent?: string
  ip_address?: string
  location_country?: string
  location_city?: string
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  email_client?: string
  
  provider_event_id?: string
  raw_data?: any
  
  occurred_at: string
  created_at: string
}

export interface MarketingJourney {
  id: string
  tenant_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  
  graph_json: JourneyGraph
  
  entry_trigger_type: 'contact_created' | 'tag_added' | 'tag_removed' | 'segment_entry' | 'segment_exit' | 'link_clicked' | 'form_submitted' | 'birthday' | 'anniversary' | 'inactivity_days' | 'manual'
  entry_trigger_config?: any
  
  exit_conditions?: any
  max_duration_days?: number
  
  total_entered: number
  total_completed: number
  total_active: number
  total_exited: number
  
  tags: string[]
  created_by_user_id?: string
  activated_at?: string
  activated_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface JourneyGraph {
  nodes: JourneyNode[]
  edges: JourneyEdge[]
}

export interface JourneyNode {
  id: string
  type: 'trigger' | 'action' | 'wait' | 'branch'
  position: { x: number; y: number }
  data: any
}

export interface JourneyEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}

export interface MarketingJourneyRun {
  id: string
  tenant_id: string
  journey_id: string
  contact_id: string
  state: 'active' | 'waiting' | 'completed' | 'exited' | 'failed'
  current_node_key?: string
  entered_at: string
  completed_at?: string
  exited_at?: string
  exit_reason?: string
  nodes_completed: string[]
  waiting_until?: string
  updated_at: string
}

export interface MarketingForm {
  id: string
  tenant_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'archived'
  
  fields_json: FormField[]
  
  theme: string
  custom_css?: string
  button_text: string
  
  success_message: string
  redirect_url?: string
  send_confirmation_email: boolean
  confirmation_template_id?: string
  
  auto_add_tags: string[]
  auto_add_to_segment_id?: string
  auto_start_journey_id?: string
  assign_to_user_id?: string
  
  enable_recaptcha: boolean
  recaptcha_site_key?: string
  enable_honeypot: boolean
  require_double_opt_in: boolean
  
  total_views: number
  total_submissions: number
  total_spam_blocked: number
  conversion_rate?: number
  
  is_published: boolean
  public_url_slug?: string
  embed_code?: string
  
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number'
  label: string
  placeholder?: string
  field_name: string // Maps to Contact column name
  required: boolean
  options?: string[] // For select/radio
  validation?: {
    pattern?: string
    min?: number
    max?: number
    message?: string
  }
  width?: 'full' | 'half' | 'third'
}

export interface MarketingFormSubmission {
  id: string
  tenant_id: string
  form_id: string
  contact_id?: string
  
  payload: any
  source_url?: string
  referrer_url?: string
  
  contact_created: boolean
  contact_updated: boolean
  duplicate_submission: boolean
  
  ip_address?: string
  user_agent?: string
  location_country?: string
  location_city?: string
  
  is_spam: boolean
  spam_score?: number
  honeypot_triggered: boolean
  
  processed: boolean
  processed_at?: string
  error_message?: string
  
  submitted_at: string
  created_at: string
}

export interface MarketingLandingPage {
  id: string
  tenant_id: string
  name: string
  title: string
  description?: string
  
  headline?: string
  subheadline?: string
  body_content?: string
  content_blocks_json?: any
  
  form_id?: string
  show_form: boolean
  
  theme: string
  template: string
  hero_image_url?: string
  logo_url?: string
  background_color: string
  primary_color: string
  custom_css?: string
  custom_head_code?: string
  
  meta_keywords?: string[]
  og_image_url?: string
  
  is_published: boolean
  public_url_slug?: string
  custom_domain?: string
  
  total_views: number
  total_submissions: number
  conversion_rate?: number
  
  created_by_user_id?: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface MarketingComment {
  id: string
  tenant_id: string
  entity_type: 'campaign' | 'journey' | 'template' | 'form' | 'landing_page'
  entity_id: string
  comment: string
  mentions: string[]
  parent_comment_id?: string
  is_reply: boolean
  is_resolved: boolean
  resolved_by_user_id?: string
  resolved_at?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface MarketingApproval {
  id: string
  tenant_id: string
  entity_type: 'campaign' | 'journey' | 'template'
  entity_id: string
  requested_by_user_id: string
  requested_at: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by_user_id?: string
  reviewed_at?: string
  review_notes?: string
  notified_users: string[]
  created_at: string
  updated_at: string
}

export interface MarketingAISuggestion {
  id: string
  tenant_id: string
  entity_type: 'campaign' | 'template' | 'subject_line'
  entity_id?: string
  suggestion_type: 'subject_line' | 'preheader' | 'content_block' | 'send_time' | 'segment' | 'personalization' | 'tone_adjustment'
  original_content?: string
  suggested_content: string
  confidence_score?: number
  reasoning?: string
  accepted: boolean
  accepted_by_user_id?: string
  accepted_at?: string
  ai_model: string
  ai_prompt?: string
  ai_tokens_used?: number
  created_at: string
}

export interface MarketingSettings {
  id: string
  tenant_id: string
  
  // Feature flags
  enable_journeys: boolean
  enable_ab_testing: boolean
  enable_sms: boolean
  enable_landing_pages: boolean
  enable_ai_features: boolean
  
  // Provider settings
  mail_provider: string
  mail_provider_api_key?: string
  mail_provider_domain?: string
  mail_default_from_email?: string
  mail_default_from_name?: string
  
  sms_provider: string
  sms_provider_api_key?: string
  sms_provider_phone_number?: string
  
  // Limits
  max_sends_per_hour: number
  max_sends_per_day: number
  
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface CampaignWithRelations extends MarketingCampaign {
  segment?: MarketingSegment
  audience?: MarketingAudience
  template?: MarketingTemplate
  variants?: MarketingCampaignVariant[]
  created_by?: {
    id: string
    full_name: string
  }
}

export interface SegmentWithRelations extends MarketingSegment {
  audience?: MarketingAudience
  created_by?: {
    id: string
    full_name: string
  }
}

export interface JourneyWithRelations extends MarketingJourney {
  created_by?: {
    id: string
    full_name: string
  }
  activated_by?: {
    id: string
    full_name: string
  }
}

// Campaign statistics
export interface CampaignStats {
  sends: number
  delivered: number
  deliveryRate: number
  opens: number
  uniqueOpens: number
  openRate: number
  clicks: number
  uniqueClicks: number
  clickRate: number
  clickToOpenRate: number
  bounces: number
  bounceRate: number
  unsubscribes: number
  unsubscribeRate: number
  spamReports: number
}

// Journey analytics
export interface JourneyAnalytics {
  totalEntered: number
  totalCompleted: number
  totalActive: number
  totalExited: number
  completionRate: number
  averageDuration: number // hours
  nodeStats: {
    nodeKey: string
    nodeName: string
    entered: number
    completed: number
    failed: number
    conversionRate: number
  }[]
}

// Form analytics
export interface FormAnalytics {
  views: number
  submissions: number
  conversionRate: number
  spamBlocked: number
  fieldCompletionRates: {
    fieldName: string
    completionRate: number
  }[]
  submissionsByDay: {
    date: string
    submissions: number
  }[]
}




