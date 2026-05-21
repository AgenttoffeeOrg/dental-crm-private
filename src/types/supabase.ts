export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          id: string
          reason: string | null
          requested_at: string | null
          scheduled_for: string | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "account_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "account_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "account_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      activities: {
        Row: {
          agent_user_id: string | null
          attendees: Json | null
          call_from: string | null
          call_sid: string | null
          call_to: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          direction: string | null
          duration_seconds: number | null
          edited_at: string | null
          edited_by_user_id: string | null
          email_bcc: string[] | null
          email_cc: string[] | null
          email_from: string | null
          email_reply_to: string | null
          email_to: string[] | null
          external_id: string | null
          from_number: string | null
          has_attachments: boolean | null
          id: string
          integration_metadata: Json | null
          integration_provider: string | null
          is_edited: boolean | null
          location_id: string | null
          marketing_campaign_id: string | null
          marketing_event_type: string | null
          mentions: string[] | null
          message_status: string | null
          metadata: Json | null
          occurred_at: string | null
          outcome: string | null
          parent_activity_id: string | null
          raw: Json | null
          recording_url: string | null
          rich_content: string | null
          snippet: string | null
          source_channel:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          subject: string | null
          tenant_id: string
          thread_id: string | null
          title: string | null
          to_number: string | null
          type: string
        }
        Insert: {
          agent_user_id?: string | null
          attendees?: Json | null
          call_from?: string | null
          call_sid?: string | null
          call_to?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          direction?: string | null
          duration_seconds?: number | null
          edited_at?: string | null
          edited_by_user_id?: string | null
          email_bcc?: string[] | null
          email_cc?: string[] | null
          email_from?: string | null
          email_reply_to?: string | null
          email_to?: string[] | null
          external_id?: string | null
          from_number?: string | null
          has_attachments?: boolean | null
          id?: string
          integration_metadata?: Json | null
          integration_provider?: string | null
          is_edited?: boolean | null
          location_id?: string | null
          marketing_campaign_id?: string | null
          marketing_event_type?: string | null
          mentions?: string[] | null
          message_status?: string | null
          metadata?: Json | null
          occurred_at?: string | null
          outcome?: string | null
          parent_activity_id?: string | null
          raw?: Json | null
          recording_url?: string | null
          rich_content?: string | null
          snippet?: string | null
          source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          subject?: string | null
          tenant_id: string
          thread_id?: string | null
          title?: string | null
          to_number?: string | null
          type: string
        }
        Update: {
          agent_user_id?: string | null
          attendees?: Json | null
          call_from?: string | null
          call_sid?: string | null
          call_to?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          direction?: string | null
          duration_seconds?: number | null
          edited_at?: string | null
          edited_by_user_id?: string | null
          email_bcc?: string[] | null
          email_cc?: string[] | null
          email_from?: string | null
          email_reply_to?: string | null
          email_to?: string[] | null
          external_id?: string | null
          from_number?: string | null
          has_attachments?: boolean | null
          id?: string
          integration_metadata?: Json | null
          integration_provider?: string | null
          is_edited?: boolean | null
          location_id?: string | null
          marketing_campaign_id?: string | null
          marketing_event_type?: string | null
          mentions?: string[] | null
          message_status?: string | null
          metadata?: Json | null
          occurred_at?: string | null
          outcome?: string | null
          parent_activity_id?: string | null
          raw?: Json | null
          recording_url?: string | null
          rich_content?: string | null
          snippet?: string | null
          source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          subject?: string | null
          tenant_id?: string
          thread_id?: string | null
          title?: string | null
          to_number?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      activity_attachments: {
        Row: {
          activity_id: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          storage_path: string | null
          tenant_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          storage_path?: string | null
          tenant_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          storage_path?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      activity_files: {
        Row: {
          activity_id: string
          file_id: string
        }
        Insert: {
          activity_id: string
          file_id: string
        }
        Update: {
          activity_id?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_files_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_files_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_files_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          activity_type: string
          category: string | null
          content_template: string
          created_at: string | null
          created_by_user_id: string | null
          id: string
          is_active: boolean | null
          name: string
          subject_template: string | null
          tenant_id: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          activity_type: string
          category?: string | null
          content_template: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject_template?: string | null
          tenant_id: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          activity_type?: string
          category?: string | null
          content_template?: string
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string | null
          tenant_id?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_artifacts: {
        Row: {
          activity_id: string
          confidence: number | null
          created_at: string | null
          data: Json
          id: string
          kind: string
          location_id: string | null
          tenant_id: string
        }
        Insert: {
          activity_id: string
          confidence?: number | null
          created_at?: string | null
          data: Json
          id?: string
          kind: string
          location_id?: string | null
          tenant_id: string
        }
        Update: {
          activity_id?: string
          confidence?: number | null
          created_at?: string | null
          data?: Json
          id?: string
          kind?: string
          location_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_artifacts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_artifacts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_artifacts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_assistant_preferences: {
        Row: {
          ai_model: string | null
          auto_actions: Json | null
          created_at: string | null
          custom_rules: Json | null
          email_draft_settings: Json | null
          focus_areas: Json | null
          id: string
          notification_preferences: Json | null
          response_style: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_model?: string | null
          auto_actions?: Json | null
          created_at?: string | null
          custom_rules?: Json | null
          email_draft_settings?: Json | null
          focus_areas?: Json | null
          id?: string
          notification_preferences?: Json | null
          response_style?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_model?: string | null
          auto_actions?: Json | null
          created_at?: string | null
          custom_rules?: Json | null
          email_draft_settings?: Json | null
          focus_areas?: Json | null
          id?: string
          notification_preferences?: Json | null
          response_style?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_assistant_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_assistant_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_assistant_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistant_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string | null
          id: string
          last_message_at: string | null
          messages: Json
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_email_drafts: {
        Row: {
          activity_id: string | null
          contact_id: string
          created_at: string | null
          deal_id: string | null
          draft_body: string
          draft_subject: string
          generated_by_ai: boolean | null
          id: string
          sent_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          activity_id?: string | null
          contact_id: string
          created_at?: string | null
          deal_id?: string | null
          draft_body: string
          draft_subject: string
          generated_by_ai?: boolean | null
          id?: string
          sent_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          activity_id?: string | null
          contact_id?: string
          created_at?: string | null
          deal_id?: string | null
          draft_body?: string
          draft_subject?: string
          generated_by_ai?: boolean | null
          id?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_email_drafts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "ai_email_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_email_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_email_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_email_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          acted_on_at: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          id: string
          priority: string | null
          status: string | null
          suggestion_text: string
          suggestion_type: string
          tenant_id: string
        }
        Insert: {
          acted_on_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          suggestion_text: string
          suggestion_type: string
          tenant_id: string
        }
        Update: {
          acted_on_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          suggestion_text?: string
          suggestion_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "ai_suggestions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      ai_usage_analytics: {
        Row: {
          action_taken: string | null
          context_id: string | null
          context_type: string
          created_at: string | null
          helpful_rating: number | null
          id: string
          question_asked: string | null
          response_generated: string | null
          response_time_ms: number | null
          tenant_id: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          context_id?: string | null
          context_type: string
          created_at?: string | null
          helpful_rating?: number | null
          id?: string
          question_asked?: string | null
          response_generated?: string | null
          response_time_ms?: number | null
          tenant_id: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          helpful_rating?: number | null
          id?: string
          question_asked?: string | null
          response_generated?: string | null
          response_time_ms?: number | null
          tenant_id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_usage_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_usage_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ai_usage_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analytics_anomalies_detected: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          detected_at: string | null
          detection_method: string | null
          deviation_percentage: number | null
          dimensions: Json | null
          expected_value: number | null
          id: string
          metric: string
          resolution_notes: string | null
          severity: string | null
          tenant_id: string
          time_period: string
          value: number
          z_score: number | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string | null
          detection_method?: string | null
          deviation_percentage?: number | null
          dimensions?: Json | null
          expected_value?: number | null
          id?: string
          metric: string
          resolution_notes?: string | null
          severity?: string | null
          tenant_id: string
          time_period: string
          value: number
          z_score?: number | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detected_at?: string | null
          detection_method?: string | null
          deviation_percentage?: number | null
          dimensions?: Json | null
          expected_value?: number | null
          id?: string
          metric?: string
          resolution_notes?: string | null
          severity?: string | null
          tenant_id?: string
          time_period?: string
          value?: number
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_anomalies_detected_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_anomalies_detected_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_anomalies_detected_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_anomalies_detected_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_anomalies_detected_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analytics_data_quality_log: {
        Row: {
          accuracy_score: number | null
          checked_at: string | null
          completeness_score: number | null
          duplicate_records: number | null
          freshness_score: number | null
          id: string
          invalid_records: number | null
          issues_detected: Json | null
          last_etl_run: string | null
          newest_record_date: string | null
          null_records: number | null
          oldest_record_date: string | null
          source_table: string | null
          source_type: string
          tenant_id: string
          total_records: number | null
        }
        Insert: {
          accuracy_score?: number | null
          checked_at?: string | null
          completeness_score?: number | null
          duplicate_records?: number | null
          freshness_score?: number | null
          id?: string
          invalid_records?: number | null
          issues_detected?: Json | null
          last_etl_run?: string | null
          newest_record_date?: string | null
          null_records?: number | null
          oldest_record_date?: string | null
          source_table?: string | null
          source_type: string
          tenant_id: string
          total_records?: number | null
        }
        Update: {
          accuracy_score?: number | null
          checked_at?: string | null
          completeness_score?: number | null
          duplicate_records?: number | null
          freshness_score?: number | null
          id?: string
          invalid_records?: number | null
          issues_detected?: Json | null
          last_etl_run?: string | null
          newest_record_date?: string | null
          null_records?: number | null
          oldest_record_date?: string | null
          source_table?: string | null
          source_type?: string
          tenant_id?: string
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_quality_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_data_quality_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_data_quality_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_data_quality_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_data_quality_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          city: string | null
          country: string | null
          element_id: string | null
          element_text: string | null
          event_category: string | null
          event_name: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          occurred_at: string | null
          page_load_time_ms: number | null
          page_url: string | null
          referrer: string | null
          session_id: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          element_id?: string | null
          element_text?: string | null
          event_category?: string | null
          event_name: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string | null
          page_load_time_ms?: number | null
          page_url?: string | null
          referrer?: string | null
          session_id: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          element_id?: string | null
          element_text?: string | null
          event_category?: string | null
          event_name?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string | null
          page_load_time_ms?: number | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analytics_saved_views: {
        Row: {
          created_at: string | null
          dashboard: string
          filters: Json | null
          id: string
          is_public: boolean | null
          last_viewed_at: string | null
          name: string
          share_token: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          dashboard: string
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          last_viewed_at?: string | null
          name: string
          share_token?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          dashboard?: string
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          last_viewed_at?: string | null
          name?: string
          share_token?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analytics_shared_dashboards: {
        Row: {
          allowed_emails: string[] | null
          created_at: string | null
          created_by: string | null
          dashboard_type: string
          description: string | null
          expires_at: string | null
          filters: Json | null
          id: string
          is_public: boolean | null
          last_accessed_at: string | null
          password_hash: string | null
          require_login: boolean | null
          share_token: string
          tenant_id: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          allowed_emails?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dashboard_type: string
          description?: string | null
          expires_at?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          last_accessed_at?: string | null
          password_hash?: string | null
          require_login?: boolean | null
          share_token: string
          tenant_id: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          allowed_emails?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dashboard_type?: string
          description?: string | null
          expires_at?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          last_accessed_at?: string | null
          password_hash?: string | null
          require_login?: boolean | null
          share_token?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_shared_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_shared_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_shared_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_shared_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_shared_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analytics_threshold_alerts: {
        Row: {
          condition: string
          created_at: string | null
          created_by: string | null
          id: string
          is_enabled: boolean | null
          last_checked_at: string | null
          last_triggered_at: string | null
          last_triggered_value: number | null
          metric: string
          name: string
          notification_channels: string[] | null
          recipient_emails: string[] | null
          slack_webhook_url: string | null
          tenant_id: string
          threshold_value: number
          threshold_value_2: number | null
          trigger_count: number | null
          updated_at: string | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_checked_at?: string | null
          last_triggered_at?: string | null
          last_triggered_value?: number | null
          metric: string
          name: string
          notification_channels?: string[] | null
          recipient_emails?: string[] | null
          slack_webhook_url?: string | null
          tenant_id: string
          threshold_value: number
          threshold_value_2?: number | null
          trigger_count?: number | null
          updated_at?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          last_checked_at?: string | null
          last_triggered_at?: string | null
          last_triggered_value?: number | null
          metric?: string
          name?: string
          notification_channels?: string[] | null
          recipient_emails?: string[] | null
          slack_webhook_url?: string | null
          tenant_id?: string
          threshold_value?: number
          threshold_value_2?: number | null
          trigger_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_threshold_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_threshold_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_threshold_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_threshold_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_threshold_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      api_credentials: {
        Row: {
          access_token: string | null
          authorization_url: string | null
          code_verifier: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_error: string | null
          practice_id: string
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          state: string | null
          status: string | null
          tenant_id: string
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          authorization_url?: string | null
          code_verifier?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_error?: string | null
          practice_id: string
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          state?: string | null
          status?: string | null
          tenant_id: string
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          authorization_url?: string | null
          code_verifier?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_error?: string | null
          practice_id?: string
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          state?: string | null
          status?: string | null
          tenant_id?: string
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_request_log: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string
          method: string
          path: string
          rate_limited: boolean | null
          response_time_ms: number | null
          status_code: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          method: string
          path: string
          rate_limited?: boolean | null
          response_time_ms?: number | null
          status_code?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          method?: string
          path?: string
          rate_limited?: boolean | null
          response_time_ms?: number | null
          status_code?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "api_request_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "api_request_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "api_request_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      app_users: {
        Row: {
          active_location_id: string | null
          active_tenant_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          current_org_id: string | null
          custom_role_id: string | null
          date_format: string | null
          default_location_id: string | null
          default_tenant_id: string | null
          deleted_at: string | null
          email: string
          email_signature: string | null
          email_verified: boolean | null
          email_verified_at: string | null
          full_name: string
          id: string
          job_title: string | null
          language: string | null
          last_active_at: string | null
          last_active_tenant_id: string | null
          last_context_switch_at: string | null
          last_seen_at: string | null
          last_tenant_switch_at: string | null
          metadata: Json | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_current_step: string | null
          onboarding_flow_type: string | null
          onboarding_skipped_steps: string[] | null
          onboarding_started_at: string | null
          onboarding_step: number | null
          per_tenant_location_preferences: Json | null
          phone: string | null
          phone_mobile: string | null
          phone_office: string | null
          preferences: Json | null
          professional_title: string | null
          profile_completed: boolean | null
          profile_id: string | null
          profile_photo_url: string | null
          profile_updated_at: string | null
          remember_last_context: boolean
          role: string
          settings: Json | null
          sms_signature: string | null
          status: string | null
          tenant_id: string | null
          tenant_switch_count: number | null
          time_format: string | null
          timezone: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          verification_grace_ends_at: string | null
          working_hours_json: Json | null
        }
        Insert: {
          active_location_id?: string | null
          active_tenant_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_org_id?: string | null
          custom_role_id?: string | null
          date_format?: string | null
          default_location_id?: string | null
          default_tenant_id?: string | null
          deleted_at?: string | null
          email: string
          email_signature?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name: string
          id: string
          job_title?: string | null
          language?: string | null
          last_active_at?: string | null
          last_active_tenant_id?: string | null
          last_context_switch_at?: string | null
          last_seen_at?: string | null
          last_tenant_switch_at?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_current_step?: string | null
          onboarding_flow_type?: string | null
          onboarding_skipped_steps?: string[] | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          per_tenant_location_preferences?: Json | null
          phone?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          preferences?: Json | null
          professional_title?: string | null
          profile_completed?: boolean | null
          profile_id?: string | null
          profile_photo_url?: string | null
          profile_updated_at?: string | null
          remember_last_context?: boolean
          role: string
          settings?: Json | null
          sms_signature?: string | null
          status?: string | null
          tenant_id?: string | null
          tenant_switch_count?: number | null
          time_format?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          verification_grace_ends_at?: string | null
          working_hours_json?: Json | null
        }
        Update: {
          active_location_id?: string | null
          active_tenant_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_org_id?: string | null
          custom_role_id?: string | null
          date_format?: string | null
          default_location_id?: string | null
          default_tenant_id?: string | null
          deleted_at?: string | null
          email?: string
          email_signature?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          language?: string | null
          last_active_at?: string | null
          last_active_tenant_id?: string | null
          last_context_switch_at?: string | null
          last_seen_at?: string | null
          last_tenant_switch_at?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_current_step?: string | null
          onboarding_flow_type?: string | null
          onboarding_skipped_steps?: string[] | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          per_tenant_location_preferences?: Json | null
          phone?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          preferences?: Json | null
          professional_title?: string | null
          profile_completed?: boolean | null
          profile_id?: string | null
          profile_photo_url?: string | null
          profile_updated_at?: string | null
          remember_last_context?: boolean
          role?: string
          settings?: Json | null
          sms_signature?: string | null
          status?: string | null
          tenant_id?: string | null
          tenant_switch_count?: number | null
          time_format?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          verification_grace_ends_at?: string | null
          working_hours_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          allow_online_booking: boolean | null
          buffer_after: number | null
          buffer_before: number | null
          category: string | null
          code: string | null
          color: string | null
          created_at: string | null
          default_duration: number
          default_price_cents: number | null
          deposit_amount_cents: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_deposit: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_online_booking?: boolean | null
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          default_duration?: number
          default_price_cents?: number | null
          deposit_amount_cents?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_deposit?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_online_booking?: boolean | null
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          default_duration?: number
          default_price_cents?: number | null
          deposit_amount_cents?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_deposit?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointment_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointment_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointment_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          checked_in_at: string | null
          completed_at: string | null
          confirmation_sent_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          contact_id: string
          created_at: string | null
          created_by_user_id: string | null
          deal_id: string | null
          duration: number
          end_time: string
          id: string
          location_id: string
          notes: string | null
          provider_id: string
          reason_for_visit: string | null
          reminder_sent_at: string | null
          start_time: string
          status: string
          tenant_id: string
          title: string | null
          treatment_notes: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          confirmation_sent_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          deal_id?: string | null
          duration: number
          end_time: string
          id?: string
          location_id: string
          notes?: string | null
          provider_id: string
          reason_for_visit?: string | null
          reminder_sent_at?: string | null
          start_time: string
          status?: string
          tenant_id: string
          title?: string | null
          treatment_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          confirmation_sent_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          deal_id?: string | null
          duration?: number
          end_time?: string
          id?: string
          location_id?: string
          notes?: string | null
          provider_id?: string
          reason_for_visit?: string | null
          reminder_sent_at?: string | null
          start_time?: string
          status?: string
          tenant_id?: string
          title?: string | null
          treatment_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      association_links: {
        Row: {
          created_at: string | null
          id: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "association_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "association_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "association_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "association_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      attribution_touchpoints: {
        Row: {
          contact_id: string | null
          created_at: string
          event_id: string | null
          external_message_id: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip_address: unknown
          landing_page_url: string | null
          lead_intent_session_id: string | null
          metadata: Json
          msclkid: string | null
          occurred_at: string
          referrer_url: string | null
          source_channel: Database["public"]["Enums"]["source_channel_enum"]
          source_sub_id: string | null
          tenant_id: string
          treatment_offering_id: string | null
          ttclid: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_id?: string | null
          external_message_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_address?: unknown
          landing_page_url?: string | null
          lead_intent_session_id?: string | null
          metadata?: Json
          msclkid?: string | null
          occurred_at?: string
          referrer_url?: string | null
          source_channel: Database["public"]["Enums"]["source_channel_enum"]
          source_sub_id?: string | null
          tenant_id: string
          treatment_offering_id?: string | null
          ttclid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_id?: string | null
          external_message_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_address?: unknown
          landing_page_url?: string | null
          lead_intent_session_id?: string | null
          metadata?: Json
          msclkid?: string | null
          occurred_at?: string
          referrer_url?: string | null
          source_channel?: Database["public"]["Enums"]["source_channel_enum"]
          source_sub_id?: string | null
          tenant_id?: string
          treatment_offering_id?: string | null
          ttclid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_touchpoints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_lead_intent_session_fkey"
            columns: ["lead_intent_session_id"]
            isOneToOne: false
            referencedRelation: "lead_intent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_treatment_offering_id_fkey"
            columns: ["treatment_offering_id"]
            isOneToOne: false
            referencedRelation: "practice_treatment_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          current_value: number | null
          delta: number | null
          description: string | null
          id: string
          metric_name: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          practice_id: string
          previous_value: number | null
          run_id: string
          severity: string
          tenant_id: string
          title: string
          triggered_at: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          current_value?: number | null
          delta?: number | null
          description?: string | null
          id?: string
          metric_name?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          practice_id: string
          previous_value?: number | null
          run_id: string
          severity: string
          tenant_id: string
          title: string
          triggered_at?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          current_value?: number | null
          delta?: number | null
          description?: string | null
          id?: string
          metric_name?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          practice_id?: string
          previous_value?: number | null
          run_id?: string
          severity?: string
          tenant_id?: string
          title?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "latest_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_export_requests: {
        Row: {
          actions: string[] | null
          categories: string[] | null
          completed_at: string | null
          compliance_tags: string[] | null
          created_at: string | null
          date_from: string | null
          date_to: string | null
          error_message: string | null
          export_batch_id: string | null
          export_format: string
          file_size_bytes: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          requested_by: string
          requested_reason: string | null
          search_query: string | null
          severities: string[] | null
          started_at: string | null
          status: string
          tenant_id: string
          total_records: number | null
          updated_at: string | null
          user_ids: string[] | null
        }
        Insert: {
          actions?: string[] | null
          categories?: string[] | null
          completed_at?: string | null
          compliance_tags?: string[] | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          error_message?: string | null
          export_batch_id?: string | null
          export_format: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          requested_by: string
          requested_reason?: string | null
          search_query?: string | null
          severities?: string[] | null
          started_at?: string | null
          status?: string
          tenant_id: string
          total_records?: number | null
          updated_at?: string | null
          user_ids?: string[] | null
        }
        Update: {
          actions?: string[] | null
          categories?: string[] | null
          completed_at?: string | null
          compliance_tags?: string[] | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          error_message?: string | null
          export_batch_id?: string | null
          export_format?: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          requested_by?: string
          requested_reason?: string | null
          search_query?: string | null
          severities?: string[] | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_records?: number | null
          updated_at?: string | null
          user_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          resource: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          resource?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          resource?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_peer_groups: {
        Row: {
          auto_discover: boolean | null
          category: string | null
          center_lat: number | null
          center_lng: number | null
          created_at: string | null
          description: string | null
          excluded_competitor_ids: string[] | null
          id: string
          is_default: boolean | null
          manual_competitor_ids: string[] | null
          max_competitors: number | null
          name: string
          practice_id: string
          radius_miles: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_discover?: boolean | null
          category?: string | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string | null
          description?: string | null
          excluded_competitor_ids?: string[] | null
          id?: string
          is_default?: boolean | null
          manual_competitor_ids?: string[] | null
          max_competitors?: number | null
          name: string
          practice_id: string
          radius_miles?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_discover?: boolean | null
          category?: string | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string | null
          description?: string | null
          excluded_competitor_ids?: string[] | null
          id?: string
          is_default?: boolean | null
          manual_competitor_ids?: string[] | null
          max_competitors?: number | null
          name?: string
          practice_id?: string
          radius_miles?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_retention_policies: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          retention_days: number
          severity: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          retention_days?: number
          severity?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          retention_days?: number
          severity?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action_category: string
          action_description: string | null
          action_type: string
          after_state: Json | null
          before_state: Json | null
          changed_fields: string[] | null
          correlation_id: string | null
          created_at: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: string | null
          request_method: string | null
          request_path: string | null
          response_status: number | null
          sensitive_data: boolean | null
          session_id: string | null
          severity: string | null
          tags: string[] | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
          visible_to_admin_only: boolean | null
        }
        Insert: {
          action_category: string
          action_description?: string | null
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          changed_fields?: string[] | null
          correlation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          response_status?: number | null
          sensitive_data?: boolean | null
          session_id?: string | null
          severity?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visible_to_admin_only?: boolean | null
        }
        Update: {
          action_category?: string
          action_description?: string | null
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          changed_fields?: string[] | null
          correlation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          response_status?: number | null
          sensitive_data?: boolean | null
          session_id?: string | null
          severity?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visible_to_admin_only?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_trail_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_trail_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audits: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          category: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          export_batch_id: string | null
          exported_at: string | null
          id: number
          retention_until: string | null
          severity: string | null
          tags: string[] | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          category?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          export_batch_id?: string | null
          exported_at?: string | null
          id?: number
          retention_until?: string | null
          severity?: string | null
          tags?: string[] | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          category?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          export_batch_id?: string | null
          exported_at?: string | null
          id?: number
          retention_until?: string | null
          severity?: string | null
          tags?: string[] | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_approvals: {
        Row: {
          automation_id: string
          changes_summary: string | null
          comments: string | null
          created_at: string | null
          id: string
          requested_at: string | null
          requested_by_user_id: string
          reviewed_at: string | null
          reviewer_user_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          automation_id: string
          changes_summary?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          requested_at?: string | null
          requested_by_user_id: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          automation_id?: string
          changes_summary?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          requested_at?: string | null
          requested_by_user_id?: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_approvals_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "automation_approvals_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_concurrency_leases: {
        Row: {
          acquired_at: string | null
          acquired_by: string
          expires_at: string
          id: string
          lease_key: string
          tenant_id: string
        }
        Insert: {
          acquired_at?: string | null
          acquired_by: string
          expires_at: string
          id?: string
          lease_key: string
          tenant_id: string
        }
        Update: {
          acquired_at?: string | null
          acquired_by?: string
          expires_at?: string
          id?: string
          lease_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_concurrency_leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_concurrency_leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_concurrency_leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_concurrency_leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_concurrency_leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_consent_audit: {
        Row: {
          action_taken: boolean
          action_type: string
          automation_id: string
          blocked_reason: string | null
          consent_source: string | null
          consent_status: string
          contact_id: string
          created_at: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          action_taken: boolean
          action_type: string
          automation_id: string
          blocked_reason?: string | null
          consent_source?: string | null
          consent_status: string
          contact_id: string
          created_at?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          action_taken?: boolean
          action_type?: string
          automation_id?: string
          blocked_reason?: string | null
          consent_source?: string | null
          consent_status?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_consent_audit_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "automation_consent_audit_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_consent_audit_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "automation_consent_audit_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_consent_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_consent_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_consent_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_consent_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_consent_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_dlq: {
        Row: {
          automation_id: string
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          failed_at: string | null
          id: string
          max_retries_exceeded: boolean | null
          original_execution_log_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          retry_count: number
          status: string | null
          tenant_id: string
          trigger_event: Json
        }
        Insert: {
          automation_id: string
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_retries_exceeded?: boolean | null
          original_execution_log_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          retry_count: number
          status?: string | null
          tenant_id: string
          trigger_event: Json
        }
        Update: {
          automation_id?: string
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_retries_exceeded?: boolean | null
          original_execution_log_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          retry_count?: number
          status?: string | null
          tenant_id?: string
          trigger_event?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_dlq_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_dlq_original_execution_log_id_fkey"
            columns: ["original_execution_log_id"]
            isOneToOne: false
            referencedRelation: "automation_execution_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_edges: {
        Row: {
          automation_id: string
          condition_index: number | null
          created_at: string | null
          id: string
          label: string | null
          source_node_key: string
          target_node_key: string
          tenant_id: string | null
        }
        Insert: {
          automation_id: string
          condition_index?: number | null
          created_at?: string | null
          id?: string
          label?: string | null
          source_node_key: string
          target_node_key: string
          tenant_id?: string | null
        }
        Update: {
          automation_id?: string
          condition_index?: number | null
          created_at?: string | null
          id?: string
          label?: string | null
          source_node_key?: string
          target_node_key?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_edges_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_event_log: {
        Row: {
          automation_run_ids: string[] | null
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          replay_count: number | null
          replayed_from_id: string | null
          tenant_id: string | null
          triggered_automation_ids: string[] | null
        }
        Insert: {
          automation_run_ids?: string[] | null
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          replay_count?: number | null
          replayed_from_id?: string | null
          tenant_id?: string | null
          triggered_automation_ids?: string[] | null
        }
        Update: {
          automation_run_ids?: string[] | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          replay_count?: number | null
          replayed_from_id?: string | null
          tenant_id?: string | null
          triggered_automation_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_event_log_replayed_from_id_fkey"
            columns: ["replayed_from_id"]
            isOneToOne: false
            referencedRelation: "automation_event_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_event_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_event_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_event_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_event_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_event_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_execution_logs: {
        Row: {
          action_output: Json | null
          automation_id: string
          correlation_id: string | null
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          idempotency_key: string | null
          node_id: string | null
          node_key: string
          node_type: string
          origin_tag: string | null
          retry_count: number | null
          run_id: string
          scheduled_for: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_output?: Json | null
          automation_id: string
          correlation_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          idempotency_key?: string | null
          node_id?: string | null
          node_key: string
          node_type: string
          origin_tag?: string | null
          retry_count?: number | null
          run_id: string
          scheduled_for?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          action_output?: Json | null
          automation_id?: string
          correlation_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          idempotency_key?: string | null
          node_id?: string | null
          node_key?: string
          node_type?: string
          origin_tag?: string | null
          retry_count?: number | null
          run_id?: string
          scheduled_for?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_nodes: {
        Row: {
          action_type: string | null
          automation_id: string
          avg_execution_time_ms: number | null
          condition_config: Json | null
          config_json: Json
          created_at: string | null
          id: string
          node_key: string
          node_type: string
          position_x: number | null
          position_y: number | null
          tenant_id: string | null
          total_failed: number | null
          total_processed: number | null
          total_success: number | null
          wait_duration_unit: string | null
          wait_duration_value: number | null
        }
        Insert: {
          action_type?: string | null
          automation_id: string
          avg_execution_time_ms?: number | null
          condition_config?: Json | null
          config_json?: Json
          created_at?: string | null
          id?: string
          node_key: string
          node_type: string
          position_x?: number | null
          position_y?: number | null
          tenant_id?: string | null
          total_failed?: number | null
          total_processed?: number | null
          total_success?: number | null
          wait_duration_unit?: string | null
          wait_duration_value?: number | null
        }
        Update: {
          action_type?: string | null
          automation_id?: string
          avg_execution_time_ms?: number | null
          condition_config?: Json | null
          config_json?: Json
          created_at?: string | null
          id?: string
          node_key?: string
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          tenant_id?: string | null
          total_failed?: number | null
          total_processed?: number | null
          total_success?: number | null
          wait_duration_unit?: string | null
          wait_duration_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_nodes_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rate_limits: {
        Row: {
          automation_id: string
          created_at: string | null
          current_day_emails: number | null
          current_day_executions: number | null
          current_day_sms: number | null
          current_hour_executions: number | null
          day_reset_at: string | null
          hour_reset_at: string | null
          id: string
          is_paused_due_to_limits: boolean | null
          max_emails_per_day: number | null
          max_executions_per_day: number | null
          max_executions_per_hour: number | null
          max_sms_per_day: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          automation_id: string
          created_at?: string | null
          current_day_emails?: number | null
          current_day_executions?: number | null
          current_day_sms?: number | null
          current_hour_executions?: number | null
          day_reset_at?: string | null
          hour_reset_at?: string | null
          id?: string
          is_paused_due_to_limits?: boolean | null
          max_emails_per_day?: number | null
          max_executions_per_day?: number | null
          max_executions_per_hour?: number | null
          max_sms_per_day?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          automation_id?: string
          created_at?: string | null
          current_day_emails?: number | null
          current_day_executions?: number | null
          current_day_sms?: number | null
          current_hour_executions?: number | null
          day_reset_at?: string | null
          hour_reset_at?: string | null
          id?: string
          is_paused_due_to_limits?: boolean | null
          max_emails_per_day?: number | null
          max_executions_per_day?: number | null
          max_executions_per_hour?: number | null
          max_sms_per_day?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rate_limits_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "automation_rate_limits_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string
          completed_at: string | null
          contact_id: string | null
          current_node_key: string | null
          deal_id: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          nodes_completed: string[] | null
          nodes_failed: string[] | null
          started_at: string | null
          state: string
          task_id: string | null
          tenant_id: string
          total_execution_time_ms: number | null
          updated_at: string | null
          waiting_reason: string | null
          waiting_until: string | null
        }
        Insert: {
          automation_id: string
          completed_at?: string | null
          contact_id?: string | null
          current_node_key?: string | null
          deal_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          nodes_completed?: string[] | null
          nodes_failed?: string[] | null
          started_at?: string | null
          state?: string
          task_id?: string | null
          tenant_id: string
          total_execution_time_ms?: number | null
          updated_at?: string | null
          waiting_reason?: string | null
          waiting_until?: string | null
        }
        Update: {
          automation_id?: string
          completed_at?: string | null
          contact_id?: string | null
          current_node_key?: string | null
          deal_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          nodes_completed?: string[] | null
          nodes_failed?: string[] | null
          started_at?: string | null
          state?: string
          task_id?: string | null
          tenant_id?: string
          total_execution_time_ms?: number | null
          updated_at?: string | null
          waiting_reason?: string | null
          waiting_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "automation_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automation_test_runs: {
        Row: {
          automation_id: string
          created_at: string | null
          execution_path: Json | null
          execution_time_ms: number | null
          id: string
          preview_messages: Json | null
          success: boolean
          tenant_id: string
          test_contact_id: string | null
          test_type: string
          tested_by_user_id: string | null
          validation_errors: Json | null
        }
        Insert: {
          automation_id: string
          created_at?: string | null
          execution_path?: Json | null
          execution_time_ms?: number | null
          id?: string
          preview_messages?: Json | null
          success: boolean
          tenant_id: string
          test_contact_id?: string | null
          test_type: string
          tested_by_user_id?: string | null
          validation_errors?: Json | null
        }
        Update: {
          automation_id?: string
          created_at?: string | null
          execution_path?: Json | null
          execution_time_ms?: number | null
          id?: string
          preview_messages?: Json | null
          success?: boolean
          tenant_id?: string
          test_contact_id?: string | null
          test_type?: string
          tested_by_user_id?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_test_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "automation_test_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_test_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_test_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_test_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_test_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_test_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_test_runs_test_contact_id_fkey"
            columns: ["test_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "automation_test_runs_test_contact_id_fkey"
            columns: ["test_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_trigger_metadata: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          example_config: Json | null
          icon: string | null
          is_active: boolean | null
          optional_fields: Json | null
          required_fields: Json | null
          trigger_type: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          example_config?: Json | null
          icon?: string | null
          is_active?: boolean | null
          optional_fields?: Json | null
          required_fields?: Json | null
          trigger_type: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          example_config?: Json | null
          icon?: string | null
          is_active?: boolean | null
          optional_fields?: Json | null
          required_fields?: Json | null
          trigger_type?: string
        }
        Relationships: []
      }
      automation_versions: {
        Row: {
          automation_id: string
          change_notes: string | null
          created_at: string | null
          graph_json: Json
          id: string
          published_at: string | null
          published_by_user_id: string | null
          rolled_back_from_version: number | null
          status_at_version: string | null
          tenant_id: string
          trigger_config: Json | null
          version_number: number
        }
        Insert: {
          automation_id: string
          change_notes?: string | null
          created_at?: string | null
          graph_json: Json
          id?: string
          published_at?: string | null
          published_by_user_id?: string | null
          rolled_back_from_version?: number | null
          status_at_version?: string | null
          tenant_id: string
          trigger_config?: Json | null
          version_number: number
        }
        Update: {
          automation_id?: string
          change_notes?: string | null
          created_at?: string | null
          graph_json?: Json
          id?: string
          published_at?: string | null
          published_by_user_id?: string | null
          rolled_back_from_version?: number | null
          status_at_version?: string | null
          tenant_id?: string
          trigger_config?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_versions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "automation_versions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      automations: {
        Row: {
          activated_at: string | null
          activated_by_user_id: string | null
          active_runs: number | null
          category: string
          created_at: string | null
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          exit_conditions: Json | null
          failed_runs: number | null
          graph_json: Json
          id: string
          is_template: boolean | null
          max_duration_days: number | null
          name: string
          status: string
          successful_runs: number | null
          tags: string[] | null
          template_id: string | null
          tenant_id: string
          total_runs: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by_user_id?: string | null
          active_runs?: number | null
          category: string
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          exit_conditions?: Json | null
          failed_runs?: number | null
          graph_json?: Json
          id?: string
          is_template?: boolean | null
          max_duration_days?: number | null
          name: string
          status?: string
          successful_runs?: number | null
          tags?: string[] | null
          template_id?: string | null
          tenant_id: string
          total_runs?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by_user_id?: string | null
          active_runs?: number | null
          category?: string
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          exit_conditions?: Json | null
          failed_runs?: number | null
          graph_json?: Json
          id?: string
          is_template?: boolean | null
          max_duration_days?: number | null
          name?: string
          status?: string
          successful_runs?: number | null
          tags?: string[] | null
          template_id?: string | null
          tenant_id?: string
          total_runs?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      backup_policies: {
        Row: {
          allow_point_in_time_recovery: boolean | null
          backup_day_of_week: number | null
          backup_frequency: string
          backup_time: string | null
          compress_backups: boolean | null
          created_at: string | null
          created_by_user_id: string | null
          enabled: boolean | null
          id: string
          include_attachments: boolean | null
          include_files: boolean | null
          last_backup_at: string | null
          last_backup_error: string | null
          last_backup_status: string | null
          max_backups: number | null
          next_backup_at: string | null
          notification_emails: string[] | null
          notify_on_failure: boolean | null
          notify_on_success: boolean | null
          recovery_window_days: number | null
          retention_days: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_point_in_time_recovery?: boolean | null
          backup_day_of_week?: number | null
          backup_frequency?: string
          backup_time?: string | null
          compress_backups?: boolean | null
          created_at?: string | null
          created_by_user_id?: string | null
          enabled?: boolean | null
          id?: string
          include_attachments?: boolean | null
          include_files?: boolean | null
          last_backup_at?: string | null
          last_backup_error?: string | null
          last_backup_status?: string | null
          max_backups?: number | null
          next_backup_at?: string | null
          notification_emails?: string[] | null
          notify_on_failure?: boolean | null
          notify_on_success?: boolean | null
          recovery_window_days?: number | null
          retention_days?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_point_in_time_recovery?: boolean | null
          backup_day_of_week?: number | null
          backup_frequency?: string
          backup_time?: string | null
          compress_backups?: boolean | null
          created_at?: string | null
          created_by_user_id?: string | null
          enabled?: boolean | null
          id?: string
          include_attachments?: boolean | null
          include_files?: boolean | null
          last_backup_at?: string | null
          last_backup_error?: string | null
          last_backup_status?: string | null
          max_backups?: number | null
          next_backup_at?: string | null
          notification_emails?: string[] | null
          notify_on_failure?: boolean | null
          notify_on_success?: boolean | null
          recovery_window_days?: number | null
          retention_days?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      backup_records: {
        Row: {
          backup_size_bytes: number | null
          backup_type: string
          checksum: string | null
          completed_at: string | null
          compressed_size_bytes: number | null
          created_by_user_id: string | null
          error_details: Json | null
          error_message: string | null
          expires_at: string | null
          id: string
          last_restore_at: string | null
          metadata: Json | null
          policy_id: string | null
          record_counts: Json | null
          restore_count: number | null
          started_at: string | null
          status: string
          storage_path: string | null
          storage_provider: string | null
          tables_backed_up: string[] | null
          tenant_id: string
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          backup_size_bytes?: number | null
          backup_type: string
          checksum?: string | null
          completed_at?: string | null
          compressed_size_bytes?: number | null
          created_by_user_id?: string | null
          error_details?: Json | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          last_restore_at?: string | null
          metadata?: Json | null
          policy_id?: string | null
          record_counts?: Json | null
          restore_count?: number | null
          started_at?: string | null
          status: string
          storage_path?: string | null
          storage_provider?: string | null
          tables_backed_up?: string[] | null
          tenant_id: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          backup_size_bytes?: number | null
          backup_type?: string
          checksum?: string | null
          completed_at?: string | null
          compressed_size_bytes?: number | null
          created_by_user_id?: string | null
          error_details?: Json | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          last_restore_at?: string | null
          metadata?: Json | null
          policy_id?: string | null
          record_counts?: Json | null
          restore_count?: number | null
          started_at?: string | null
          status?: string
          storage_path?: string | null
          storage_provider?: string | null
          tables_backed_up?: string[] | null
          tenant_id?: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_records_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "backup_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      backup_verification_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json
          duration_ms: number | null
          environment: string
          id: string
          initiated_by_user_id: string | null
          log_url: string | null
          started_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          environment?: string
          id?: string
          initiated_by_user_id?: string | null
          log_url?: string | null
          started_at?: string
          status: string
          tenant_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json
          duration_ms?: number | null
          environment?: string
          id?: string
          initiated_by_user_id?: string | null
          log_url?: string | null
          started_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_verification_runs_initiated_by_user_id_fkey"
            columns: ["initiated_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_verification_runs_initiated_by_user_id_fkey"
            columns: ["initiated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "backup_verification_runs_initiated_by_user_id_fkey"
            columns: ["initiated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "backup_verification_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_verification_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_verification_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "backup_verification_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_verification_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      bot_escalations: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          id: string
          reason: string
          requested_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          session_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          reason: string
          requested_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          session_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          requested_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          session_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_escalations_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_escalations_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_escalations_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_escalations_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_escalations_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_escalations_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_escalations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_escalations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      bot_sessions: {
        Row: {
          assigned_user_id: string | null
          automation_source: string | null
          channel: string
          closed_at: string | null
          contact_id: string | null
          context: Json
          created_by_user_id: string | null
          deal_id: string | null
          id: string
          last_activity_at: string
          metadata: Json | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          assigned_user_id?: string | null
          automation_source?: string | null
          channel: string
          closed_at?: string | null
          contact_id?: string | null
          context?: Json
          created_by_user_id?: string | null
          deal_id?: string | null
          id?: string
          last_activity_at?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          assigned_user_id?: string | null
          automation_source?: string | null
          channel?: string
          closed_at?: string | null
          contact_id?: string | null
          context?: Json
          created_by_user_id?: string | null
          deal_id?: string | null
          id?: string
          last_activity_at?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_sessions_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_sessions_automation_source_fkey"
            columns: ["automation_source"]
            isOneToOne: false
            referencedRelation: "engagement_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "bot_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_sessions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bot_sessions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      bot_turns: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          intent: string | null
          message: string
          metadata: Json | null
          role: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          intent?: string | null
          message: string
          metadata?: Json | null
          role: string
          session_id: string
          tenant_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          intent?: string | null
          message?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_turns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_turns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_turns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bot_turns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_turns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      calls: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      channel_identifiers: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          external_handle: string | null
          external_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          contact_id: string
          created_at?: string
          external_handle?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          external_handle?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_identifiers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "channel_identifiers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_identifiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "channel_identifiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "channel_identifiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "channel_identifiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_identifiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      competitor_documents: {
        Row: {
          captured_at: string
          checksum: string | null
          competitor_id: string | null
          created_at: string
          created_by_user_id: string | null
          document_path: string
          id: string
          metadata: Json
          source: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          checksum?: string | null
          competitor_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          document_path: string
          id?: string
          metadata?: Json
          source?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          checksum?: string | null
          competitor_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          document_path?: string
          id?: string
          metadata?: Json
          source?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_documents_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_documents_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_documents_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "competitor_documents_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "competitor_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "competitor_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "competitor_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "competitor_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      competitor_ingestion_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          error_message: string | null
          id: string
          payload: Json
          result_summary: Json | null
          source_name: string
          source_type: string
          started_at: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          result_summary?: Json | null
          source_name: string
          source_type?: string
          started_at?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          result_summary?: Json | null
          source_name?: string
          source_type?: string
          started_at?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_ingestion_jobs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_ingestion_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          tenant_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_locale: string | null
          consent_method: string
          consent_source: string | null
          consent_text: string | null
          consent_text_version: string | null
          consent_type: string
          contact_id: string | null
          created_at: string | null
          granted: boolean
          id: string
          ip_address: string | null
          lawful_basis: string | null
          tenant_id: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_locale?: string | null
          consent_method: string
          consent_source?: string | null
          consent_text?: string | null
          consent_text_version?: string | null
          consent_type: string
          contact_id?: string | null
          created_at?: string | null
          granted: boolean
          id?: string
          ip_address?: string | null
          lawful_basis?: string | null
          tenant_id: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_locale?: string | null
          consent_method?: string
          consent_source?: string | null
          consent_text?: string | null
          consent_text_version?: string | null
          consent_type?: string
          contact_id?: string | null
          created_at?: string | null
          granted?: boolean
          id?: string
          ip_address?: string | null
          lawful_basis?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "consent_records_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      contact_engagement_events: {
        Row: {
          contact_id: string
          created_at: string | null
          engagement_score: number | null
          event_source: string | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          engagement_score?: number | null
          event_source?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          engagement_score?: number | null
          event_source?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_engagement_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_engagement_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      contact_segment_membership: {
        Row: {
          added_at: string | null
          contact_id: string
          id: string
          last_qualified_at: string | null
          segment_id: string
          tenant_id: string
        }
        Insert: {
          added_at?: string | null
          contact_id: string
          id?: string
          last_qualified_at?: string | null
          segment_id: string
          tenant_id: string
        }
        Update: {
          added_at?: string | null
          contact_id?: string
          id?: string
          last_qualified_at?: string | null
          segment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_segment_membership_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_segment_membership_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_membership_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_membership_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_segment_membership_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_segment_membership_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_segment_membership_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_membership_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      contact_settings: {
        Row: {
          auto_merge_duplicates: boolean | null
          created_at: string | null
          custom_fields: Json | null
          data_retention_days: number | null
          duplicate_check_fields: string[] | null
          duplicate_detection_enabled: boolean | null
          gdpr_enabled: boolean | null
          id: string
          phone_format: string | null
          require_consent: boolean | null
          required_fields: string[] | null
          tenant_id: string
          updated_at: string | null
          validate_email: boolean | null
          validate_phone: boolean | null
        }
        Insert: {
          auto_merge_duplicates?: boolean | null
          created_at?: string | null
          custom_fields?: Json | null
          data_retention_days?: number | null
          duplicate_check_fields?: string[] | null
          duplicate_detection_enabled?: boolean | null
          gdpr_enabled?: boolean | null
          id?: string
          phone_format?: string | null
          require_consent?: boolean | null
          required_fields?: string[] | null
          tenant_id: string
          updated_at?: string | null
          validate_email?: boolean | null
          validate_phone?: boolean | null
        }
        Update: {
          auto_merge_duplicates?: boolean | null
          created_at?: string | null
          custom_fields?: Json | null
          data_retention_days?: number | null
          duplicate_check_fields?: string[] | null
          duplicate_detection_enabled?: boolean | null
          gdpr_enabled?: boolean | null
          id?: string
          phone_format?: string | null
          require_consent?: boolean | null
          required_fields?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          validate_email?: boolean | null
          validate_phone?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          allergies: string | null
          city: string | null
          communication_preference: string | null
          company: string | null
          contact_type: string | null
          country: string | null
          created_at: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          deleted_at: string | null
          dental_anxiety_level: string | null
          dental_concerns: string | null
          email: string | null
          email_consent: boolean | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employer: string | null
          first_response_at: string | null
          first_response_user_id: string | null
          first_touch_at: string | null
          first_touch_fbclid: string | null
          first_touch_gclid: string | null
          first_touch_ip_address: unknown
          first_touch_landing_page_url: string | null
          first_touch_msclkid: string | null
          first_touch_referrer_url: string | null
          first_touch_source_channel:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          first_touch_source_sub_id: string | null
          first_touch_ttclid: string | null
          first_touch_user_agent: string | null
          first_touch_utm_campaign: string | null
          first_touch_utm_content: string | null
          first_touch_utm_medium: string | null
          first_touch_utm_source: string | null
          first_touch_utm_term: string | null
          full_name: string
          gender: string | null
          id: string
          insurance_group_number: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_duplicate: boolean | null
          language_preference: string | null
          last_dental_visit: string | null
          last_marketing_interaction_at: string | null
          last_touch_at: string | null
          last_touch_fbclid: string | null
          last_touch_gclid: string | null
          last_touch_ip_address: unknown
          last_touch_landing_page_url: string | null
          last_touch_msclkid: string | null
          last_touch_referrer_url: string | null
          last_touch_source_channel:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          last_touch_source_sub_id: string | null
          last_touch_ttclid: string | null
          last_touch_user_agent: string | null
          last_touch_utm_campaign: string | null
          last_touch_utm_content: string | null
          last_touch_utm_medium: string | null
          last_touch_utm_source: string | null
          last_touch_utm_term: string | null
          lead_score: number | null
          lead_source_campaign_id: string | null
          lifetime_value_actual_cents: number | null
          location_id: string | null
          marital_status: string | null
          marketing_consent: boolean | null
          marketing_engagement_score: number
          medical_conditions: string | null
          medications: string | null
          merged_into_id: string | null
          occupation: string | null
          owner_user_id: string | null
          pms_patient_id: string | null
          pms_provider: string | null
          postal_code: string | null
          preferred_appointment_time: string | null
          preferred_name: string | null
          previous_dentist: string | null
          primary_email: string | null
          primary_email_norm: string | null
          primary_phone: string | null
          primary_phone_e164: string | null
          secondary_email: string | null
          secondary_phone: string | null
          sms_consent: boolean | null
          social_media_profiles: Json | null
          source: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          title: string | null
          total_treatments: number | null
          treatment_offering_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          city?: string | null
          communication_preference?: string | null
          company?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          deleted_at?: string | null
          dental_anxiety_level?: string | null
          dental_concerns?: string | null
          email?: string | null
          email_consent?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employer?: string | null
          first_response_at?: string | null
          first_response_user_id?: string | null
          first_touch_at?: string | null
          first_touch_fbclid?: string | null
          first_touch_gclid?: string | null
          first_touch_ip_address?: unknown
          first_touch_landing_page_url?: string | null
          first_touch_msclkid?: string | null
          first_touch_referrer_url?: string | null
          first_touch_source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          first_touch_source_sub_id?: string | null
          first_touch_ttclid?: string | null
          first_touch_user_agent?: string | null
          first_touch_utm_campaign?: string | null
          first_touch_utm_content?: string | null
          first_touch_utm_medium?: string | null
          first_touch_utm_source?: string | null
          first_touch_utm_term?: string | null
          full_name: string
          gender?: string | null
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_duplicate?: boolean | null
          language_preference?: string | null
          last_dental_visit?: string | null
          last_marketing_interaction_at?: string | null
          last_touch_at?: string | null
          last_touch_fbclid?: string | null
          last_touch_gclid?: string | null
          last_touch_ip_address?: unknown
          last_touch_landing_page_url?: string | null
          last_touch_msclkid?: string | null
          last_touch_referrer_url?: string | null
          last_touch_source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          last_touch_source_sub_id?: string | null
          last_touch_ttclid?: string | null
          last_touch_user_agent?: string | null
          last_touch_utm_campaign?: string | null
          last_touch_utm_content?: string | null
          last_touch_utm_medium?: string | null
          last_touch_utm_source?: string | null
          last_touch_utm_term?: string | null
          lead_score?: number | null
          lead_source_campaign_id?: string | null
          lifetime_value_actual_cents?: number | null
          location_id?: string | null
          marital_status?: string | null
          marketing_consent?: boolean | null
          marketing_engagement_score?: number
          medical_conditions?: string | null
          medications?: string | null
          merged_into_id?: string | null
          occupation?: string | null
          owner_user_id?: string | null
          pms_patient_id?: string | null
          pms_provider?: string | null
          postal_code?: string | null
          preferred_appointment_time?: string | null
          preferred_name?: string | null
          previous_dentist?: string | null
          primary_email?: string | null
          primary_email_norm?: string | null
          primary_phone?: string | null
          primary_phone_e164?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          sms_consent?: boolean | null
          social_media_profiles?: Json | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          title?: string | null
          total_treatments?: number | null
          treatment_offering_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          city?: string | null
          communication_preference?: string | null
          company?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          deleted_at?: string | null
          dental_anxiety_level?: string | null
          dental_concerns?: string | null
          email?: string | null
          email_consent?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employer?: string | null
          first_response_at?: string | null
          first_response_user_id?: string | null
          first_touch_at?: string | null
          first_touch_fbclid?: string | null
          first_touch_gclid?: string | null
          first_touch_ip_address?: unknown
          first_touch_landing_page_url?: string | null
          first_touch_msclkid?: string | null
          first_touch_referrer_url?: string | null
          first_touch_source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          first_touch_source_sub_id?: string | null
          first_touch_ttclid?: string | null
          first_touch_user_agent?: string | null
          first_touch_utm_campaign?: string | null
          first_touch_utm_content?: string | null
          first_touch_utm_medium?: string | null
          first_touch_utm_source?: string | null
          first_touch_utm_term?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_duplicate?: boolean | null
          language_preference?: string | null
          last_dental_visit?: string | null
          last_marketing_interaction_at?: string | null
          last_touch_at?: string | null
          last_touch_fbclid?: string | null
          last_touch_gclid?: string | null
          last_touch_ip_address?: unknown
          last_touch_landing_page_url?: string | null
          last_touch_msclkid?: string | null
          last_touch_referrer_url?: string | null
          last_touch_source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          last_touch_source_sub_id?: string | null
          last_touch_ttclid?: string | null
          last_touch_user_agent?: string | null
          last_touch_utm_campaign?: string | null
          last_touch_utm_content?: string | null
          last_touch_utm_medium?: string | null
          last_touch_utm_source?: string | null
          last_touch_utm_term?: string | null
          lead_score?: number | null
          lead_source_campaign_id?: string | null
          lifetime_value_actual_cents?: number | null
          location_id?: string | null
          marital_status?: string | null
          marketing_consent?: boolean | null
          marketing_engagement_score?: number
          medical_conditions?: string | null
          medications?: string | null
          merged_into_id?: string | null
          occupation?: string | null
          owner_user_id?: string | null
          pms_patient_id?: string | null
          pms_provider?: string | null
          postal_code?: string | null
          preferred_appointment_time?: string | null
          preferred_name?: string | null
          previous_dentist?: string | null
          primary_email?: string | null
          primary_email_norm?: string | null
          primary_phone?: string | null
          primary_phone_e164?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          sms_consent?: boolean | null
          social_media_profiles?: Json | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string | null
          total_treatments?: number | null
          treatment_offering_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_first_response_user_id_fkey"
            columns: ["first_response_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_first_response_user_id_fkey"
            columns: ["first_response_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_first_response_user_id_fkey"
            columns: ["first_response_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contacts_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_treatment_offering_id_fkey"
            columns: ["treatment_offering_id"]
            isOneToOne: false
            referencedRelation: "practice_treatment_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_outcomes: {
        Row: {
          created_at: string | null
          id: string
          outcome: string | null
          sales_script_version_id: string | null
          success: boolean | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outcome?: string | null
          sales_script_version_id?: string | null
          success?: boolean | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outcome?: string | null
          sales_script_version_id?: string | null
          success?: boolean | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      conversion_events_fired: {
        Row: {
          contact_id: string
          conversion_action_resource_name: string | null
          deal_id: string
          error_message: string | null
          event_type: string
          fired_at: string
          gclid: string | null
          http_status: number | null
          id: string
          occurred_at: string
          platform: string
          response_excerpt: string | null
          retry_count: number
          status: string
          tenant_id: string
        }
        Insert: {
          contact_id: string
          conversion_action_resource_name?: string | null
          deal_id: string
          error_message?: string | null
          event_type: string
          fired_at?: string
          gclid?: string | null
          http_status?: number | null
          id?: string
          occurred_at: string
          platform: string
          response_excerpt?: string | null
          retry_count?: number
          status: string
          tenant_id: string
        }
        Update: {
          contact_id?: string
          conversion_action_resource_name?: string | null
          deal_id?: string
          error_message?: string | null
          event_type?: string
          fired_at?: string
          gclid?: string | null
          http_status?: number | null
          id?: string
          occurred_at?: string
          platform?: string
          response_excerpt?: string | null
          retry_count?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_fired_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "conversion_events_fired_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_fired_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_fired_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_fired_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "conversion_events_fired_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "conversion_events_fired_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "conversion_events_fired_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_fired_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      custom_analytics_reports: {
        Row: {
          chart_type: string | null
          created_at: string | null
          created_by_user_id: string | null
          custom_date_end: string | null
          custom_date_start: string | null
          date_range_type: string | null
          description: string | null
          filters_config: Json | null
          group_by: string | null
          id: string
          is_favorite: boolean | null
          is_shared: boolean | null
          last_sent_at: string | null
          metrics_config: Json
          name: string
          report_type: string
          schedule_enabled: boolean | null
          schedule_frequency: string | null
          schedule_recipients: string[] | null
          shared_with_user_ids: string[] | null
          sort_by: string | null
          sort_direction: string | null
          tenant_id: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          chart_type?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_date_end?: string | null
          custom_date_start?: string | null
          date_range_type?: string | null
          description?: string | null
          filters_config?: Json | null
          group_by?: string | null
          id?: string
          is_favorite?: boolean | null
          is_shared?: boolean | null
          last_sent_at?: string | null
          metrics_config: Json
          name: string
          report_type: string
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          shared_with_user_ids?: string[] | null
          sort_by?: string | null
          sort_direction?: string | null
          tenant_id: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          chart_type?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_date_end?: string | null
          custom_date_start?: string | null
          date_range_type?: string | null
          description?: string | null
          filters_config?: Json | null
          group_by?: string | null
          id?: string
          is_favorite?: boolean | null
          is_shared?: boolean | null
          last_sent_at?: string | null
          metrics_config?: Json
          name?: string
          report_type?: string
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          shared_with_user_ids?: string[] | null
          sort_by?: string | null
          sort_direction?: string | null
          tenant_id?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_analytics_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_analytics_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_analytics_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_analytics_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_analytics_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      custom_contact_fields: {
        Row: {
          active: boolean | null
          created_at: string | null
          field_type: string
          id: string
          label: string
          name: string
          options: string[] | null
          required: boolean | null
          section: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          field_type: string
          id?: string
          label: string
          name: string
          options?: string[] | null
          required?: boolean | null
          section?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          field_type?: string
          id?: string
          label?: string
          name?: string
          options?: string[] | null
          required?: boolean | null
          section?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_contact_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_contact_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_contact_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_contact_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_contact_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_admin: boolean | null
          is_system_role: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_admin?: boolean | null
          is_system_role?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_admin?: boolean | null
          is_system_role?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      data_access_log: {
        Row: {
          access_type: string
          accessed_from: string | null
          accessed_record_id: string | null
          accessed_table: string
          created_at: string | null
          filters_applied: Json | null
          id: number
          ip_address: string | null
          record_count: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_from?: string | null
          accessed_record_id?: string | null
          accessed_table: string
          created_at?: string | null
          filters_applied?: Json | null
          id?: number
          ip_address?: string | null
          record_count?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_from?: string | null
          accessed_record_id?: string | null
          accessed_table?: string
          created_at?: string | null
          filters_applied?: Json | null
          id?: number
          ip_address?: string | null
          record_count?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_access_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_access_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_access_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      data_quarantine: {
        Row: {
          created_at: string | null
          id: string
          issue: string
          record_data: Json
          record_id: string
          requires_manual_review: boolean | null
          resolution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          suggested_fix: string | null
          suggested_tenant_id: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          issue: string
          record_data: Json
          record_id: string
          requires_manual_review?: boolean | null
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_fix?: string | null
          suggested_tenant_id?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          issue?: string
          record_data?: Json
          record_id?: string
          requires_manual_review?: boolean | null
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_fix?: string | null
          suggested_tenant_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_quarantine_suggested_tenant_id_fkey"
            columns: ["suggested_tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_quarantine_suggested_tenant_id_fkey"
            columns: ["suggested_tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_quarantine_suggested_tenant_id_fkey"
            columns: ["suggested_tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_quarantine_suggested_tenant_id_fkey"
            columns: ["suggested_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_quarantine_suggested_tenant_id_fkey"
            columns: ["suggested_tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      data_reconciliation_log: {
        Row: {
          action: string
          fixed_at: string | null
          from_tenant_id: string | null
          id: number
          issue_description: string | null
          migration_batch: string | null
          record_id: string
          record_snapshot: Json | null
          table_name: string
          to_tenant_id: string | null
        }
        Insert: {
          action: string
          fixed_at?: string | null
          from_tenant_id?: string | null
          id?: number
          issue_description?: string | null
          migration_batch?: string | null
          record_id: string
          record_snapshot?: Json | null
          table_name: string
          to_tenant_id?: string | null
        }
        Update: {
          action?: string
          fixed_at?: string | null
          from_tenant_id?: string | null
          id?: number
          issue_description?: string | null
          migration_batch?: string | null
          record_id?: string
          record_snapshot?: Json | null
          table_name?: string
          to_tenant_id?: string | null
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          applies_to_deleted: boolean | null
          archive_before_delete: boolean | null
          archive_location: string | null
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          retention_days: number
          table_name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          applies_to_deleted?: boolean | null
          archive_before_delete?: boolean | null
          archive_location?: string | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          retention_days: number
          table_name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          applies_to_deleted?: boolean | null
          archive_before_delete?: boolean | null
          archive_location?: string | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          retention_days?: number
          table_name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          assigned_to_user_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          due_at: string | null
          erasure_completed_at: string | null
          export_expires_at: string | null
          export_file_url: string | null
          export_generated_at: string | null
          handled_by_user_id: string | null
          id: string
          request_details: string | null
          request_type: string
          requested_at: string | null
          requester_email: string
          requester_name: string | null
          requester_phone: string | null
          response_details: string | null
          response_sent_at: string | null
          status: string | null
          tenant_id: string
          tombstone_id: string | null
          updated_at: string | null
          verification_completed_at: string | null
          verification_method: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          due_at?: string | null
          erasure_completed_at?: string | null
          export_expires_at?: string | null
          export_file_url?: string | null
          export_generated_at?: string | null
          handled_by_user_id?: string | null
          id?: string
          request_details?: string | null
          request_type: string
          requested_at?: string | null
          requester_email: string
          requester_name?: string | null
          requester_phone?: string | null
          response_details?: string | null
          response_sent_at?: string | null
          status?: string | null
          tenant_id: string
          tombstone_id?: string | null
          updated_at?: string | null
          verification_completed_at?: string | null
          verification_method?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          due_at?: string | null
          erasure_completed_at?: string | null
          export_expires_at?: string | null
          export_file_url?: string | null
          export_generated_at?: string | null
          handled_by_user_id?: string | null
          id?: string
          request_details?: string | null
          request_type?: string
          requested_at?: string | null
          requester_email?: string
          requester_name?: string | null
          requester_phone?: string | null
          response_details?: string | null
          response_sent_at?: string | null
          status?: string | null
          tenant_id?: string
          tombstone_id?: string | null
          updated_at?: string | null
          verification_completed_at?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "data_subject_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "data_subject_requests_tombstone_id_fkey"
            columns: ["tombstone_id"]
            isOneToOne: false
            referencedRelation: "erasure_tombstones"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_outcomes: {
        Row: {
          competitor: string | null
          created_at: string | null
          deal_id: string
          id: string
          notes: string | null
          outcome: string
          outcome_value_cents: number | null
          primary_reason: string | null
          recorded_at: string | null
          recorded_by_user_id: string | null
          secondary_reasons: string[] | null
          tenant_id: string
        }
        Insert: {
          competitor?: string | null
          created_at?: string | null
          deal_id: string
          id?: string
          notes?: string | null
          outcome: string
          outcome_value_cents?: number | null
          primary_reason?: string | null
          recorded_at?: string | null
          recorded_by_user_id?: string | null
          secondary_reasons?: string[] | null
          tenant_id: string
        }
        Update: {
          competitor?: string | null
          created_at?: string | null
          deal_id?: string
          id?: string
          notes?: string | null
          outcome?: string
          outcome_value_cents?: number | null
          primary_reason?: string | null
          recorded_at?: string | null
          recorded_by_user_id?: string | null
          secondary_reasons?: string[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_outcomes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_outcomes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deal_settings: {
        Row: {
          allow_unassigned: boolean | null
          allow_zero_value: boolean | null
          allowed_treatment_tags: string[] | null
          assignment_method: string | null
          auto_archive_after_days: number | null
          auto_assign_new_deals: boolean | null
          auto_close_lost_after_days: number | null
          created_at: string | null
          currency_options: string[] | null
          custom_fields: Json | null
          default_currency: string | null
          default_stage_id: string | null
          duplicate_check_fields: string[] | null
          duplicate_detection_enabled: boolean | null
          field_visibility_by_role: Json | null
          id: string
          lost_stage_ids: string[] | null
          max_treatment_tags: number | null
          min_treatment_tags: number | null
          required_fields: string[] | null
          required_treatment_tags: boolean | null
          tenant_id: string
          updated_at: string | null
          value_max_cents: number | null
          value_min_cents: number | null
          won_stage_ids: string[] | null
        }
        Insert: {
          allow_unassigned?: boolean | null
          allow_zero_value?: boolean | null
          allowed_treatment_tags?: string[] | null
          assignment_method?: string | null
          auto_archive_after_days?: number | null
          auto_assign_new_deals?: boolean | null
          auto_close_lost_after_days?: number | null
          created_at?: string | null
          currency_options?: string[] | null
          custom_fields?: Json | null
          default_currency?: string | null
          default_stage_id?: string | null
          duplicate_check_fields?: string[] | null
          duplicate_detection_enabled?: boolean | null
          field_visibility_by_role?: Json | null
          id?: string
          lost_stage_ids?: string[] | null
          max_treatment_tags?: number | null
          min_treatment_tags?: number | null
          required_fields?: string[] | null
          required_treatment_tags?: boolean | null
          tenant_id: string
          updated_at?: string | null
          value_max_cents?: number | null
          value_min_cents?: number | null
          won_stage_ids?: string[] | null
        }
        Update: {
          allow_unassigned?: boolean | null
          allow_zero_value?: boolean | null
          allowed_treatment_tags?: string[] | null
          assignment_method?: string | null
          auto_archive_after_days?: number | null
          auto_assign_new_deals?: boolean | null
          auto_close_lost_after_days?: number | null
          created_at?: string | null
          currency_options?: string[] | null
          custom_fields?: Json | null
          default_currency?: string | null
          default_stage_id?: string | null
          duplicate_check_fields?: string[] | null
          duplicate_detection_enabled?: boolean | null
          field_visibility_by_role?: Json | null
          id?: string
          lost_stage_ids?: string[] | null
          max_treatment_tags?: number | null
          min_treatment_tags?: number | null
          required_fields?: string[] | null
          required_treatment_tags?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          value_max_cents?: number | null
          value_min_cents?: number | null
          won_stage_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deal_sla_rules: {
        Row: {
          auto_create_task: boolean | null
          created_at: string | null
          escalation_enabled: boolean | null
          id: string
          is_active: boolean | null
          max_days_in_stage: number
          max_days_inactive: number
          notify_manager: boolean | null
          notify_owner: boolean | null
          pipeline_id: string | null
          stage_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_create_task?: boolean | null
          created_at?: string | null
          escalation_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          max_days_in_stage?: number
          max_days_inactive?: number
          notify_manager?: boolean | null
          notify_owner?: boolean | null
          pipeline_id?: string | null
          stage_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_create_task?: boolean | null
          created_at?: string | null
          escalation_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          max_days_in_stage?: number
          max_days_inactive?: number
          notify_manager?: boolean | null
          notify_owner?: boolean | null
          pipeline_id?: string | null
          stage_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_sla_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "deal_sla_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sla_rules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_sla_rules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_sla_rules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          created_at: string | null
          deal_id: string
          deal_value_at_move_cents: number | null
          from_stage_id: string | null
          from_stage_name: string | null
          id: string
          moved_at: string | null
          moved_by_user_id: string | null
          notes: string | null
          tenant_id: string
          time_in_previous_stage_days: number | null
          to_stage_id: string
          to_stage_name: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          deal_value_at_move_cents?: number | null
          from_stage_id?: string | null
          from_stage_name?: string | null
          id?: string
          moved_at?: string | null
          moved_by_user_id?: string | null
          notes?: string | null
          tenant_id: string
          time_in_previous_stage_days?: number | null
          to_stage_id: string
          to_stage_name?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          deal_value_at_move_cents?: number | null
          from_stage_id?: string | null
          from_stage_name?: string | null
          id?: string
          moved_at?: string | null
          moved_by_user_id?: string | null
          notes?: string | null
          tenant_id?: string
          time_in_previous_stage_days?: number | null
          to_stage_id?: string
          to_stage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_revenue_cents: number | null
          consultation_date: string | null
          consultation_scheduled: boolean | null
          contact_id: string
          conversion_probability: number | null
          created_at: string | null
          currency: string
          deal_type: string | null
          deleted_at: string | null
          dental_service_id: string | null
          deposit_amount_cents: number | null
          description: string | null
          estimated_duration_weeks: number | null
          expected_close_date: string | null
          first_response_at: string | null
          follow_up_required: boolean | null
          id: string
          insurance_authorization_number: string | null
          insurance_coverage: boolean | null
          insurance_coverage_percentage: number | null
          insurance_provider: string | null
          internal_notes: string | null
          last_activity_at: string | null
          lead_score: number | null
          location_id: string | null
          marketing_source_id: string | null
          marketing_source_name: string | null
          marketing_source_type: string | null
          marketing_touchpoints: Json | null
          next_follow_up_date: string | null
          owner_id: string | null
          owner_user_id: string | null
          patient_concerns: string | null
          payment_plan: string | null
          pipeline_id: string
          pms_patient_id: string | null
          pms_sync_status: string | null
          pms_treatment_id: string | null
          pms_treatment_plan_id: string | null
          procedure_codes: string[] | null
          social_media_source_interaction_id: string | null
          social_media_source_platform: string | null
          social_media_source_post_id: string | null
          source: string | null
          stage_id: string
          status: string | null
          tenant_id: string
          title: string
          treatment_category: string | null
          treatment_end_date: string | null
          treatment_start_date: string | null
          treatment_tags: string[] | null
          treatment_type: string | null
          treatment_urgency: string | null
          updated_at: string | null
          value_estimate_cents: number | null
        }
        Insert: {
          actual_revenue_cents?: number | null
          consultation_date?: string | null
          consultation_scheduled?: boolean | null
          contact_id: string
          conversion_probability?: number | null
          created_at?: string | null
          currency?: string
          deal_type?: string | null
          deleted_at?: string | null
          dental_service_id?: string | null
          deposit_amount_cents?: number | null
          description?: string | null
          estimated_duration_weeks?: number | null
          expected_close_date?: string | null
          first_response_at?: string | null
          follow_up_required?: boolean | null
          id?: string
          insurance_authorization_number?: string | null
          insurance_coverage?: boolean | null
          insurance_coverage_percentage?: number | null
          insurance_provider?: string | null
          internal_notes?: string | null
          last_activity_at?: string | null
          lead_score?: number | null
          location_id?: string | null
          marketing_source_id?: string | null
          marketing_source_name?: string | null
          marketing_source_type?: string | null
          marketing_touchpoints?: Json | null
          next_follow_up_date?: string | null
          owner_id?: string | null
          owner_user_id?: string | null
          patient_concerns?: string | null
          payment_plan?: string | null
          pipeline_id: string
          pms_patient_id?: string | null
          pms_sync_status?: string | null
          pms_treatment_id?: string | null
          pms_treatment_plan_id?: string | null
          procedure_codes?: string[] | null
          social_media_source_interaction_id?: string | null
          social_media_source_platform?: string | null
          social_media_source_post_id?: string | null
          source?: string | null
          stage_id: string
          status?: string | null
          tenant_id: string
          title: string
          treatment_category?: string | null
          treatment_end_date?: string | null
          treatment_start_date?: string | null
          treatment_tags?: string[] | null
          treatment_type?: string | null
          treatment_urgency?: string | null
          updated_at?: string | null
          value_estimate_cents?: number | null
        }
        Update: {
          actual_revenue_cents?: number | null
          consultation_date?: string | null
          consultation_scheduled?: boolean | null
          contact_id?: string
          conversion_probability?: number | null
          created_at?: string | null
          currency?: string
          deal_type?: string | null
          deleted_at?: string | null
          dental_service_id?: string | null
          deposit_amount_cents?: number | null
          description?: string | null
          estimated_duration_weeks?: number | null
          expected_close_date?: string | null
          first_response_at?: string | null
          follow_up_required?: boolean | null
          id?: string
          insurance_authorization_number?: string | null
          insurance_coverage?: boolean | null
          insurance_coverage_percentage?: number | null
          insurance_provider?: string | null
          internal_notes?: string | null
          last_activity_at?: string | null
          lead_score?: number | null
          location_id?: string | null
          marketing_source_id?: string | null
          marketing_source_name?: string | null
          marketing_source_type?: string | null
          marketing_touchpoints?: Json | null
          next_follow_up_date?: string | null
          owner_id?: string | null
          owner_user_id?: string | null
          patient_concerns?: string | null
          payment_plan?: string | null
          pipeline_id?: string
          pms_patient_id?: string | null
          pms_sync_status?: string | null
          pms_treatment_id?: string | null
          pms_treatment_plan_id?: string | null
          procedure_codes?: string[] | null
          social_media_source_interaction_id?: string | null
          social_media_source_platform?: string | null
          social_media_source_post_id?: string | null
          source?: string | null
          stage_id?: string
          status?: string | null
          tenant_id?: string
          title?: string
          treatment_category?: string | null
          treatment_end_date?: string | null
          treatment_start_date?: string | null
          treatment_tags?: string[] | null
          treatment_type?: string | null
          treatment_urgency?: string | null
          updated_at?: string | null
          value_estimate_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_dental_service_id_fkey"
            columns: ["dental_service_id"]
            isOneToOne: false
            referencedRelation: "dental_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_social_media_source_interaction_id_fkey"
            columns: ["social_media_source_interaction_id"]
            isOneToOne: false
            referencedRelation: "social_media_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_social_media_source_post_id_fkey"
            columns: ["social_media_source_post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      dedup_review_queue: {
        Row: {
          candidate_email: string | null
          candidate_name: string | null
          candidate_payload: Json
          candidate_phone: string | null
          created_at: string
          expires_at: string
          id: string
          match_signals: Json
          matched_contact_ids: string[]
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          resolved_contact_id: string | null
          source_channel:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          candidate_email?: string | null
          candidate_name?: string | null
          candidate_payload: Json
          candidate_phone?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          match_signals?: Json
          matched_contact_ids?: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          resolved_contact_id?: string | null
          source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          candidate_email?: string | null
          candidate_name?: string | null
          candidate_payload?: Json
          candidate_phone?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          match_signals?: Json
          matched_contact_ids?: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          resolved_contact_id?: string | null
          source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dedup_review_queue_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dedup_review_queue_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dedup_review_queue_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dedup_review_queue_resolved_contact_id_fkey"
            columns: ["resolved_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "dedup_review_queue_resolved_contact_id_fkey"
            columns: ["resolved_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dedup_review_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dedup_review_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dedup_review_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dedup_review_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dedup_review_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      dental_groups: {
        Row: {
          billing_email: string
          created_at: string
          created_by_user_id: string
          currency_code: string
          description: string | null
          display_name: string | null
          id: string
          is_active: boolean
          locale: string
          name: string
          phone: string | null
          primary_email: string
          settings: Json
          updated_at: string
          website_host: string | null
          website_url: string | null
        }
        Insert: {
          billing_email: string
          created_at?: string
          created_by_user_id: string
          currency_code?: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          name: string
          phone?: string | null
          primary_email: string
          settings?: Json
          updated_at?: string
          website_host?: string | null
          website_url?: string | null
        }
        Update: {
          billing_email?: string
          created_at?: string
          created_by_user_id?: string
          currency_code?: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          name?: string
          phone?: string | null
          primary_email?: string
          settings?: Json
          updated_at?: string
          website_host?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      dental_services: {
        Row: {
          active: boolean | null
          average_value_cents: number | null
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          name: string
          tenant_id: string
          typical_duration_days: number | null
        }
        Insert: {
          active?: boolean | null
          average_value_cents?: number | null
          category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          tenant_id: string
          typical_duration_days?: number | null
        }
        Update: {
          active?: boolean | null
          average_value_cents?: number | null
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          tenant_id?: string
          typical_duration_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dental_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dental_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dental_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "dental_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dental_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          template_type: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          template_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          template_type?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      engagement_campaigns: {
        Row: {
          ai_config: Json
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          schedule_config: Json
          status: string
          tenant_id: string
          timezone: string | null
          trigger_config: Json
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          ai_config?: Json
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          schedule_config?: Json
          status?: string
          tenant_id: string
          timezone?: string | null
          trigger_config?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          ai_config?: Json
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          schedule_config?: Json
          status?: string
          tenant_id?: string
          timezone?: string | null
          trigger_config?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_campaigns_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "engagement_campaigns_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      engagement_enrollments: {
        Row: {
          campaign_id: string
          contact_id: string | null
          context: Json
          created_at: string
          current_step_order: number | null
          deal_id: string | null
          id: string
          last_error: string | null
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          context?: Json
          created_at?: string
          current_step_order?: number | null
          deal_id?: string | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          context?: Json
          created_at?: string
          current_step_order?: number | null
          deal_id?: string | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "engagement_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "engagement_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      engagement_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          enrollment_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          status: string
          step_id: string | null
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          status: string
          step_id?: string | null
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          status?: string
          step_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "engagement_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "engagement_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "engagement_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      engagement_steps: {
        Row: {
          ai_prompt: string | null
          branch_conditions: Json | null
          campaign_id: string
          config: Json
          created_at: string
          id: string
          step_order: number
          step_type: string
          tenant_id: string
          updated_at: string
          wait_duration_seconds: number | null
        }
        Insert: {
          ai_prompt?: string | null
          branch_conditions?: Json | null
          campaign_id: string
          config?: Json
          created_at?: string
          id?: string
          step_order: number
          step_type: string
          tenant_id: string
          updated_at?: string
          wait_duration_seconds?: number | null
        }
        Update: {
          ai_prompt?: string | null
          branch_conditions?: Json | null
          campaign_id?: string
          config?: Json
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
          tenant_id?: string
          updated_at?: string
          wait_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "engagement_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "engagement_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      erasure_tombstones: {
        Row: {
          created_at: string | null
          erased_at: string | null
          erased_by_user_id: string | null
          id: string
          legal_basis: string | null
          notes: string | null
          pii_fields_erased: string[] | null
          related_records_deleted: string[] | null
          request_reference: string | null
          resource_id: string
          resource_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          erased_at?: string | null
          erased_by_user_id?: string | null
          id?: string
          legal_basis?: string | null
          notes?: string | null
          pii_fields_erased?: string[] | null
          related_records_deleted?: string[] | null
          request_reference?: string | null
          resource_id: string
          resource_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          erased_at?: string | null
          erased_by_user_id?: string | null
          id?: string
          legal_basis?: string | null
          notes?: string | null
          pii_fields_erased?: string[] | null
          related_records_deleted?: string[] | null
          request_reference?: string | null
          resource_id?: string
          resource_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erasure_tombstones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "erasure_tombstones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "erasure_tombstones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "erasure_tombstones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erasure_tombstones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      feature_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          feature_key: string
          feature_name: string
          icon_name: string | null
          is_active: boolean | null
          monthly_price_cents: number | null
          plan_tier_required: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          feature_key: string
          feature_name: string
          icon_name?: string | null
          is_active?: boolean | null
          monthly_price_cents?: number | null
          plan_tier_required: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          feature_key?: string
          feature_name?: string
          icon_name?: string | null
          is_active?: boolean | null
          monthly_price_cents?: number | null
          plan_tier_required?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      feature_flag_assignments: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          enabled: boolean
          environment: string
          expires_at: string | null
          flag_id: string
          id: string
          metadata: Json
          reason: string | null
          rollout_percentage: number | null
          tenant_id: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          enabled: boolean
          environment?: string
          expires_at?: string | null
          flag_id: string
          id?: string
          metadata?: Json
          reason?: string | null
          rollout_percentage?: number | null
          tenant_id?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          enabled?: boolean
          environment?: string
          expires_at?: string | null
          flag_id?: string
          id?: string
          metadata?: Json
          reason?: string | null
          rollout_percentage?: number | null
          tenant_id?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_assignments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flag_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      feature_flag_audit_log: {
        Row: {
          action: string
          context: Json | null
          environment: string
          flag_id: string | null
          id: string
          new_state: Json | null
          performed_at: string
          performed_by_user_id: string | null
          previous_state: Json | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          context?: Json | null
          environment?: string
          flag_id?: string | null
          id?: string
          new_state?: Json | null
          performed_at?: string
          performed_by_user_id?: string | null
          previous_state?: Json | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          context?: Json | null
          environment?: string
          flag_id?: string | null
          id?: string
          new_state?: Json | null
          performed_at?: string
          performed_by_user_id?: string | null
          previous_state?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_log_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flag_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      feature_flag_registry: {
        Row: {
          allow_tenant_override: boolean
          category: string
          created_at: string
          created_by_user_id: string | null
          default_enabled: boolean
          description: string | null
          flag_key: string
          id: string
          metadata: Json
          name: string
          rollout_type: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          allow_tenant_override?: boolean
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          default_enabled?: boolean
          description?: string | null
          flag_key: string
          id?: string
          metadata?: Json
          name: string
          rollout_type?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          allow_tenant_override?: boolean
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          default_enabled?: boolean
          description?: string | null
          flag_key?: string
          id?: string
          metadata?: Json
          name?: string
          rollout_type?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_registry_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_registry_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_registry_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_registry_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_registry_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_registry_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          enabled: boolean
          key: string
          requires_flags: string[] | null
          rollout_percentage: number | null
          tenant_overrides: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          key: string
          requires_flags?: string[] | null
          rollout_percentage?: number | null
          tenant_overrides?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          key?: string
          requires_flags?: string[] | null
          rollout_percentage?: number | null
          tenant_overrides?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_usage_stats: {
        Row: {
          created_at: string | null
          date: string
          feature_category: string | null
          feature_name: string
          id: string
          total_uses: number | null
          unique_tenants: number | null
          unique_users: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          feature_category?: string | null
          feature_name: string
          id?: string
          total_uses?: number | null
          unique_tenants?: number | null
          unique_users?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          feature_category?: string | null
          feature_name?: string
          id?: string
          total_uses?: number | null
          unique_tenants?: number | null
          unique_users?: number | null
        }
        Relationships: []
      }
      features: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_feature_id: string | null
          tier_requirements: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_feature_id?: string | null
          tier_requirements?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_feature_id?: string | null
          tier_requirements?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "features_parent_feature_id_fkey"
            columns: ["parent_feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          file_name: string | null
          id: string
          kind: string
          location_id: string | null
          mime_type: string | null
          original_name: string | null
          size_bytes: number | null
          storage_path: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string
          kind: string
          location_id?: string | null
          mime_type?: string | null
          original_name?: string | null
          size_bytes?: number | null
          storage_path: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string
          kind?: string
          location_id?: string | null
          mime_type?: string | null
          original_name?: string | null
          size_bytes?: number | null
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      form_versions: {
        Row: {
          change_summary: string | null
          changed_by_user_id: string | null
          changes: Json | null
          created_at: string | null
          form_id: string
          id: string
          snapshot: Json
          tenant_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by_user_id?: string | null
          changes?: Json | null
          created_at?: string | null
          form_id: string
          id?: string
          snapshot: Json
          tenant_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          changed_by_user_id?: string | null
          changes?: Json | null
          created_at?: string | null
          form_id?: string
          id?: string
          snapshot?: Json
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "marketing_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "form_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "form_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "form_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      gdpr_deletion_requests: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          completed_at: string | null
          deletion_scope: string
          deletion_summary: Json | null
          id: string
          metadata: Json | null
          rejection_reason: string | null
          requested_at: string | null
          requested_by_user_id: string
          status: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          completed_at?: string | null
          deletion_scope: string
          deletion_summary?: Json | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by_user_id: string
          status?: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          completed_at?: string | null
          deletion_scope?: string
          deletion_summary?: Json | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by_user_id?: string
          status?: string
          subject_id?: string
          subject_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gdpr_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gdpr_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gdpr_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdpr_deletion_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      gdpr_export_requests: {
        Row: {
          completed_at: string | null
          error_message: string | null
          expires_at: string | null
          export_format: string
          export_url: string | null
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          requested_at: string | null
          requested_by_user_id: string
          status: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_format: string
          export_url?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          requested_at?: string | null
          requested_by_user_id: string
          status?: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_format?: string
          export_url?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          requested_at?: string | null
          requested_by_user_id?: string
          status?: string
          subject_id?: string
          subject_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gdpr_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gdpr_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gdpr_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdpr_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      google_lead_form_configs: {
        Row: {
          conversion_action_resource_name: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          is_active: boolean
          login_customer_id: string | null
          oauth_connected_at: string | null
          oauth_connected_by_user_id: string | null
          oauth_pending_state: string | null
          oauth_pending_state_expires_at: string | null
          oauth_refresh_token_encrypted: string | null
          oauth_scope: string | null
          tenant_id: string
          updated_at: string
          webhook_key: string
        }
        Insert: {
          conversion_action_resource_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          login_customer_id?: string | null
          oauth_connected_at?: string | null
          oauth_connected_by_user_id?: string | null
          oauth_pending_state?: string | null
          oauth_pending_state_expires_at?: string | null
          oauth_refresh_token_encrypted?: string | null
          oauth_scope?: string | null
          tenant_id: string
          updated_at?: string
          webhook_key?: string
        }
        Update: {
          conversion_action_resource_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          login_customer_id?: string | null
          oauth_connected_at?: string | null
          oauth_connected_by_user_id?: string | null
          oauth_pending_state?: string | null
          oauth_pending_state_expires_at?: string | null
          oauth_refresh_token_encrypted?: string | null
          oauth_scope?: string | null
          tenant_id?: string
          updated_at?: string
          webhook_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_lead_form_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_oauth_connected_by_user_id_fkey"
            columns: ["oauth_connected_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_oauth_connected_by_user_id_fkey"
            columns: ["oauth_connected_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_oauth_connected_by_user_id_fkey"
            columns: ["oauth_connected_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_lead_form_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          appointment_id: string | null
          approved_amount_cents: number | null
          approved_date: string | null
          claim_amount_cents: number
          claim_date: string
          claim_number: string
          contact_id: string
          created_at: string | null
          created_by_user_id: string | null
          denial_code: string | null
          denial_reason: string | null
          id: string
          insurance_policy_id: string
          invoice_id: string | null
          notes: string | null
          paid_amount_cents: number | null
          paid_date: string | null
          patient_responsibility_cents: number | null
          procedures: Json | null
          status: string
          submitted_date: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          approved_amount_cents?: number | null
          approved_date?: string | null
          claim_amount_cents: number
          claim_date: string
          claim_number: string
          contact_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          denial_code?: string | null
          denial_reason?: string | null
          id?: string
          insurance_policy_id: string
          invoice_id?: string | null
          notes?: string | null
          paid_amount_cents?: number | null
          paid_date?: string | null
          patient_responsibility_cents?: number | null
          procedures?: Json | null
          status?: string
          submitted_date?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          approved_amount_cents?: number | null
          approved_date?: string | null
          claim_amount_cents?: number
          claim_date?: string
          claim_number?: string
          contact_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          denial_code?: string | null
          denial_reason?: string | null
          id?: string
          insurance_policy_id?: string
          invoice_id?: string | null
          notes?: string | null
          paid_amount_cents?: number | null
          paid_date?: string | null
          patient_responsibility_cents?: number | null
          procedures?: Json | null
          status?: string
          submitted_date?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "insurance_claims_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      insurance_payers: {
        Row: {
          accepts_assignment: boolean | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string | null
          default_annual_maximum_cents: number | null
          default_coverage_basic: number | null
          default_coverage_major: number | null
          default_coverage_preventive: number | null
          default_deductible_cents: number | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payer_id: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accepts_assignment?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          default_annual_maximum_cents?: number | null
          default_coverage_basic?: number | null
          default_coverage_major?: number | null
          default_coverage_preventive?: number | null
          default_deductible_cents?: number | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payer_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accepts_assignment?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          default_annual_maximum_cents?: number | null
          default_coverage_basic?: number | null
          default_coverage_major?: number | null
          default_coverage_preventive?: number | null
          default_deductible_cents?: number | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payer_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_payers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_payers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_payers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_payers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_payers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          annual_maximum_cents: number | null
          contact_id: string
          coverage_basic: number | null
          coverage_major: number | null
          coverage_preventive: number | null
          created_at: string | null
          deductible_cents: number | null
          deductible_met_cents: number | null
          effective_date: string | null
          group_number: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          payer_id: string
          policy_number: string
          subscriber_dob: string | null
          subscriber_name: string | null
          subscriber_relationship: string | null
          tenant_id: string
          termination_date: string | null
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          annual_maximum_cents?: number | null
          contact_id: string
          coverage_basic?: number | null
          coverage_major?: number | null
          coverage_preventive?: number | null
          created_at?: string | null
          deductible_cents?: number | null
          deductible_met_cents?: number | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          payer_id: string
          policy_number: string
          subscriber_dob?: string | null
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          tenant_id: string
          termination_date?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          annual_maximum_cents?: number | null
          contact_id?: string
          coverage_basic?: number | null
          coverage_major?: number | null
          coverage_preventive?: number | null
          created_at?: string | null
          deductible_cents?: number | null
          deductible_met_cents?: number | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          payer_id?: string
          policy_number?: string
          subscriber_dob?: string | null
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          tenant_id?: string
          termination_date?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "insurance_policies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_channel_settings: {
        Row: {
          default_from_email: string | null
          default_reply_to_email: string | null
          email_provider: string | null
          metadata: Json
          tenant_id: string
          twilio_account_sid: string | null
          twilio_messaging_service_sid: string | null
          twilio_sms_enabled: boolean | null
          twilio_sms_from_number: string | null
          twilio_voice_caller_id: string | null
          twilio_voice_enabled: boolean | null
          twilio_whatsapp_enabled: boolean | null
          twilio_whatsapp_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_from_email?: string | null
          default_reply_to_email?: string | null
          email_provider?: string | null
          metadata?: Json
          tenant_id: string
          twilio_account_sid?: string | null
          twilio_messaging_service_sid?: string | null
          twilio_sms_enabled?: boolean | null
          twilio_sms_from_number?: string | null
          twilio_voice_caller_id?: string | null
          twilio_voice_enabled?: boolean | null
          twilio_whatsapp_enabled?: boolean | null
          twilio_whatsapp_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_from_email?: string | null
          default_reply_to_email?: string | null
          email_provider?: string | null
          metadata?: Json
          tenant_id?: string
          twilio_account_sid?: string | null
          twilio_messaging_service_sid?: string | null
          twilio_sms_enabled?: boolean | null
          twilio_sms_from_number?: string | null
          twilio_voice_caller_id?: string | null
          twilio_voice_enabled?: boolean | null
          twilio_whatsapp_enabled?: boolean | null
          twilio_whatsapp_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_channel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_channel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_channel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_channel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_channel_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_channel_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_channel_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "integration_channel_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          config: Json | null
          created_at: string | null
          created_by: string | null
          credentials: Json
          deleted_at: string | null
          error_count: number | null
          error_message: string | null
          id: string
          integration_name: string | null
          integration_type: string
          is_active: boolean | null
          is_test_mode: boolean | null
          last_error_at: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          mapping_config: Json | null
          next_sync_at: string | null
          scopes: string[] | null
          status: string
          sync_frequency: string | null
          tenant_id: string
          test_credentials: Json | null
          token_expires_at: string | null
          token_last_refreshed_at: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          credentials?: Json
          deleted_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          integration_name?: string | null
          integration_type: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_error_at?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          mapping_config?: Json | null
          next_sync_at?: string | null
          scopes?: string[] | null
          status: string
          sync_frequency?: string | null
          tenant_id: string
          test_credentials?: Json | null
          token_expires_at?: string | null
          token_last_refreshed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          credentials?: Json
          deleted_at?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          integration_name?: string | null
          integration_type?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          last_error_at?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          mapping_config?: Json | null
          next_sync_at?: string | null
          scopes?: string[] | null
          status?: string
          sync_frequency?: string | null
          tenant_id?: string
          test_credentials?: Json | null
          token_expires_at?: string | null
          token_last_refreshed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_dlq: {
        Row: {
          connection_id: string | null
          context: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string
          error_stack: string | null
          first_failed_at: string | null
          id: string
          integration_type: string
          last_retry_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          operation: string
          payload: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          retry_delays: number[] | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          connection_id?: string | null
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message: string
          error_stack?: string | null
          first_failed_at?: string | null
          id?: string
          integration_type: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          operation: string
          payload: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          retry_delays?: number[] | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string | null
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string
          error_stack?: string | null
          first_failed_at?: string | null
          id?: string
          integration_type?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          operation?: string
          payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          retry_delays?: number[] | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_dlq_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          connection_id: string | null
          correlation_id: string | null
          created_at: string | null
          direction: string | null
          duration_ms: number | null
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          external_id: string | null
          id: string
          idempotency_key: string | null
          integration_type: string
          method: string | null
          operation: string
          request_headers: Json | null
          request_payload: Json | null
          response_headers: Json | null
          response_payload: Json | null
          response_status: number | null
          retry_count: number | null
          status: string
          tenant_id: string
          url: string | null
        }
        Insert: {
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          direction?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          idempotency_key?: string | null
          integration_type: string
          method?: string | null
          operation: string
          request_headers?: Json | null
          request_payload?: Json | null
          response_headers?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          retry_count?: number | null
          status: string
          tenant_id: string
          url?: string | null
        }
        Update: {
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          direction?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          idempotency_key?: string | null
          integration_type?: string
          method?: string | null
          operation?: string
          request_headers?: Json | null
          request_payload?: Json | null
          response_headers?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          retry_count?: number | null
          status?: string
          tenant_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_rate_limits: {
        Row: {
          connection_id: string | null
          created_at: string | null
          id: string
          integration_type: string
          requests_count: number | null
          requests_limit: number
          requests_remaining: number | null
          reset_at: string
          tenant_id: string
          updated_at: string | null
          window_duration_ms: number
          window_start: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          id?: string
          integration_type: string
          requests_count?: number | null
          requests_limit: number
          requests_remaining?: number | null
          reset_at: string
          tenant_id: string
          updated_at?: string | null
          window_duration_ms: number
          window_start: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          id?: string
          integration_type?: string
          requests_count?: number | null
          requests_limit?: number
          requests_remaining?: number | null
          reset_at?: string
          tenant_id?: string
          updated_at?: string | null
          window_duration_ms?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_secret_vault: {
        Row: {
          credential_version: number
          encrypted_credentials: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          credential_version?: number
          encrypted_credentials: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          credential_version?: number
          encrypted_credentials?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_secret_vault_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_secret_vault_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_secret_vault_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_secret_vault_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_secret_vault_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_secret_vault_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_secret_vault_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "integration_secret_vault_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string | null
          email_api_key: string | null
          email_from_address: string | null
          email_from_name: string | null
          email_oauth_expires_at: string | null
          email_oauth_refresh_token: string | null
          email_oauth_token: string | null
          email_provider: string | null
          email_webhook_url: string | null
          id: string
          is_email_configured: boolean | null
          is_sms_configured: boolean | null
          is_voice_configured: boolean | null
          is_whatsapp_configured: boolean | null
          sms_account_sid: string | null
          sms_auth_token: string | null
          sms_from_number: string | null
          sms_provider: string | null
          sms_webhook_url: string | null
          tenant_id: string
          updated_at: string | null
          voice_account_sid: string | null
          voice_auth_token: string | null
          voice_from_number: string | null
          voice_provider: string | null
          voice_webhook_url: string | null
          whatsapp_account_sid: string | null
          whatsapp_auth_token: string | null
          whatsapp_from_number: string | null
          whatsapp_provider: string | null
          whatsapp_webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          email_api_key?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_oauth_expires_at?: string | null
          email_oauth_refresh_token?: string | null
          email_oauth_token?: string | null
          email_provider?: string | null
          email_webhook_url?: string | null
          id?: string
          is_email_configured?: boolean | null
          is_sms_configured?: boolean | null
          is_voice_configured?: boolean | null
          is_whatsapp_configured?: boolean | null
          sms_account_sid?: string | null
          sms_auth_token?: string | null
          sms_from_number?: string | null
          sms_provider?: string | null
          sms_webhook_url?: string | null
          tenant_id: string
          updated_at?: string | null
          voice_account_sid?: string | null
          voice_auth_token?: string | null
          voice_from_number?: string | null
          voice_provider?: string | null
          voice_webhook_url?: string | null
          whatsapp_account_sid?: string | null
          whatsapp_auth_token?: string | null
          whatsapp_from_number?: string | null
          whatsapp_provider?: string | null
          whatsapp_webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          email_api_key?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_oauth_expires_at?: string | null
          email_oauth_refresh_token?: string | null
          email_oauth_token?: string | null
          email_provider?: string | null
          email_webhook_url?: string | null
          id?: string
          is_email_configured?: boolean | null
          is_sms_configured?: boolean | null
          is_voice_configured?: boolean | null
          is_whatsapp_configured?: boolean | null
          sms_account_sid?: string | null
          sms_auth_token?: string | null
          sms_from_number?: string | null
          sms_provider?: string | null
          sms_webhook_url?: string | null
          tenant_id?: string
          updated_at?: string | null
          voice_account_sid?: string | null
          voice_auth_token?: string | null
          voice_from_number?: string | null
          voice_provider?: string | null
          voice_webhook_url?: string | null
          whatsapp_account_sid?: string | null
          whatsapp_auth_token?: string | null
          whatsapp_from_number?: string | null
          whatsapp_provider?: string | null
          whatsapp_webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      integration_webhooks_log: {
        Row: {
          connection_id: string | null
          created_at: string | null
          error_message: string | null
          external_id: string
          headers: Json | null
          id: string
          idempotency_key: string | null
          integration_type: string
          ip_address: string | null
          payload: Json
          payload_hash: string
          processed_at: string | null
          processing_duration_ms: number | null
          result_entity_id: string | null
          result_entity_type: string | null
          signature_algorithm: string | null
          signature_verified: boolean | null
          status: string | null
          tenant_id: string
          user_agent: string | null
          webhook_event: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          external_id: string
          headers?: Json | null
          id?: string
          idempotency_key?: string | null
          integration_type: string
          ip_address?: string | null
          payload: Json
          payload_hash: string
          processed_at?: string | null
          processing_duration_ms?: number | null
          result_entity_id?: string | null
          result_entity_type?: string | null
          signature_algorithm?: string | null
          signature_verified?: boolean | null
          status?: string | null
          tenant_id: string
          user_agent?: string | null
          webhook_event?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          external_id?: string
          headers?: Json | null
          id?: string
          idempotency_key?: string | null
          integration_type?: string
          ip_address?: string | null
          payload?: Json
          payload_hash?: string
          processed_at?: string | null
          processing_duration_ms?: number | null
          result_entity_id?: string | null
          result_entity_type?: string | null
          signature_algorithm?: string | null
          signature_verified?: boolean | null
          status?: string | null
          tenant_id?: string
          user_agent?: string | null
          webhook_event?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_webhooks_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_webhooks_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "integration_webhooks_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhooks_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      invite_batches: {
        Row: {
          collision_count: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          failed_count: number | null
          id: string
          metadata: Json | null
          status: string
          success_count: number | null
          tenant_id: string
          total_count: number
        }
        Insert: {
          collision_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          success_count?: number | null
          tenant_id: string
          total_count: number
        }
        Update: {
          collision_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          success_count?: number | null
          tenant_id?: string
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invite_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invite_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invite_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      invite_settings: {
        Row: {
          allow_resend: boolean | null
          auto_approve_join_requests: boolean | null
          created_at: string | null
          custom_invite_message: string | null
          invite_expiry_days: number | null
          max_pending_invites: number | null
          max_resend_count: number | null
          metadata: Json | null
          require_email_verification: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_resend?: boolean | null
          auto_approve_join_requests?: boolean | null
          created_at?: string | null
          custom_invite_message?: string | null
          invite_expiry_days?: number | null
          max_pending_invites?: number | null
          max_resend_count?: number | null
          metadata?: Json | null
          require_email_verification?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_resend?: boolean | null
          auto_approve_join_requests?: boolean | null
          created_at?: string | null
          custom_invite_message?: string | null
          invite_expiry_days?: number | null
          max_pending_invites?: number | null
          max_resend_count?: number | null
          metadata?: Json | null
          require_email_verification?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invite_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invite_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invite_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          dental_group_id: string | null
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          line_items: Json
          paid_at: string | null
          status: string
          stripe_hosted_url: string | null
          stripe_invoice_id: string | null
          stripe_pdf_url: string | null
          subscription_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          dental_group_id?: string | null
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          line_items?: Json
          paid_at?: string | null
          status?: string
          stripe_hosted_url?: string | null
          stripe_invoice_id?: string | null
          stripe_pdf_url?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          dental_group_id?: string | null
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          line_items?: Json
          paid_at?: string | null
          status?: string
          stripe_hosted_url?: string | null
          stripe_invoice_id?: string | null
          stripe_pdf_url?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_dental_group_id_fkey"
            columns: ["dental_group_id"]
            isOneToOne: false
            referencedRelation: "dental_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      isolation_violations: {
        Row: {
          attempted_org_id: string | null
          created_at: string | null
          id: number
          ip_address: string | null
          query_details: Json | null
          record_id: string | null
          stack_trace: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
          user_org_id: string | null
          violation_type: string
        }
        Insert: {
          attempted_org_id?: string | null
          created_at?: string | null
          id?: number
          ip_address?: string | null
          query_details?: Json | null
          record_id?: string | null
          stack_trace?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_org_id?: string | null
          violation_type: string
        }
        Update: {
          attempted_org_id?: string | null
          created_at?: string | null
          id?: number
          ip_address?: string | null
          query_details?: Json | null
          record_id?: string | null
          stack_trace?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_org_id?: string | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "isolation_violations_attempted_org_id_fkey"
            columns: ["attempted_org_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_attempted_org_id_fkey"
            columns: ["attempted_org_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_attempted_org_id_fkey"
            columns: ["attempted_org_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_attempted_org_id_fkey"
            columns: ["attempted_org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isolation_violations_attempted_org_id_fkey"
            columns: ["attempted_org_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_user_org_id_fkey"
            columns: ["user_org_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_user_org_id_fkey"
            columns: ["user_org_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_user_org_id_fkey"
            columns: ["user_org_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "isolation_violations_user_org_id_fkey"
            columns: ["user_org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isolation_violations_user_org_id_fkey"
            columns: ["user_org_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      lead_intent_sessions: {
        Row: {
          consent_captured_at: string | null
          consent_ip_address: unknown
          consent_marketing: boolean | null
          consent_method: string | null
          consent_text: string | null
          consent_text_version: string | null
          consent_transactional: boolean | null
          consent_user_agent: string | null
          created_at: string
          expires_at: string
          fbclid: string | null
          gclid: string | null
          id: string
          intent_path: string
          ip_address: unknown
          join_method: string | null
          joined_at: string | null
          joined_to_contact_id: string | null
          landing_page_url: string | null
          metadata: Json
          msclkid: string | null
          phone_e164: string | null
          practice_booking_widget_id: string | null
          practice_location_id: string | null
          redirect_completed_at: string | null
          redirect_destination_url: string | null
          referrer_url: string | null
          session_token: string
          source_channel:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          source_sub_id: string | null
          tenant_id: string
          treatment_offering_id: string | null
          ttclid: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp_tracking_code: string | null
        }
        Insert: {
          consent_captured_at?: string | null
          consent_ip_address?: unknown
          consent_marketing?: boolean | null
          consent_method?: string | null
          consent_text?: string | null
          consent_text_version?: string | null
          consent_transactional?: boolean | null
          consent_user_agent?: string | null
          created_at?: string
          expires_at?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          intent_path: string
          ip_address?: unknown
          join_method?: string | null
          joined_at?: string | null
          joined_to_contact_id?: string | null
          landing_page_url?: string | null
          metadata?: Json
          msclkid?: string | null
          phone_e164?: string | null
          practice_booking_widget_id?: string | null
          practice_location_id?: string | null
          redirect_completed_at?: string | null
          redirect_destination_url?: string | null
          referrer_url?: string | null
          session_token: string
          source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          source_sub_id?: string | null
          tenant_id: string
          treatment_offering_id?: string | null
          ttclid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_tracking_code?: string | null
        }
        Update: {
          consent_captured_at?: string | null
          consent_ip_address?: unknown
          consent_marketing?: boolean | null
          consent_method?: string | null
          consent_text?: string | null
          consent_text_version?: string | null
          consent_transactional?: boolean | null
          consent_user_agent?: string | null
          created_at?: string
          expires_at?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          intent_path?: string
          ip_address?: unknown
          join_method?: string | null
          joined_at?: string | null
          joined_to_contact_id?: string | null
          landing_page_url?: string | null
          metadata?: Json
          msclkid?: string | null
          phone_e164?: string | null
          practice_booking_widget_id?: string | null
          practice_location_id?: string | null
          redirect_completed_at?: string | null
          redirect_destination_url?: string | null
          referrer_url?: string | null
          session_token?: string
          source_channel?:
            | Database["public"]["Enums"]["source_channel_enum"]
            | null
          source_sub_id?: string | null
          tenant_id?: string
          treatment_offering_id?: string | null
          ttclid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_intent_sessions_joined_contact_fkey"
            columns: ["joined_to_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_joined_contact_fkey"
            columns: ["joined_to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_practice_location_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_treatment_offering_id_fkey"
            columns: ["treatment_offering_id"]
            isOneToOne: false
            referencedRelation: "practice_treatment_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_intent_sessions_widget_fkey"
            columns: ["practice_booking_widget_id"]
            isOneToOne: false
            referencedRelation: "practice_booking_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sla_rules: {
        Row: {
          business_hours_end: string
          business_hours_only: boolean
          business_hours_start: string
          business_hours_timezone: string
          created_at: string
          escalation_after_minutes: number | null
          escalation_chain: Json
          first_response_minutes: number
          id: string
          is_active: boolean
          metadata: Json
          practice_location_id: string | null
          source_channel: Database["public"]["Enums"]["source_channel_enum"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          business_hours_end?: string
          business_hours_only?: boolean
          business_hours_start?: string
          business_hours_timezone?: string
          created_at?: string
          escalation_after_minutes?: number | null
          escalation_chain?: Json
          first_response_minutes: number
          id?: string
          is_active?: boolean
          metadata?: Json
          practice_location_id?: string | null
          source_channel: Database["public"]["Enums"]["source_channel_enum"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          business_hours_end?: string
          business_hours_only?: boolean
          business_hours_start?: string
          business_hours_timezone?: string
          created_at?: string
          escalation_after_minutes?: number | null
          escalation_chain?: Json
          first_response_minutes?: number
          id?: string
          is_active?: boolean
          metadata?: Json
          practice_location_id?: string | null
          source_channel?: Database["public"]["Enums"]["source_channel_enum"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sla_rules_practice_location_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lead_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sla_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          metadata: Json | null
          name: string
          phone: string | null
          postal_code: string | null
          settings: Json | null
          state: string | null
          tenant_id: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json | null
          name: string
          phone?: string | null
          postal_code?: string | null
          settings?: Json | null
          state?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          settings?: Json | null
          state?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_activity_log: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          occurred_at: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          occurred_at?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          occurred_at?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_ai_suggestions: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          accepted_by_user_id: string | null
          ai_model: string | null
          ai_prompt: string | null
          ai_tokens_used: number | null
          confidence_score: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          original_content: string | null
          reasoning: string | null
          suggested_content: string
          suggestion_type: string
          tenant_id: string
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          ai_model?: string | null
          ai_prompt?: string | null
          ai_tokens_used?: number | null
          confidence_score?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          original_content?: string | null
          reasoning?: string | null
          suggested_content: string
          suggestion_type: string
          tenant_id: string
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          ai_model?: string | null
          ai_prompt?: string | null
          ai_tokens_used?: number | null
          confidence_score?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          original_content?: string | null
          reasoning?: string | null
          suggested_content?: string
          suggestion_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ai_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_approvals: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          notified_users: string[] | null
          requested_at: string | null
          requested_by_user_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          notified_users?: string[] | null
          requested_at?: string | null
          requested_by_user_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          notified_users?: string[] | null
          requested_at?: string | null
          requested_by_user_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_attribution: {
        Row: {
          attribution_model: string
          campaign_cost_cents: number | null
          contact_id: string
          conversion_timestamp: string | null
          created_at: string | null
          deal_id: string
          deal_stage: string | null
          deal_value_cents: number | null
          deal_won: boolean | null
          first_touch_campaign_id: string | null
          first_touch_campaign_name: string | null
          first_touch_timestamp: string | null
          id: string
          last_touch_campaign_id: string | null
          last_touch_campaign_name: string | null
          last_touch_timestamp: string | null
          roi_multiplier: number | null
          tenant_id: string
          touchpoint_sequence: Json
          updated_at: string | null
        }
        Insert: {
          attribution_model?: string
          campaign_cost_cents?: number | null
          contact_id: string
          conversion_timestamp?: string | null
          created_at?: string | null
          deal_id: string
          deal_stage?: string | null
          deal_value_cents?: number | null
          deal_won?: boolean | null
          first_touch_campaign_id?: string | null
          first_touch_campaign_name?: string | null
          first_touch_timestamp?: string | null
          id?: string
          last_touch_campaign_id?: string | null
          last_touch_campaign_name?: string | null
          last_touch_timestamp?: string | null
          roi_multiplier?: number | null
          tenant_id: string
          touchpoint_sequence?: Json
          updated_at?: string | null
        }
        Update: {
          attribution_model?: string
          campaign_cost_cents?: number | null
          contact_id?: string
          conversion_timestamp?: string | null
          created_at?: string | null
          deal_id?: string
          deal_stage?: string | null
          deal_value_cents?: number | null
          deal_won?: boolean | null
          first_touch_campaign_id?: string | null
          first_touch_campaign_name?: string | null
          first_touch_timestamp?: string | null
          id?: string
          last_touch_campaign_id?: string | null
          last_touch_campaign_name?: string | null
          last_touch_timestamp?: string | null
          roi_multiplier?: number | null
          tenant_id?: string
          touchpoint_sequence?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_attribution_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_attribution_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_audiences: {
        Row: {
          contact_count: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_refreshed_at: string | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          contact_count?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_refreshed_at?: string | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          contact_count?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_refreshed_at?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_audiences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_audiences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_audiences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_audiences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_audiences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_audit_competitors: {
        Row: {
          analytics_score: number | null
          competitor_address: string | null
          competitor_domain: string | null
          competitor_name: string
          competitor_place_id: string | null
          composite_score: number | null
          content_score: number | null
          conversion_score: number | null
          discovered_at: string | null
          distance_miles: number | null
          id: string
          last_updated_at: string | null
          local_score: number | null
          metrics: Json | null
          rank: number | null
          run_id: string
          technical_score: number | null
          tenant_id: string
        }
        Insert: {
          analytics_score?: number | null
          competitor_address?: string | null
          competitor_domain?: string | null
          competitor_name: string
          competitor_place_id?: string | null
          composite_score?: number | null
          content_score?: number | null
          conversion_score?: number | null
          discovered_at?: string | null
          distance_miles?: number | null
          id?: string
          last_updated_at?: string | null
          local_score?: number | null
          metrics?: Json | null
          rank?: number | null
          run_id: string
          technical_score?: number | null
          tenant_id: string
        }
        Update: {
          analytics_score?: number | null
          competitor_address?: string | null
          competitor_domain?: string | null
          competitor_name?: string
          competitor_place_id?: string | null
          composite_score?: number | null
          content_score?: number | null
          conversion_score?: number | null
          discovered_at?: string | null
          distance_miles?: number | null
          id?: string
          last_updated_at?: string | null
          local_score?: number | null
          metrics?: Json | null
          rank?: number | null
          run_id?: string
          technical_score?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_competitors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "latest_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_competitors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_metrics: {
        Row: {
          category: string
          collected_at: string | null
          evidence_url: string | null
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number | null
          raw_data: Json | null
          run_id: string
          source: string
          tenant_id: string
        }
        Insert: {
          category: string
          collected_at?: string | null
          evidence_url?: string | null
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value?: number | null
          raw_data?: Json | null
          run_id: string
          source: string
          tenant_id: string
        }
        Update: {
          category?: string
          collected_at?: string | null
          evidence_url?: string | null
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number | null
          raw_data?: Json | null
          run_id?: string
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_metrics_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "latest_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_metrics_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_recommendations: {
        Row: {
          action_steps: Json | null
          category: string
          completed_at: string | null
          confidence: string | null
          created_at: string | null
          current_value: number | null
          deal_id: string | null
          description: string | null
          dismissed_at: string | null
          dismissed_reason: string | null
          effort: string
          estimated_hours: number | null
          evidence_metric_ids: string[] | null
          id: string
          impact: string
          priority_score: number | null
          run_id: string
          status: string | null
          target_value: number | null
          task_id: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          action_steps?: Json | null
          category: string
          completed_at?: string | null
          confidence?: string | null
          created_at?: string | null
          current_value?: number | null
          deal_id?: string | null
          description?: string | null
          dismissed_at?: string | null
          dismissed_reason?: string | null
          effort: string
          estimated_hours?: number | null
          evidence_metric_ids?: string[] | null
          id?: string
          impact: string
          priority_score?: number | null
          run_id: string
          status?: string | null
          target_value?: number | null
          task_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          action_steps?: Json | null
          category?: string
          completed_at?: string | null
          confidence?: string | null
          created_at?: string | null
          current_value?: number | null
          deal_id?: string | null
          description?: string | null
          dismissed_at?: string | null
          dismissed_reason?: string | null
          effort?: string
          estimated_hours?: number | null
          evidence_metric_ids?: string[] | null
          id?: string
          impact?: string
          priority_score?: number | null
          run_id?: string
          status?: string | null
          target_value?: number | null
          task_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "latest_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_reports: {
        Row: {
          created_at: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      marketing_audit_runs: {
        Row: {
          analytics_score: number | null
          api_calls: Json | null
          api_costs_usd: number | null
          completed_at: string | null
          composite_score: number | null
          content_score: number | null
          conversion_score: number | null
          created_at: string | null
          created_by: string | null
          domain: string
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          gap_to_median: number | null
          gap_to_top_3_avg: number | null
          id: string
          local_score: number | null
          peer_count: number | null
          peer_group_id: string | null
          percentile_rank: number | null
          phase: number | null
          practice_id: string
          run_type: string | null
          started_at: string | null
          status: string
          technical_score: number | null
          tenant_id: string
          updated_at: string | null
          your_rank: number | null
        }
        Insert: {
          analytics_score?: number | null
          api_calls?: Json | null
          api_costs_usd?: number | null
          completed_at?: string | null
          composite_score?: number | null
          content_score?: number | null
          conversion_score?: number | null
          created_at?: string | null
          created_by?: string | null
          domain: string
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          gap_to_median?: number | null
          gap_to_top_3_avg?: number | null
          id?: string
          local_score?: number | null
          peer_count?: number | null
          peer_group_id?: string | null
          percentile_rank?: number | null
          phase?: number | null
          practice_id: string
          run_type?: string | null
          started_at?: string | null
          status?: string
          technical_score?: number | null
          tenant_id: string
          updated_at?: string | null
          your_rank?: number | null
        }
        Update: {
          analytics_score?: number | null
          api_calls?: Json | null
          api_costs_usd?: number | null
          completed_at?: string | null
          composite_score?: number | null
          content_score?: number | null
          conversion_score?: number | null
          created_at?: string | null
          created_by?: string | null
          domain?: string
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          gap_to_median?: number | null
          gap_to_top_3_avg?: number | null
          id?: string
          local_score?: number | null
          peer_count?: number | null
          peer_group_id?: string | null
          percentile_rank?: number | null
          phase?: number | null
          practice_id?: string
          run_type?: string | null
          started_at?: string | null
          status?: string
          technical_score?: number | null
          tenant_id?: string
          updated_at?: string | null
          your_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_peer_group"
            columns: ["peer_group_id"]
            isOneToOne: false
            referencedRelation: "audit_peer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_schedules: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          enabled: boolean | null
          frequency: string
          id: string
          last_run_at: string | null
          last_run_id: string | null
          next_run_at: string | null
          notification_emails: string[] | null
          notify_on_completion: boolean | null
          notify_on_regression: boolean | null
          practice_id: string
          regression_threshold: number | null
          tenant_id: string
          time_of_day: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean | null
          frequency: string
          id?: string
          last_run_at?: string | null
          last_run_id?: string | null
          next_run_at?: string | null
          notification_emails?: string[] | null
          notify_on_completion?: boolean | null
          notify_on_regression?: boolean | null
          practice_id: string
          regression_threshold?: number | null
          tenant_id: string
          time_of_day?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean | null
          frequency?: string
          id?: string
          last_run_at?: string | null
          last_run_id?: string | null
          next_run_at?: string | null
          notification_emails?: string[] | null
          notify_on_completion?: boolean | null
          notify_on_regression?: boolean | null
          practice_id?: string
          regression_threshold?: number | null
          tenant_id?: string
          time_of_day?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_schedules_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "latest_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_schedules_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_shares: {
        Row: {
          access_count: number | null
          audit_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_accessed_at: string | null
          password_protected: boolean | null
          share_token: string
        }
        Insert: {
          access_count?: number | null
          audit_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          password_protected?: boolean | null
          share_token: string
        }
        Update: {
          access_count?: number | null
          audit_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          password_protected?: boolean | null
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_audit_shares_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "latest_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_audit_shares_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_webhook_logs: {
        Row: {
          attempt_number: number | null
          delivered_at: string
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_code: number | null
          success: boolean | null
          webhook_id: string
        }
        Insert: {
          attempt_number?: number | null
          delivered_at?: string
          event: string
          id?: string
          payload: Json
          response_body?: string | null
          response_code?: number | null
          success?: boolean | null
          webhook_id: string
        }
        Update: {
          attempt_number?: number | null
          delivered_at?: string
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          success?: boolean | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_audit_webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "marketing_audit_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_audit_webhooks: {
        Row: {
          active: boolean | null
          created_at: string
          created_by: string | null
          events: string[]
          failed_deliveries: number | null
          id: string
          last_error: string | null
          last_success_at: string | null
          last_triggered_at: string | null
          secret: string
          tenant_id: string
          total_deliveries: number | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          events: string[]
          failed_deliveries?: number | null
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          secret: string
          tenant_id: string
          total_deliveries?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          events?: string[]
          failed_deliveries?: number | null
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          secret?: string
          tenant_id?: string
          total_deliveries?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_audit_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_audit_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_audit_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_audit_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_audit_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_campaign_variants: {
        Row: {
          campaign_id: string
          clicks: number | null
          content_json: Json | null
          created_at: string | null
          delivered: number | null
          from_name: string | null
          id: string
          opens: number | null
          send_split_pct: number | null
          sends: number | null
          subject_line: string | null
          template_id: string | null
          unique_clicks: number | null
          unique_opens: number | null
          unsubscribes: number | null
          variant_key: string
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          content_json?: Json | null
          created_at?: string | null
          delivered?: number | null
          from_name?: string | null
          id?: string
          opens?: number | null
          send_split_pct?: number | null
          sends?: number | null
          subject_line?: string | null
          template_id?: string | null
          unique_clicks?: number | null
          unique_opens?: number | null
          unsubscribes?: number | null
          variant_key: string
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          content_json?: Json | null
          created_at?: string | null
          delivered?: number | null
          from_name?: string | null
          id?: string
          opens?: number | null
          send_split_pct?: number | null
          sends?: number | null
          subject_line?: string | null
          template_id?: string | null
          unique_clicks?: number | null
          unique_opens?: number | null
          unsubscribes?: number | null
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_attribution"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketing_campaign_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ab_test_split_pct: number | null
          ab_test_type: string | null
          ab_winner_selected_at: string | null
          ab_winner_variant_id: string | null
          audience_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          deleted_at: string | null
          from_email: string | null
          from_name: string | null
          id: string
          is_ab_test: boolean | null
          name: string
          notes: string | null
          preheader: string | null
          reply_to_email: string | null
          schedule_at: string | null
          segment_id: string | null
          send_completed_at: string | null
          send_started_at: string | null
          social_media_posts: Json | null
          status: string
          subject_line: string | null
          tags: string[] | null
          target_count: number | null
          template_id: string | null
          tenant_id: string
          total_bounces: number | null
          total_clicks: number | null
          total_delivered: number | null
          total_opens: number | null
          total_sends: number | null
          total_spam_reports: number | null
          total_unique_clicks: number | null
          total_unique_opens: number | null
          total_unsubscribes: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          ab_test_split_pct?: number | null
          ab_test_type?: string | null
          ab_winner_selected_at?: string | null
          ab_winner_variant_id?: string | null
          audience_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_ab_test?: boolean | null
          name: string
          notes?: string | null
          preheader?: string | null
          reply_to_email?: string | null
          schedule_at?: string | null
          segment_id?: string | null
          send_completed_at?: string | null
          send_started_at?: string | null
          social_media_posts?: Json | null
          status?: string
          subject_line?: string | null
          tags?: string[] | null
          target_count?: number | null
          template_id?: string | null
          tenant_id: string
          total_bounces?: number | null
          total_clicks?: number | null
          total_delivered?: number | null
          total_opens?: number | null
          total_sends?: number | null
          total_spam_reports?: number | null
          total_unique_clicks?: number | null
          total_unique_opens?: number | null
          total_unsubscribes?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          ab_test_split_pct?: number | null
          ab_test_type?: string | null
          ab_winner_selected_at?: string | null
          ab_winner_variant_id?: string | null
          audience_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_ab_test?: boolean | null
          name?: string
          notes?: string | null
          preheader?: string | null
          reply_to_email?: string | null
          schedule_at?: string | null
          segment_id?: string | null
          send_completed_at?: string | null
          send_started_at?: string | null
          social_media_posts?: Json | null
          status?: string
          subject_line?: string | null
          tags?: string[] | null
          target_count?: number | null
          template_id?: string | null
          tenant_id?: string
          total_bounces?: number | null
          total_clicks?: number | null
          total_delivered?: number | null
          total_opens?: number | null
          total_sends?: number | null
          total_spam_reports?: number | null
          total_unique_clicks?: number | null
          total_unique_opens?: number | null
          total_unsubscribes?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "marketing_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_comments: {
        Row: {
          comment: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_reply: boolean | null
          is_resolved: boolean | null
          mentions: string[] | null
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_reply?: boolean | null
          is_resolved?: boolean | null
          mentions?: string[] | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_reply?: boolean | null
          is_resolved?: boolean | null
          mentions?: string[] | null
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "marketing_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_events: {
        Row: {
          bounce_reason: string | null
          bounce_type: string | null
          campaign_id: string | null
          contact_id: string
          created_at: string | null
          device_type: string | null
          email_client: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_label: string | null
          link_url: string | null
          location_city: string | null
          location_country: string | null
          occurred_at: string | null
          provider_event_id: string | null
          raw_data: Json | null
          send_id: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounce_type?: string | null
          campaign_id?: string | null
          contact_id: string
          created_at?: string | null
          device_type?: string | null
          email_client?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_url?: string | null
          location_city?: string | null
          location_country?: string | null
          occurred_at?: string | null
          provider_event_id?: string | null
          raw_data?: Json | null
          send_id?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounce_type?: string | null
          campaign_id?: string | null
          contact_id?: string
          created_at?: string | null
          device_type?: string | null
          email_client?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_url?: string | null
          location_city?: string | null
          location_country?: string | null
          occurred_at?: string | null
          provider_event_id?: string | null
          raw_data?: Json | null
          send_id?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_attribution"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketing_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "marketing_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_form_submissions: {
        Row: {
          contact_created: boolean | null
          contact_id: string | null
          contact_updated: boolean | null
          created_at: string | null
          duplicate_submission: boolean | null
          error_message: string | null
          form_id: string
          honeypot_triggered: boolean | null
          id: string
          ip_address: string | null
          is_spam: boolean | null
          location_city: string | null
          location_country: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          referrer_url: string | null
          source_url: string | null
          spam_score: number | null
          submitted_at: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          contact_created?: boolean | null
          contact_id?: string | null
          contact_updated?: boolean | null
          created_at?: string | null
          duplicate_submission?: boolean | null
          error_message?: string | null
          form_id: string
          honeypot_triggered?: boolean | null
          id?: string
          ip_address?: string | null
          is_spam?: boolean | null
          location_city?: string | null
          location_country?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          referrer_url?: string | null
          source_url?: string | null
          spam_score?: number | null
          submitted_at?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          contact_created?: boolean | null
          contact_id?: string | null
          contact_updated?: boolean | null
          created_at?: string | null
          duplicate_submission?: boolean | null
          error_message?: string | null
          form_id?: string
          honeypot_triggered?: boolean | null
          id?: string
          ip_address?: string | null
          is_spam?: boolean | null
          location_city?: string | null
          location_country?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          referrer_url?: string | null
          source_url?: string | null
          spam_score?: number | null
          submitted_at?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "marketing_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_forms: {
        Row: {
          assign_to_user_id: string | null
          auto_add_tags: string[] | null
          auto_add_to_segment_id: string | null
          auto_start_journey_id: string | null
          button_text: string | null
          confirmation_template_id: string | null
          conversion_rate: number | null
          created_at: string | null
          created_by_user_id: string | null
          custom_css: string | null
          deleted_at: string | null
          description: string | null
          embed_code: string | null
          enable_honeypot: boolean | null
          enable_recaptcha: boolean | null
          fields_json: Json
          id: string
          is_published: boolean | null
          name: string
          public_url_slug: string | null
          recaptcha_site_key: string | null
          redirect_url: string | null
          require_double_opt_in: boolean | null
          send_confirmation_email: boolean | null
          status: string
          success_message: string | null
          tenant_id: string
          theme: string | null
          total_spam_blocked: number | null
          total_submissions: number | null
          total_views: number | null
          updated_at: string | null
        }
        Insert: {
          assign_to_user_id?: string | null
          auto_add_tags?: string[] | null
          auto_add_to_segment_id?: string | null
          auto_start_journey_id?: string | null
          button_text?: string | null
          confirmation_template_id?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_css?: string | null
          deleted_at?: string | null
          description?: string | null
          embed_code?: string | null
          enable_honeypot?: boolean | null
          enable_recaptcha?: boolean | null
          fields_json?: Json
          id?: string
          is_published?: boolean | null
          name: string
          public_url_slug?: string | null
          recaptcha_site_key?: string | null
          redirect_url?: string | null
          require_double_opt_in?: boolean | null
          send_confirmation_email?: boolean | null
          status?: string
          success_message?: string | null
          tenant_id: string
          theme?: string | null
          total_spam_blocked?: number | null
          total_submissions?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Update: {
          assign_to_user_id?: string | null
          auto_add_tags?: string[] | null
          auto_add_to_segment_id?: string | null
          auto_start_journey_id?: string | null
          button_text?: string | null
          confirmation_template_id?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_css?: string | null
          deleted_at?: string | null
          description?: string | null
          embed_code?: string | null
          enable_honeypot?: boolean | null
          enable_recaptcha?: boolean | null
          fields_json?: Json
          id?: string
          is_published?: boolean | null
          name?: string
          public_url_slug?: string | null
          recaptcha_site_key?: string | null
          redirect_url?: string | null
          require_double_opt_in?: boolean | null
          send_confirmation_email?: boolean | null
          status?: string
          success_message?: string | null
          tenant_id?: string
          theme?: string | null
          total_spam_blocked?: number | null
          total_submissions?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_forms_auto_add_to_segment_id_fkey"
            columns: ["auto_add_to_segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_forms_auto_start_journey_id_fkey"
            columns: ["auto_start_journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_forms_auto_start_journey_id_fkey"
            columns: ["auto_start_journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_forms_confirmation_template_id_fkey"
            columns: ["confirmation_template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_journey_edges: {
        Row: {
          condition_index: number | null
          created_at: string | null
          id: string
          journey_id: string
          label: string | null
          source_node_key: string
          target_node_key: string
        }
        Insert: {
          condition_index?: number | null
          created_at?: string | null
          id?: string
          journey_id: string
          label?: string | null
          source_node_key: string
          target_node_key: string
        }
        Update: {
          condition_index?: number | null
          created_at?: string | null
          id?: string
          journey_id?: string
          label?: string | null
          source_node_key?: string
          target_node_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_edges_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_edges_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_journey_goals: {
        Row: {
          created_at: string | null
          goal_config: Json | null
          goal_type: string
          id: string
          journey_id: string
          total_achieved: number | null
        }
        Insert: {
          created_at?: string | null
          goal_config?: Json | null
          goal_type: string
          id?: string
          journey_id: string
          total_achieved?: number | null
        }
        Update: {
          created_at?: string | null
          goal_config?: Json | null
          goal_type?: string
          id?: string
          journey_id?: string
          total_achieved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_goals_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_goals_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_journey_logs: {
        Row: {
          contact_id: string | null
          error_details: string | null
          id: string
          journey_id: string
          log_type: string
          message: string | null
          metadata: Json | null
          node_key: string | null
          occurred_at: string | null
          run_id: string | null
          tenant_id: string
        }
        Insert: {
          contact_id?: string | null
          error_details?: string | null
          id?: string
          journey_id: string
          log_type: string
          message?: string | null
          metadata?: Json | null
          node_key?: string | null
          occurred_at?: string | null
          run_id?: string | null
          tenant_id: string
        }
        Update: {
          contact_id?: string | null
          error_details?: string | null
          id?: string
          journey_id?: string
          log_type?: string
          message?: string | null
          metadata?: Json | null
          node_key?: string | null
          occurred_at?: string | null
          run_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "marketing_journey_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_journey_nodes: {
        Row: {
          action_type: string | null
          branch_conditions: Json | null
          config_json: Json
          created_at: string | null
          id: string
          journey_id: string
          node_key: string
          node_type: string
          position_x: number | null
          position_y: number | null
          template_id: string | null
          total_failed: number | null
          total_processed: number | null
          total_success: number | null
          wait_duration_type: string | null
          wait_duration_value: number | null
          wait_until_date: string | null
          wait_until_time: string | null
        }
        Insert: {
          action_type?: string | null
          branch_conditions?: Json | null
          config_json?: Json
          created_at?: string | null
          id?: string
          journey_id: string
          node_key: string
          node_type: string
          position_x?: number | null
          position_y?: number | null
          template_id?: string | null
          total_failed?: number | null
          total_processed?: number | null
          total_success?: number | null
          wait_duration_type?: string | null
          wait_duration_value?: number | null
          wait_until_date?: string | null
          wait_until_time?: string | null
        }
        Update: {
          action_type?: string | null
          branch_conditions?: Json | null
          config_json?: Json
          created_at?: string | null
          id?: string
          journey_id?: string
          node_key?: string
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          template_id?: string | null
          total_failed?: number | null
          total_processed?: number | null
          total_success?: number | null
          wait_duration_type?: string | null
          wait_duration_value?: number | null
          wait_until_date?: string | null
          wait_until_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_nodes_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_nodes_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_nodes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_journey_runs: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_node_key: string | null
          entered_at: string | null
          exit_reason: string | null
          exited_at: string | null
          id: string
          journey_id: string
          nodes_completed: string[] | null
          state: string
          tenant_id: string
          updated_at: string | null
          waiting_until: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_node_key?: string | null
          entered_at?: string | null
          exit_reason?: string | null
          exited_at?: string | null
          id?: string
          journey_id: string
          nodes_completed?: string[] | null
          state?: string
          tenant_id: string
          updated_at?: string | null
          waiting_until?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_node_key?: string | null
          entered_at?: string | null
          exit_reason?: string | null
          exited_at?: string | null
          id?: string
          journey_id?: string
          nodes_completed?: string[] | null
          state?: string
          tenant_id?: string
          updated_at?: string | null
          waiting_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_journey_states: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
          current_step: number
          entry_metadata: Json | null
          entry_source: string | null
          goal_completed: boolean | null
          goal_completed_at: string | null
          goal_data: Json | null
          id: string
          journey_id: string
          started_at: string
          state_data: Json | null
          status: string
          tenant_id: string
          updated_at: string | null
          wait_until: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          current_step?: number
          entry_metadata?: Json | null
          entry_source?: string | null
          goal_completed?: boolean | null
          goal_completed_at?: string | null
          goal_data?: Json | null
          id?: string
          journey_id: string
          started_at?: string
          state_data?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          wait_until?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          current_step?: number
          entry_metadata?: Json | null
          entry_source?: string | null
          goal_completed?: boolean | null
          goal_completed_at?: string | null
          goal_data?: Json | null
          id?: string
          journey_id?: string
          started_at?: string
          state_data?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          wait_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_states_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_journey_states_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_states_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_states_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_journey_step_logs: {
        Row: {
          contact_id: string
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          journey_id: string
          journey_state_id: string
          result_data: Json | null
          status: string
          step_index: number
          step_name: string | null
          step_type: string
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          journey_id: string
          journey_state_id: string
          result_data?: Json | null
          status: string
          step_index: number
          step_name?: string | null
          step_type: string
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          journey_id?: string
          journey_state_id?: string
          result_data?: Json | null
          status?: string
          step_index?: number
          step_name?: string | null
          step_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_step_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_journey_state_id_fkey"
            columns: ["journey_state_id"]
            isOneToOne: false
            referencedRelation: "marketing_journey_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_journeys: {
        Row: {
          activated_at: string | null
          activated_by_user_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          entry_trigger_config: Json | null
          entry_trigger_type: string
          exit_conditions: Json | null
          graph_json: Json
          id: string
          max_duration_days: number | null
          name: string
          status: string
          tags: string[] | null
          tenant_id: string
          total_active: number | null
          total_completed: number | null
          total_entered: number | null
          total_exited: number | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_trigger_config?: Json | null
          entry_trigger_type: string
          exit_conditions?: Json | null
          graph_json?: Json
          id?: string
          max_duration_days?: number | null
          name: string
          status?: string
          tags?: string[] | null
          tenant_id: string
          total_active?: number | null
          total_completed?: number | null
          total_entered?: number | null
          total_exited?: number | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_trigger_config?: Json | null
          entry_trigger_type?: string
          exit_conditions?: Json | null
          graph_json?: Json
          id?: string
          max_duration_days?: number | null
          name?: string
          status?: string
          tags?: string[] | null
          tenant_id?: string
          total_active?: number | null
          total_completed?: number | null
          total_entered?: number | null
          total_exited?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_landing_page_views: {
        Row: {
          converted: boolean | null
          device_type: string | null
          id: string
          ip_address: string | null
          landing_page_id: string
          location_city: string | null
          location_country: string | null
          referrer_url: string | null
          session_id: string | null
          submission_id: string | null
          tenant_id: string
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          converted?: boolean | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          landing_page_id: string
          location_city?: string | null
          location_country?: string | null
          referrer_url?: string | null
          session_id?: string | null
          submission_id?: string | null
          tenant_id: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          converted?: boolean | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          landing_page_id?: string
          location_city?: string | null
          location_country?: string | null
          referrer_url?: string | null
          session_id?: string | null
          submission_id?: string | null
          tenant_id?: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_landing_page_views_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "marketing_landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_landing_page_views_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "marketing_form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_landing_page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_landing_page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_landing_page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_landing_page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_landing_page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_landing_pages: {
        Row: {
          background_color: string | null
          body_content: string | null
          content_blocks_json: Json | null
          conversion_rate: number | null
          created_at: string | null
          created_by_user_id: string | null
          custom_css: string | null
          custom_domain: string | null
          custom_head_code: string | null
          description: string | null
          form_id: string | null
          headline: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean | null
          logo_url: string | null
          meta_keywords: string[] | null
          name: string
          og_image_url: string | null
          primary_color: string | null
          public_url_slug: string | null
          published_at: string | null
          show_form: boolean | null
          subheadline: string | null
          template: string | null
          tenant_id: string
          theme: string | null
          title: string
          total_submissions: number | null
          total_views: number | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          body_content?: string | null
          content_blocks_json?: Json | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_head_code?: string | null
          description?: string | null
          form_id?: string | null
          headline?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          meta_keywords?: string[] | null
          name: string
          og_image_url?: string | null
          primary_color?: string | null
          public_url_slug?: string | null
          published_at?: string | null
          show_form?: boolean | null
          subheadline?: string | null
          template?: string | null
          tenant_id: string
          theme?: string | null
          title: string
          total_submissions?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          body_content?: string | null
          content_blocks_json?: Json | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_head_code?: string | null
          description?: string | null
          form_id?: string | null
          headline?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          meta_keywords?: string[] | null
          name?: string
          og_image_url?: string | null
          primary_color?: string | null
          public_url_slug?: string | null
          published_at?: string | null
          show_form?: boolean | null
          subheadline?: string | null
          template?: string | null
          tenant_id?: string
          theme?: string | null
          title?: string
          total_submissions?: number | null
          total_views?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_landing_pages_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "marketing_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_saved_reports: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          date_range_end: string | null
          date_range_start: string | null
          date_range_type: string | null
          filters_json: Json | null
          id: string
          last_sent_at: string | null
          metrics: Json | null
          name: string
          report_type: string
          schedule_enabled: boolean | null
          schedule_frequency: string | null
          schedule_recipients: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          date_range_type?: string | null
          filters_json?: Json | null
          id?: string
          last_sent_at?: string | null
          metrics?: Json | null
          name: string
          report_type: string
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          date_range_type?: string | null
          filters_json?: Json | null
          id?: string
          last_sent_at?: string | null
          metrics?: Json | null
          name?: string
          report_type?: string
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_saved_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_segments: {
        Row: {
          audience_id: string | null
          contact_count: number | null
          created_at: string | null
          created_by_user_id: string | null
          definition_json: Json
          deleted_at: string | null
          description: string | null
          id: string
          is_dynamic: boolean | null
          is_saved: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          audience_id?: string | null
          contact_count?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          definition_json?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          is_saved?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          audience_id?: string | null
          contact_count?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          definition_json?: Json
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          is_saved?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_segments_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "marketing_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_sends: {
        Row: {
          bounce_reason: string | null
          bounce_type: string | null
          campaign_id: string
          click_count: number | null
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          first_click_at: string | null
          from_email: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          subject_line: string | null
          tenant_id: string
          to_email: string | null
          variant_id: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounce_type?: string | null
          campaign_id: string
          click_count?: number | null
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          first_click_at?: string | null
          from_email?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject_line?: string | null
          tenant_id: string
          to_email?: string | null
          variant_id?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounce_type?: string | null
          campaign_id?: string
          click_count?: number | null
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          first_click_at?: string | null
          from_email?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject_line?: string | null
          tenant_id?: string
          to_email?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_attribution"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketing_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_sends_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_settings: {
        Row: {
          created_at: string | null
          enable_ab_testing: boolean | null
          enable_ai_features: boolean | null
          enable_journeys: boolean | null
          enable_landing_pages: boolean | null
          enable_sms: boolean | null
          id: string
          mail_default_from_email: string | null
          mail_default_from_name: string | null
          mail_provider: string | null
          mail_provider_api_key: string | null
          mail_provider_domain: string | null
          max_sends_per_day: number | null
          max_sends_per_hour: number | null
          sms_provider: string | null
          sms_provider_api_key: string | null
          sms_provider_phone_number: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enable_ab_testing?: boolean | null
          enable_ai_features?: boolean | null
          enable_journeys?: boolean | null
          enable_landing_pages?: boolean | null
          enable_sms?: boolean | null
          id?: string
          mail_default_from_email?: string | null
          mail_default_from_name?: string | null
          mail_provider?: string | null
          mail_provider_api_key?: string | null
          mail_provider_domain?: string | null
          max_sends_per_day?: number | null
          max_sends_per_hour?: number | null
          sms_provider?: string | null
          sms_provider_api_key?: string | null
          sms_provider_phone_number?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enable_ab_testing?: boolean | null
          enable_ai_features?: boolean | null
          enable_journeys?: boolean | null
          enable_landing_pages?: boolean | null
          enable_sms?: boolean | null
          id?: string
          mail_default_from_email?: string | null
          mail_default_from_name?: string | null
          mail_provider?: string | null
          mail_provider_api_key?: string | null
          mail_provider_domain?: string | null
          max_sends_per_day?: number | null
          max_sends_per_hour?: number | null
          sms_provider?: string | null
          sms_provider_api_key?: string | null
          sms_provider_phone_number?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_suppression_list: {
        Row: {
          contact_id: string | null
          created_at: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          reason: string
          source_campaign_id: string | null
          suppressed_at: string | null
          tenant_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          reason: string
          source_campaign_id?: string | null
          suppressed_at?: string | null
          tenant_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          reason?: string
          source_campaign_id?: string | null
          suppressed_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_suppression_list_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_attribution"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_suppression_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_tags: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_template_versions: {
        Row: {
          change_notes: string | null
          changed_by_user_id: string | null
          content_html: string | null
          content_json: Json
          created_at: string | null
          id: string
          template_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          changed_by_user_id?: string | null
          content_html?: string | null
          content_json: Json
          created_at?: string | null
          id?: string
          template_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          changed_by_user_id?: string | null
          content_html?: string | null
          content_json?: Json
          created_at?: string | null
          id?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          category: string | null
          content_html: string | null
          content_json: Json | null
          content_text: string | null
          created_at: string | null
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          from_email: string | null
          from_name: string | null
          id: string
          is_public: boolean | null
          name: string
          preheader: string | null
          subject_line: string | null
          tenant_id: string
          thumbnail_url: string | null
          type: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          category?: string | null
          content_html?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          preheader?: string | null
          subject_line?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          type: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          category?: string | null
          content_html?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          preheader?: string | null
          subject_line?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_unsubscribes: {
        Row: {
          audience_id: string | null
          campaign_id: string | null
          campaign_type: string | null
          contact_id: string
          id: string
          reason: string | null
          tenant_id: string
          unsubscribe_type: string
          unsubscribed_at: string | null
        }
        Insert: {
          audience_id?: string | null
          campaign_id?: string | null
          campaign_type?: string | null
          contact_id: string
          id?: string
          reason?: string | null
          tenant_id: string
          unsubscribe_type: string
          unsubscribed_at?: string | null
        }
        Update: {
          audience_id?: string | null
          campaign_id?: string | null
          campaign_type?: string | null
          contact_id?: string
          id?: string
          reason?: string | null
          tenant_id?: string
          unsubscribe_type?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_unsubscribes_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "marketing_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_attribution"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_unsubscribes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_webhooks: {
        Row: {
          created_at: string | null
          endpoint_url: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          secret_key: string | null
          tenant_id: string
          total_calls: number | null
          total_failures: number | null
          trigger_events: string[] | null
        }
        Insert: {
          created_at?: string | null
          endpoint_url: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          secret_key?: string | null
          tenant_id: string
          total_calls?: number | null
          total_failures?: number | null
          trigger_events?: string[] | null
        }
        Update: {
          created_at?: string | null
          endpoint_url?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          secret_key?: string | null
          tenant_id?: string
          total_calls?: number | null
          total_failures?: number | null
          trigger_events?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      membership_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          membership_id: string
          role_override: string | null
          scope: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          membership_id: string
          role_override?: string | null
          scope?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          membership_id?: string
          role_override?: string | null
          scope?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_locations_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "user_tenant_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      message_media: {
        Row: {
          activity_id: string
          attribution_touchpoint_id: string
          byte_size: number
          contact_id: string
          content_type: string
          created_at: string
          expires_at: string | null
          external_message_id: string
          id: string
          media_index: number
          original_url: string | null
          storage_bucket: string
          storage_path: string
          tenant_id: string
        }
        Insert: {
          activity_id: string
          attribution_touchpoint_id: string
          byte_size: number
          contact_id: string
          content_type: string
          created_at?: string
          expires_at?: string | null
          external_message_id: string
          id?: string
          media_index: number
          original_url?: string | null
          storage_bucket?: string
          storage_path: string
          tenant_id: string
        }
        Update: {
          activity_id?: string
          attribution_touchpoint_id?: string
          byte_size?: number
          contact_id?: string
          content_type?: string
          created_at?: string
          expires_at?: string | null
          external_message_id?: string
          id?: string
          media_index?: number
          original_url?: string | null
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_media_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_attribution_touchpoint_id_fkey"
            columns: ["attribution_touchpoint_id"]
            isOneToOne: false
            referencedRelation: "attribution_touchpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "message_media_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "message_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "message_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "message_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          channel: string
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          external_id: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          notification_id: string
          opened_at: string | null
          provider: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notification_id: string
          opened_at?: string | null
          provider?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status: string
        }
        Update: {
          channel?: string
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notification_id?: string
          opened_at?: string | null
          provider?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_policies: {
        Row: {
          allow_notification_export: boolean | null
          created_at: string | null
          escalation_rules: Json | null
          id: string
          rate_limits: Json | null
          require_email_opt_in: boolean | null
          require_sms_opt_in: boolean | null
          retention_days: number | null
          role_defaults: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_notification_export?: boolean | null
          created_at?: string | null
          escalation_rules?: Json | null
          id?: string
          rate_limits?: Json | null
          require_email_opt_in?: boolean | null
          require_sms_opt_in?: boolean | null
          retention_days?: number | null
          role_defaults?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_notification_export?: boolean | null
          created_at?: string | null
          escalation_rules?: Json | null
          id?: string
          rate_limits?: Json | null
          require_email_opt_in?: boolean | null
          require_sms_opt_in?: boolean | null
          retention_days?: number | null
          role_defaults?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          digest_preferences: Json | null
          email_consent_ip: string | null
          email_consented_at: string | null
          email_enabled: boolean | null
          event_preferences: Json | null
          id: string
          in_app_enabled: boolean | null
          muted_objects: Json | null
          push_enabled: boolean | null
          quiet_hours: Json | null
          sms_consent_ip: string | null
          sms_consented_at: string | null
          sms_enabled: boolean | null
          snoozed_until: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digest_preferences?: Json | null
          email_consent_ip?: string | null
          email_consented_at?: string | null
          email_enabled?: boolean | null
          event_preferences?: Json | null
          id?: string
          in_app_enabled?: boolean | null
          muted_objects?: Json | null
          push_enabled?: boolean | null
          quiet_hours?: Json | null
          sms_consent_ip?: string | null
          sms_consented_at?: string | null
          sms_enabled?: boolean | null
          snoozed_until?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digest_preferences?: Json | null
          email_consent_ip?: string | null
          email_consented_at?: string | null
          email_enabled?: boolean | null
          event_preferences?: Json | null
          id?: string
          in_app_enabled?: boolean | null
          muted_objects?: Json | null
          push_enabled?: boolean | null
          quiet_hours?: Json | null
          sms_consent_ip?: string | null
          sms_consented_at?: string | null
          sms_enabled?: boolean | null
          snoozed_until?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          body: string | null
          created_at: string | null
          deleted_at: string | null
          entity_id: string | null
          entity_type: string | null
          entity_url: string | null
          event_id: string | null
          event_key: string
          expires_at: string | null
          group_key: string | null
          id: string
          location_id: string | null
          metadata: Json | null
          module: string | null
          parent_id: string | null
          priority: string
          quick_actions: Json | null
          read_at: string | null
          severity: string
          snoozed_until: string | null
          tenant_id: string
          title: string
          triggered_by_user_id: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          entity_url?: string | null
          event_id?: string | null
          event_key: string
          expires_at?: string | null
          group_key?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          module?: string | null
          parent_id?: string | null
          priority: string
          quick_actions?: Json | null
          read_at?: string | null
          severity: string
          snoozed_until?: string | null
          tenant_id: string
          title: string
          triggered_by_user_id?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          entity_url?: string | null
          event_id?: string | null
          event_key?: string
          expires_at?: string | null
          group_key?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          module?: string | null
          parent_id?: string | null
          priority?: string
          quick_actions?: Json | null
          read_at?: string | null
          severity?: string
          snoozed_until?: string | null
          tenant_id?: string
          title?: string
          triggered_by_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      onboarding_field_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          field_name: string
          help_text: string | null
          id: string
          is_required: boolean | null
          step_id: string
          tenant_id: string | null
          updated_at: string | null
          updated_by: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          field_name: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          step_id: string
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          field_name?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          step_id?: string
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_field_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_field_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_field_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_field_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_field_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          field_data: Json | null
          id: string
          is_required: boolean | null
          skipped: boolean | null
          skipped_at: string | null
          step_name: string
          tenant_id: string
          user_id: string
          validation_errors: Json | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          field_data?: Json | null
          id?: string
          is_required?: boolean | null
          skipped?: boolean | null
          skipped_at?: string | null
          step_name: string
          tenant_id: string
          user_id: string
          validation_errors?: Json | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          field_data?: Json | null
          id?: string
          is_required?: boolean | null
          skipped?: boolean | null
          skipped_at?: string | null
          step_name?: string
          tenant_id?: string
          user_id?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      onboarding_step_definitions: {
        Row: {
          account_types: string[]
          category: string
          created_at: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_skippable: boolean | null
          name: string
        }
        Insert: {
          account_types?: string[]
          category: string
          created_at?: string | null
          description?: string | null
          display_order: number
          icon?: string | null
          id: string
          is_skippable?: boolean | null
          name: string
        }
        Update: {
          account_types?: string[]
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_skippable?: boolean | null
          name?: string
        }
        Relationships: []
      }
      org_access_log: {
        Row: {
          access_type: string
          created_at: string | null
          failure_reason: string | null
          from_org_id: string | null
          id: number
          ip_address: string | null
          success: boolean | null
          to_org_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          created_at?: string | null
          failure_reason?: string | null
          from_org_id?: string | null
          id?: number
          ip_address?: string | null
          success?: boolean | null
          to_org_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string | null
          failure_reason?: string | null
          from_org_id?: string | null
          id?: number
          ip_address?: string | null
          success?: boolean | null
          to_org_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_access_log_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_access_log_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_access_log_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_access_log_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by_user_id: string | null
          last_accessed_at: string | null
          location_ids: string[] | null
          metadata: Json | null
          role: string
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          last_accessed_at?: string | null
          location_ids?: string[] | null
          metadata?: Json | null
          role: string
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          last_accessed_at?: string | null
          location_ids?: string[] | null
          metadata?: Json | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      org_validation_events: {
        Row: {
          created_at: string | null
          event_type: Database["public"]["Enums"]["org_validation_event_type"]
          id: string
          metadata: Json | null
          new_status:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          old_status:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          tenant_id: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["org_validation_event_type"]
          id?: string
          metadata?: Json | null
          new_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          old_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          tenant_id: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["org_validation_event_type"]
          id?: string
          metadata?: Json | null
          new_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          old_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          tenant_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_validation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_validation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_validation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "org_validation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_validation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      organization_join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          id: string
          message: string | null
          rejection_reason: string | null
          requested_role: string | null
          requester_email: string
          requester_name: string | null
          requester_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          requester_email: string
          requester_name?: string | null
          requester_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          requester_email?: string
          requester_name?: string | null
          requester_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "organization_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "organization_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "organization_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          card_brand: string | null
          card_last_four: string | null
          check_number: string | null
          contact_id: string
          created_at: string | null
          eob_number: string | null
          id: string
          insurance_claim_id: string | null
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_status: string
          processed_by_user_id: string | null
          processor: string | null
          receipt_sent_at: string | null
          refund_amount_cents: number | null
          refund_reason: string | null
          refunded_at: string | null
          tenant_id: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          card_brand?: string | null
          card_last_four?: string | null
          check_number?: string | null
          contact_id: string
          created_at?: string | null
          eob_number?: string | null
          id?: string
          insurance_claim_id?: string | null
          invoice_id?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_status?: string
          processed_by_user_id?: string | null
          processor?: string | null
          receipt_sent_at?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          card_brand?: string | null
          card_last_four?: string | null
          check_number?: string | null
          contact_id?: string
          created_at?: string | null
          eob_number?: string | null
          id?: string
          insurance_claim_id?: string | null
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_status?: string
          processed_by_user_id?: string | null
          processor?: string | null
          receipt_sent_at?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "payments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          assigned_role: string
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          invited_by: string
          invited_email: string
          metadata: Json | null
          personal_message: string | null
          status: Database["public"]["Enums"]["invite_status"] | null
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_role: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          invited_by: string
          invited_email: string
          metadata?: Json | null
          personal_message?: string | null
          status?: Database["public"]["Enums"]["invite_status"] | null
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_role?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invited_by?: string
          invited_email?: string
          metadata?: Json | null
          personal_message?: string | null
          status?: Database["public"]["Enums"]["invite_status"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pending_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pending_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pending_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      permission_changes_log: {
        Row: {
          change_type: string
          changed_by_user_id: string
          created_at: string | null
          id: number
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          permission_code: string | null
          reason: string | null
          target_role_id: string | null
          target_user_id: string | null
          tenant_id: string
        }
        Insert: {
          change_type: string
          changed_by_user_id: string
          created_at?: string | null
          id?: number
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          permission_code?: string | null
          reason?: string | null
          target_role_id?: string | null
          target_user_id?: string | null
          tenant_id: string
        }
        Update: {
          change_type?: string
          changed_by_user_id?: string
          created_at?: string | null
          id?: number
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          permission_code?: string | null
          reason?: string | null
          target_role_id?: string | null
          target_user_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_changes_log_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_changes_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_changes_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_changes_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_changes_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_changes_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      permission_definitions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          key: string
          label: string
          requires_ownership: boolean | null
          subcategory: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          key: string
          label: string
          requires_ownership?: boolean | null
          subcategory?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          key?: string
          label?: string
          requires_ownership?: boolean | null
          subcategory?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_dangerous: boolean | null
          module: string
          name: string
          requires_approval: boolean | null
          resource_type: string | null
        }
        Insert: {
          action: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_dangerous?: boolean | null
          module: string
          name: string
          requires_approval?: boolean | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_dangerous?: boolean | null
          module?: string
          name?: string
          requires_approval?: boolean | null
          resource_type?: string | null
        }
        Relationships: []
      }
      pipeline_settings: {
        Row: {
          auto_assignment_enabled: boolean | null
          auto_assignment_rules: Json | null
          color: string | null
          created_at: string | null
          duplicate_prevention: boolean | null
          email_templates_per_stage: Json | null
          enforce_stage_order: boolean | null
          icon: string | null
          id: string
          notify_on_stage_change: boolean | null
          notify_on_stuck_deal: boolean | null
          pipeline_id: string
          require_treatment_tags: boolean | null
          required_fields_per_stage: Json | null
          stage_time_limits: Json | null
          stuck_deal_threshold_days: number | null
          tenant_id: string
          updated_at: string | null
          value_max_threshold_cents: number | null
          value_min_threshold_cents: number | null
          visibility: string | null
          visible_to_role_ids: string[] | null
          webhook_events: string[] | null
          webhook_url: string | null
        }
        Insert: {
          auto_assignment_enabled?: boolean | null
          auto_assignment_rules?: Json | null
          color?: string | null
          created_at?: string | null
          duplicate_prevention?: boolean | null
          email_templates_per_stage?: Json | null
          enforce_stage_order?: boolean | null
          icon?: string | null
          id?: string
          notify_on_stage_change?: boolean | null
          notify_on_stuck_deal?: boolean | null
          pipeline_id: string
          require_treatment_tags?: boolean | null
          required_fields_per_stage?: Json | null
          stage_time_limits?: Json | null
          stuck_deal_threshold_days?: number | null
          tenant_id: string
          updated_at?: string | null
          value_max_threshold_cents?: number | null
          value_min_threshold_cents?: number | null
          visibility?: string | null
          visible_to_role_ids?: string[] | null
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Update: {
          auto_assignment_enabled?: boolean | null
          auto_assignment_rules?: Json | null
          color?: string | null
          created_at?: string | null
          duplicate_prevention?: boolean | null
          email_templates_per_stage?: Json | null
          enforce_stage_order?: boolean | null
          icon?: string | null
          id?: string
          notify_on_stage_change?: boolean | null
          notify_on_stuck_deal?: boolean | null
          pipeline_id?: string
          require_treatment_tags?: boolean | null
          required_fields_per_stage?: Json | null
          stage_time_limits?: Json | null
          stuck_deal_threshold_days?: number | null
          tenant_id?: string
          updated_at?: string | null
          value_max_threshold_cents?: number | null
          value_min_threshold_cents?: number | null
          visibility?: string | null
          visible_to_role_ids?: string[] | null
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_settings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "pipeline_settings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          position: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          position: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          position?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pipelines: {
        Row: {
          active: boolean | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          location_id: string | null
          name: string
          owner_user_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_id?: string | null
          name: string
          owner_user_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_id?: string | null
          name?: string
          owner_user_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pipelines_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      plan_entitlements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          created_at: string
          default_seat_limit: number
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean
          is_featured: boolean
          max_seat_limit: number | null
          name: string
          price_amount: number | null
          price_currency: string
          settings: Json
          stripe_price_id: string | null
          stripe_product_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          billing_interval: string
          created_at?: string
          default_seat_limit: number
          description?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_seat_limit?: number | null
          name: string
          price_amount?: number | null
          price_currency?: string
          settings?: Json
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          default_seat_limit?: number
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_seat_limit?: number | null
          name?: string
          price_amount?: number | null
          price_currency?: string
          settings?: Json
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      pms_integrations: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          api_secret: string | null
          auto_close_deals: boolean | null
          auto_create_deals: boolean | null
          connection_status: string | null
          created_at: string | null
          excluded_procedure_codes: string[] | null
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          min_deal_value_cents: number | null
          provider: string
          provider_name: string
          settings: Json | null
          sync_appointments: boolean | null
          sync_patient_demographics: boolean | null
          sync_payment_data: boolean | null
          tenant_id: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_close_deals?: boolean | null
          auto_create_deals?: boolean | null
          connection_status?: string | null
          created_at?: string | null
          excluded_procedure_codes?: string[] | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          min_deal_value_cents?: number | null
          provider: string
          provider_name: string
          settings?: Json | null
          sync_appointments?: boolean | null
          sync_patient_demographics?: boolean | null
          sync_payment_data?: boolean | null
          tenant_id: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          api_secret?: string | null
          auto_close_deals?: boolean | null
          auto_create_deals?: boolean | null
          connection_status?: string | null
          created_at?: string | null
          excluded_procedure_codes?: string[] | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          min_deal_value_cents?: number | null
          provider?: string
          provider_name?: string
          settings?: Json | null
          sync_appointments?: boolean | null
          sync_patient_demographics?: boolean | null
          sync_payment_data?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pms_patient_mappings: {
        Row: {
          conflict_reason: string | null
          created_at: string | null
          crm_contact_id: string
          crm_data_snapshot: Json | null
          first_synced_at: string | null
          id: string
          integration_id: string
          last_synced_at: string | null
          pms_data_snapshot: Json | null
          pms_patient_id: string
          pms_provider: string
          sync_status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          conflict_reason?: string | null
          created_at?: string | null
          crm_contact_id: string
          crm_data_snapshot?: Json | null
          first_synced_at?: string | null
          id?: string
          integration_id: string
          last_synced_at?: string | null
          pms_data_snapshot?: Json | null
          pms_patient_id: string
          pms_provider: string
          sync_status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          conflict_reason?: string | null
          created_at?: string | null
          crm_contact_id?: string
          crm_data_snapshot?: Json | null
          first_synced_at?: string | null
          id?: string
          integration_id?: string
          last_synced_at?: string | null
          pms_data_snapshot?: Json | null
          pms_patient_id?: string
          pms_provider?: string
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pms_patient_mappings_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "pms_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_patient_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pms_procedure_tag_mappings: {
        Row: {
          applies_to_all_locations: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          mapping_priority: number | null
          procedure_category: string | null
          procedure_code: string
          procedure_name: string | null
          tenant_id: string
          treatment_tag_id: string | null
          treatment_tag_name: string
          updated_at: string | null
        }
        Insert: {
          applies_to_all_locations?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          mapping_priority?: number | null
          procedure_category?: string | null
          procedure_code: string
          procedure_name?: string | null
          tenant_id: string
          treatment_tag_id?: string | null
          treatment_tag_name: string
          updated_at?: string | null
        }
        Update: {
          applies_to_all_locations?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          mapping_priority?: number | null
          procedure_category?: string | null
          procedure_code?: string
          procedure_name?: string | null
          tenant_id?: string
          treatment_tag_id?: string | null
          treatment_tag_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pms_procedure_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_procedure_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_procedure_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_procedure_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_procedure_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_procedure_tag_mappings_treatment_tag_id_fkey"
            columns: ["treatment_tag_id"]
            isOneToOne: false
            referencedRelation: "treatment_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      pms_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          direction: string
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          integration_id: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          sync_type: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          direction: string
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status: string
          sync_type: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          direction?: string
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pms_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "pms_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      practice_booking_widgets: {
        Row: {
          brand_font_family: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_text_color: string | null
          calendar_button_label: string
          calendar_capture_email: boolean
          calendar_capture_full_name: boolean
          calendar_capture_phone: boolean
          calendar_consent_text: string | null
          calendar_consent_text_version: string | null
          calendar_interstitial_duration_ms: number
          calendar_interstitial_message: string | null
          calendar_pms_kind: string | null
          calendar_redirect_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          display_subtitle: string | null
          embed_script_secret: string
          enable_calendar: boolean
          enable_webform: boolean
          enable_whatsapp: boolean
          greeting_subtitle: string | null
          greeting_title: string | null
          id: string
          is_active: boolean
          metadata: Json
          practice_location_id: string | null
          slug: string
          success_message: string | null
          tenant_id: string
          treatment_options: Json
          updated_at: string
          webform_button_label: string
          webform_crm_form_id: string | null
          webform_kind: string
          webform_open_in_new_tab: boolean
          webform_redirect_url: string | null
          whatsapp_button_label: string
          whatsapp_phone_e164: string | null
          whatsapp_prefilled_message_template: string | null
        }
        Insert: {
          brand_font_family?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_text_color?: string | null
          calendar_button_label?: string
          calendar_capture_email?: boolean
          calendar_capture_full_name?: boolean
          calendar_capture_phone?: boolean
          calendar_consent_text?: string | null
          calendar_consent_text_version?: string | null
          calendar_interstitial_duration_ms?: number
          calendar_interstitial_message?: string | null
          calendar_pms_kind?: string | null
          calendar_redirect_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          display_subtitle?: string | null
          embed_script_secret?: string
          enable_calendar?: boolean
          enable_webform?: boolean
          enable_whatsapp?: boolean
          greeting_subtitle?: string | null
          greeting_title?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          practice_location_id?: string | null
          slug: string
          success_message?: string | null
          tenant_id: string
          treatment_options?: Json
          updated_at?: string
          webform_button_label?: string
          webform_crm_form_id?: string | null
          webform_kind?: string
          webform_open_in_new_tab?: boolean
          webform_redirect_url?: string | null
          whatsapp_button_label?: string
          whatsapp_phone_e164?: string | null
          whatsapp_prefilled_message_template?: string | null
        }
        Update: {
          brand_font_family?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_text_color?: string | null
          calendar_button_label?: string
          calendar_capture_email?: boolean
          calendar_capture_full_name?: boolean
          calendar_capture_phone?: boolean
          calendar_consent_text?: string | null
          calendar_consent_text_version?: string | null
          calendar_interstitial_duration_ms?: number
          calendar_interstitial_message?: string | null
          calendar_pms_kind?: string | null
          calendar_redirect_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          display_subtitle?: string | null
          embed_script_secret?: string
          enable_calendar?: boolean
          enable_webform?: boolean
          enable_whatsapp?: boolean
          greeting_subtitle?: string | null
          greeting_title?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          practice_location_id?: string | null
          slug?: string
          success_message?: string | null
          tenant_id?: string
          treatment_options?: Json
          updated_at?: string
          webform_button_label?: string
          webform_crm_form_id?: string | null
          webform_kind?: string
          webform_open_in_new_tab?: boolean
          webform_redirect_url?: string | null
          whatsapp_button_label?: string
          whatsapp_phone_e164?: string | null
          whatsapp_prefilled_message_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_booking_widgets_practice_location_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_booking_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_booking_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_booking_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_booking_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_booking_widgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      practice_branding: {
        Row: {
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          practice_id: string
          primary_color: string
          secondary_color: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          logo_url?: string | null
          practice_id: string
          primary_color?: string
          secondary_color?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          practice_id?: string
          primary_color?: string
          secondary_color?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_branding_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: true
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_domains: {
        Row: {
          created_at: string
          domain: string
          domain_kind: string
          id: string
          is_primary: boolean
          is_verified: boolean
          metadata: Json
          practice_booking_widget_id: string | null
          practice_location_id: string | null
          ssl_status: string
          tenant_id: string
          updated_at: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          domain_kind?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          metadata?: Json
          practice_booking_widget_id?: string | null
          practice_location_id?: string | null
          ssl_status?: string
          tenant_id: string
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          domain_kind?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          metadata?: Json
          practice_booking_widget_id?: string | null
          practice_location_id?: string | null
          ssl_status?: string
          tenant_id?: string
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_domains_practice_location_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_domains_widget_fkey"
            columns: ["practice_booking_widget_id"]
            isOneToOne: false
            referencedRelation: "practice_booking_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_hours: Json | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          slug: string | null
          state: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_hours?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_hours?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      practice_notification_routing: {
        Row: {
          additional_user_ids: string[]
          created_at: string
          event_key: string
          id: string
          is_active: boolean
          pipeline_id: string | null
          primary_user_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          additional_user_ids?: string[]
          created_at?: string
          event_key: string
          id?: string
          is_active?: boolean
          pipeline_id?: string | null
          primary_user_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          additional_user_ids?: string[]
          created_at?: string
          event_key?: string
          id?: string
          is_active?: boolean
          pipeline_id?: string | null
          primary_user_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_notification_routing_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "practice_notification_routing_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_notification_routing_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_notification_routing_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practice_notification_routing_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practice_notification_routing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_notification_routing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_notification_routing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_notification_routing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_notification_routing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      practice_treatment_offerings: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          custom_label: string | null
          custom_lead_value_cents_max: number | null
          custom_lead_value_cents_min: number | null
          custom_sla_minutes: number | null
          deleted_at: string | null
          id: string
          is_active: boolean
          location_id: string | null
          pipeline_id: string
          sort_order: number
          stage_id: string | null
          tenant_id: string
          treatment_type_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          custom_label?: string | null
          custom_lead_value_cents_max?: number | null
          custom_lead_value_cents_min?: number | null
          custom_sla_minutes?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          pipeline_id: string
          sort_order?: number
          stage_id?: string | null
          tenant_id: string
          treatment_type_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          custom_label?: string | null
          custom_lead_value_cents_max?: number | null
          custom_lead_value_cents_min?: number | null
          custom_sla_minutes?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          pipeline_id?: string
          sort_order?: number
          stage_id?: string | null
          tenant_id?: string
          treatment_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_treatment_offerings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "practice_treatment_offerings_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          anonymize_after_days: number | null
          auto_approve_deletions: boolean | null
          auto_approve_exports: boolean | null
          auto_delete_unsubscribed_after_days: number | null
          breach_notification_email: string | null
          breach_notification_required_within_hours: number | null
          ccpa_enabled: boolean | null
          data_processor_name: string | null
          data_protection_officer_email: string | null
          data_protection_officer_phone: string | null
          delete_unverified_contacts_after_days: number | null
          deletion_requires_2fa: boolean | null
          double_opt_in_email: boolean | null
          double_opt_in_sms: boolean | null
          gdpr_enabled: boolean | null
          hipaa_enabled: boolean | null
          id: string
          require_explicit_consent: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          anonymize_after_days?: number | null
          auto_approve_deletions?: boolean | null
          auto_approve_exports?: boolean | null
          auto_delete_unsubscribed_after_days?: number | null
          breach_notification_email?: string | null
          breach_notification_required_within_hours?: number | null
          ccpa_enabled?: boolean | null
          data_processor_name?: string | null
          data_protection_officer_email?: string | null
          data_protection_officer_phone?: string | null
          delete_unverified_contacts_after_days?: number | null
          deletion_requires_2fa?: boolean | null
          double_opt_in_email?: boolean | null
          double_opt_in_sms?: boolean | null
          gdpr_enabled?: boolean | null
          hipaa_enabled?: boolean | null
          id?: string
          require_explicit_consent?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          anonymize_after_days?: number | null
          auto_approve_deletions?: boolean | null
          auto_approve_exports?: boolean | null
          auto_delete_unsubscribed_after_days?: number | null
          breach_notification_email?: string | null
          breach_notification_required_within_hours?: number | null
          ccpa_enabled?: boolean | null
          data_processor_name?: string | null
          data_protection_officer_email?: string | null
          data_protection_officer_phone?: string | null
          delete_unverified_contacts_after_days?: number | null
          deletion_requires_2fa?: boolean | null
          double_opt_in_email?: boolean | null
          double_opt_in_sms?: boolean | null
          gdpr_enabled?: boolean | null
          hipaa_enabled?: boolean | null
          id?: string
          require_explicit_consent?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "privacy_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "privacy_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "privacy_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      procedures: {
        Row: {
          category: string | null
          code: string
          code_system: string | null
          created_at: string | null
          default_fee_cents: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          typical_coverage_level: string | null
          typical_duration: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          code_system?: string | null
          created_at?: string | null
          default_fee_cents?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          typical_coverage_level?: string | null
          typical_duration?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          code_system?: string | null
          created_at?: string | null
          default_fee_cents?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          typical_coverage_level?: string | null
          typical_duration?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      provider_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          effective_from: string | null
          effective_to: string | null
          end_time: string
          id: string
          is_active: boolean | null
          location_id: string | null
          provider_id: string
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_to?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          provider_id: string
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          provider_id?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_schedules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "provider_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "provider_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "provider_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      providers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          buffer_time: number | null
          can_schedule: boolean | null
          certifications: string[] | null
          created_at: string | null
          default_appointment_duration: number | null
          education: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          license_number: string | null
          npi_number: string | null
          phone: string | null
          specialty: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          buffer_time?: number | null
          can_schedule?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          default_appointment_duration?: number | null
          education?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          npi_number?: string | null
          phone?: string | null
          specialty?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          buffer_time?: number | null
          can_schedule?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          default_appointment_duration?: number | null
          education?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          npi_number?: string | null
          phone?: string | null
          specialty?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      queue_alert_rules: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          enabled: boolean
          id: string
          label: string
          max_delayed_jobs: number | null
          max_failed_jobs: number | null
          max_oldest_job_seconds: number | null
          max_waiting_jobs: number | null
          metadata: Json
          notify_via: string[]
          queue_name: string
          tenant_id: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          enabled?: boolean
          id?: string
          label: string
          max_delayed_jobs?: number | null
          max_failed_jobs?: number | null
          max_oldest_job_seconds?: number | null
          max_waiting_jobs?: number | null
          metadata?: Json
          notify_via?: string[]
          queue_name: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          enabled?: boolean
          id?: string
          label?: string
          max_delayed_jobs?: number | null
          max_failed_jobs?: number | null
          max_oldest_job_seconds?: number | null
          max_waiting_jobs?: number | null
          metadata?: Json
          notify_via?: string[]
          queue_name?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_alert_rules_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_alert_rules_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_alert_rules_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_alert_rules_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      queue_health_incidents: {
        Row: {
          acknowledged_by_user_id: string | null
          created_at: string
          detected_at: string
          id: string
          incident_type: string
          metrics: Json
          queue_name: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          rule_id: string | null
          severity: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_by_user_id?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          incident_type: string
          metrics?: Json
          queue_name: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          rule_id?: string | null
          severity: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_by_user_id?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          incident_type?: string
          metrics?: Json
          queue_name?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_health_incidents_acknowledged_by_user_id_fkey"
            columns: ["acknowledged_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_health_incidents_acknowledged_by_user_id_fkey"
            columns: ["acknowledged_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_acknowledged_by_user_id_fkey"
            columns: ["acknowledged_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_health_incidents_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "queue_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_health_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "queue_health_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_health_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      rate_limit_plans: {
        Row: {
          allows_exports: boolean | null
          allows_webhooks: boolean | null
          burst_allowance: number | null
          created_at: string | null
          description: string | null
          id: string
          max_bulk_operations: number | null
          monthly_price_cents: number | null
          name: string
          requests_per_day: number
          requests_per_hour: number
          requests_per_month: number
          updated_at: string | null
        }
        Insert: {
          allows_exports?: boolean | null
          allows_webhooks?: boolean | null
          burst_allowance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_bulk_operations?: number | null
          monthly_price_cents?: number | null
          name: string
          requests_per_day?: number
          requests_per_hour?: number
          requests_per_month?: number
          updated_at?: string | null
        }
        Update: {
          allows_exports?: boolean | null
          allows_webhooks?: boolean | null
          burst_allowance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_bulk_operations?: number | null
          monthly_price_cents?: number | null
          name?: string
          requests_per_day?: number
          requests_per_hour?: number
          requests_per_month?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_task_rules: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          days_of_week: number[] | null
          end_date: string | null
          frequency: string
          id: string
          interval: number | null
          max_occurrences: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          days_of_week?: number[] | null
          end_date?: string | null
          frequency: string
          id?: string
          interval?: number | null
          max_occurrences?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          days_of_week?: number[] | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval?: number | null
          max_occurrences?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_task_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "recurring_task_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "recurring_task_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "recurring_task_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      restore_requests: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          backup_id: string
          completed_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          point_in_time: string | null
          progress_pct: number | null
          records_restored: Json | null
          requested_by_user_id: string
          requires_approval: boolean | null
          restore_to_new_tenant: boolean | null
          restore_type: string
          started_at: string | null
          status: string
          target_tables: string[] | null
          target_tenant_id: string | null
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          backup_id: string
          completed_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          point_in_time?: string | null
          progress_pct?: number | null
          records_restored?: Json | null
          requested_by_user_id: string
          requires_approval?: boolean | null
          restore_to_new_tenant?: boolean | null
          restore_type: string
          started_at?: string | null
          status: string
          target_tables?: string[] | null
          target_tenant_id?: string | null
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          backup_id?: string
          completed_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          point_in_time?: string | null
          progress_pct?: number | null
          records_restored?: Json | null
          requested_by_user_id?: string
          requires_approval?: boolean | null
          restore_to_new_tenant?: boolean | null
          restore_type?: string
          started_at?: string | null
          status?: string
          target_tables?: string[] | null
          target_tenant_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restore_requests_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backup_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_requests_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_requests_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      revenue_forecast_snapshots: {
        Row: {
          accuracy_percentage: number | null
          actual_revenue_cents: number | null
          assumptions: Json | null
          confidence_level: number | null
          created_at: string | null
          forecast_created_at: string
          id: string
          open_pipeline_value_cents: number | null
          predicted_revenue_cents: number
          prediction_method: string | null
          target_month: string
          tenant_id: string
          updated_at: string | null
          weighted_pipeline_value_cents: number | null
        }
        Insert: {
          accuracy_percentage?: number | null
          actual_revenue_cents?: number | null
          assumptions?: Json | null
          confidence_level?: number | null
          created_at?: string | null
          forecast_created_at?: string
          id?: string
          open_pipeline_value_cents?: number | null
          predicted_revenue_cents: number
          prediction_method?: string | null
          target_month: string
          tenant_id: string
          updated_at?: string | null
          weighted_pipeline_value_cents?: number | null
        }
        Update: {
          accuracy_percentage?: number | null
          actual_revenue_cents?: number | null
          assumptions?: Json | null
          confidence_level?: number | null
          created_at?: string | null
          forecast_created_at?: string
          id?: string
          open_pipeline_value_cents?: number | null
          predicted_revenue_cents?: number
          prediction_method?: string | null
          target_month?: string
          tenant_id?: string
          updated_at?: string | null
          weighted_pipeline_value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_forecast_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "revenue_forecast_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "revenue_forecast_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "revenue_forecast_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_forecast_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      role_definitions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          hierarchy_level: number
          id: string
          is_custom_role: boolean | null
          is_system_role: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          hierarchy_level: number
          id?: string
          is_custom_role?: boolean | null
          is_system_role?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_custom_role?: boolean | null
          is_system_role?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted: boolean | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_script_outcomes: {
        Row: {
          created_at: string | null
          id: string
          sales_script_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          sales_script_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          sales_script_id?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      sales_script_usages: {
        Row: {
          created_at: string | null
          id: string
          outcome: string | null
          sales_script_version_id: string | null
          success: boolean | null
          tenant_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outcome?: string | null
          sales_script_version_id?: string | null
          success?: boolean | null
          tenant_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outcome?: string | null
          sales_script_version_id?: string | null
          success?: boolean | null
          tenant_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sales_script_versions: {
        Row: {
          content: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          last_outcome_at: string | null
          metadata: Json | null
          outcome_count: number
          positive_outcome_count: number
          published_at: string | null
          sales_script_id: string | null
          tenant_id: string | null
          title: string | null
          total_revenue_cents: number
          variables: Json | null
          version: number | null
          version_number: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          last_outcome_at?: string | null
          metadata?: Json | null
          outcome_count?: number
          positive_outcome_count?: number
          published_at?: string | null
          sales_script_id?: string | null
          tenant_id?: string | null
          title?: string | null
          total_revenue_cents?: number
          variables?: Json | null
          version?: number | null
          version_number?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          last_outcome_at?: string | null
          metadata?: Json | null
          outcome_count?: number
          positive_outcome_count?: number
          published_at?: string | null
          sales_script_id?: string | null
          tenant_id?: string | null
          title?: string | null
          total_revenue_cents?: number
          variables?: Json | null
          version?: number | null
          version_number?: number | null
        }
        Relationships: []
      }
      sales_scripts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          name: string | null
          tenant_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      saved_contact_views: {
        Row: {
          created_at: string | null
          description: string | null
          filters: Json | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          is_shared: boolean | null
          name: string
          sort_field: string | null
          sort_order: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          visible_columns: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          is_shared?: boolean | null
          name: string
          sort_field?: string | null
          sort_order?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          visible_columns?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          is_shared?: boolean | null
          name?: string
          sort_field?: string | null
          sort_order?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          visible_columns?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_contact_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_contact_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_contact_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_contact_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_contact_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      saved_deal_views: {
        Row: {
          created_at: string | null
          description: string | null
          filters: Json | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          is_shared: boolean | null
          name: string
          sort_field: string | null
          sort_order: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          visible_columns: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          is_shared?: boolean | null
          name: string
          sort_field?: string | null
          sort_order?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          visible_columns?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          is_shared?: boolean | null
          name?: string
          sort_field?: string | null
          sort_order?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          visible_columns?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_deal_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_deal_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_deal_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "saved_deal_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_deal_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      security_breaches: {
        Row: {
          affected_data_types: string[] | null
          affected_record_count: number | null
          breach_description: string
          breach_type: string
          containment_actions: string | null
          created_at: string | null
          detected_at: string
          detected_by: string | null
          id: string
          notification_method: string | null
          notification_sent_at: string | null
          regulatory_body: string | null
          regulatory_reported_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          tenant_id: string
        }
        Insert: {
          affected_data_types?: string[] | null
          affected_record_count?: number | null
          breach_description: string
          breach_type: string
          containment_actions?: string | null
          created_at?: string | null
          detected_at?: string
          detected_by?: string | null
          id?: string
          notification_method?: string | null
          notification_sent_at?: string | null
          regulatory_body?: string | null
          regulatory_reported_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          tenant_id: string
        }
        Update: {
          affected_data_types?: string[] | null
          affected_record_count?: number | null
          breach_description?: string
          breach_type?: string
          containment_actions?: string | null
          created_at?: string | null
          detected_at?: string
          detected_by?: string | null
          id?: string
          notification_method?: string | null
          notification_sent_at?: string | null
          regulatory_body?: string | null
          regulatory_reported_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_breaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "security_breaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "security_breaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "security_breaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_breaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      seed_pack_manifest: {
        Row: {
          created_at: string | null
          id: string
          record_id: string
          seed_pack_id: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          record_id: string
          seed_pack_id: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          record_id?: string
          seed_pack_id?: string
          table_name?: string
        }
        Relationships: []
      }
      settings_approvals: {
        Row: {
          affected_count: number | null
          applied_at: string | null
          change_reason: string | null
          created_at: string | null
          current_value: Json | null
          effective_at: string | null
          id: string
          impact_summary: string | null
          proposed_value: Json | null
          requested_at: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          setting_key: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          affected_count?: number | null
          applied_at?: string | null
          change_reason?: string | null
          created_at?: string | null
          current_value?: Json | null
          effective_at?: string | null
          id?: string
          impact_summary?: string | null
          proposed_value?: Json | null
          requested_at?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          setting_key: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          affected_count?: number | null
          applied_at?: string | null
          change_reason?: string | null
          created_at?: string | null
          current_value?: Json | null
          effective_at?: string | null
          id?: string
          impact_summary?: string | null
          proposed_value?: Json | null
          requested_at?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          setting_key?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "settings_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "settings_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "settings_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      settings_versions: {
        Row: {
          affected_record_types: string[] | null
          affected_records_count: number | null
          change_reason: string | null
          change_source: string | null
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          is_rolled_back: boolean | null
          location_id: string | null
          new_value: Json | null
          old_value: Json | null
          rollback_reason: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          setting_category: string | null
          setting_key: string
          setting_scope: string | null
          tenant_id: string
          version_number: number
        }
        Insert: {
          affected_record_types?: string[] | null
          affected_records_count?: number | null
          change_reason?: string | null
          change_source?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          is_rolled_back?: boolean | null
          location_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          setting_category?: string | null
          setting_key: string
          setting_scope?: string | null
          tenant_id: string
          version_number: number
        }
        Update: {
          affected_record_types?: string[] | null
          affected_records_count?: number | null
          change_reason?: string | null
          change_source?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          is_rolled_back?: boolean | null
          location_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          setting_category?: string | null
          setting_key?: string
          setting_scope?: string | null
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "settings_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "settings_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "settings_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      social_media_accounts: {
        Row: {
          access_token: string
          account_metadata: Json | null
          account_name: string
          account_type: string | null
          account_url: string | null
          account_username: string | null
          connected_at: string | null
          created_at: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_sync_at: string | null
          platform: string
          platform_account_id: string
          post_count: number | null
          profile_image_url: string | null
          refresh_token: string | null
          sync_status: string | null
          tenant_id: string
          token_expires_at: string | null
          token_scope: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          account_metadata?: Json | null
          account_name: string
          account_type?: string | null
          account_url?: string | null
          account_username?: string | null
          connected_at?: string | null
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_sync_at?: string | null
          platform: string
          platform_account_id: string
          post_count?: number | null
          profile_image_url?: string | null
          refresh_token?: string | null
          sync_status?: string | null
          tenant_id: string
          token_expires_at?: string | null
          token_scope?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          account_metadata?: Json | null
          account_name?: string
          account_type?: string | null
          account_url?: string | null
          account_username?: string | null
          connected_at?: string | null
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_sync_at?: string | null
          platform?: string
          platform_account_id?: string
          post_count?: number | null
          profile_image_url?: string | null
          refresh_token?: string | null
          sync_status?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          token_scope?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      social_media_interactions: {
        Row: {
          account_id: string
          contact_id: string | null
          created_at: string | null
          id: string
          intent: string | null
          interaction_metadata: Json | null
          interaction_text: string | null
          interaction_timestamp: string
          interaction_type: string
          parent_interaction_id: string | null
          platform_user_id: string
          platform_user_name: string | null
          platform_user_profile_url: string | null
          post_id: string | null
          responded_at: string | null
          responded_by_user_id: string | null
          response_status: string | null
          response_text: string | null
          sentiment: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          intent?: string | null
          interaction_metadata?: Json | null
          interaction_text?: string | null
          interaction_timestamp?: string
          interaction_type: string
          parent_interaction_id?: string | null
          platform_user_id: string
          platform_user_name?: string | null
          platform_user_profile_url?: string | null
          post_id?: string | null
          responded_at?: string | null
          responded_by_user_id?: string | null
          response_status?: string | null
          response_text?: string | null
          sentiment?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          intent?: string | null
          interaction_metadata?: Json | null
          interaction_text?: string | null
          interaction_timestamp?: string
          interaction_type?: string
          parent_interaction_id?: string | null
          platform_user_id?: string
          platform_user_name?: string | null
          platform_user_profile_url?: string | null
          post_id?: string | null
          responded_at?: string | null
          responded_by_user_id?: string | null
          response_status?: string | null
          response_text?: string | null
          sentiment?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_interactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_media_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_interactions_parent_interaction_id_fkey"
            columns: ["parent_interaction_id"]
            isOneToOne: false
            referencedRelation: "social_media_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_interactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          account_id: string
          campaign_id: string | null
          content_text: string
          created_at: string | null
          created_by_user_id: string | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          last_metrics_fetch_at: string | null
          link_url: string | null
          media_type: string | null
          media_urls: string[] | null
          mentions: string[] | null
          metrics: Json | null
          platform: string
          platform_post_id: string | null
          platform_post_url: string | null
          post_metadata: Json | null
          published_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          campaign_id?: string | null
          content_text: string
          created_at?: string | null
          created_by_user_id?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          last_metrics_fetch_at?: string | null
          link_url?: string | null
          media_type?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metrics?: Json | null
          platform: string
          platform_post_id?: string | null
          platform_post_url?: string | null
          post_metadata?: Json | null
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          campaign_id?: string | null
          content_text?: string
          created_at?: string | null
          created_by_user_id?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          last_metrics_fetch_at?: string | null
          link_url?: string | null
          media_type?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metrics?: Json | null
          platform?: string
          platform_post_id?: string | null
          platform_post_url?: string | null
          post_metadata?: Json | null
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaign_attribution"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "social_media_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      stage_auto_move_rules: {
        Row: {
          created_at: string | null
          from_stage_id: string
          id: string
          is_active: boolean | null
          pipeline_id: string
          tenant_id: string
          to_stage_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_stage_id: string
          id?: string
          is_active?: boolean | null
          pipeline_id: string
          tenant_id: string
          to_stage_id: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_stage_id?: string
          id?: string
          is_active?: boolean | null
          pipeline_id?: string
          tenant_id?: string
          to_stage_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_auto_move_rules_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "stage_auto_move_rules_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          active_seats: number
          cancel_at_period_end: boolean
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          dental_group_id: string | null
          id: string
          plan_id: string
          seat_limit: number
          settings: Json
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          active_seats?: number
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          dental_group_id?: string | null
          id?: string
          plan_id: string
          seat_limit: number
          settings?: Json
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          active_seats?: number
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          dental_group_id?: string | null
          id?: string
          plan_id?: string
          seat_limit?: number
          settings?: Json
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_dental_group_id_fkey"
            columns: ["dental_group_id"]
            isOneToOne: false
            referencedRelation: "dental_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          page_url: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          page_url?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          page_url?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "system_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "system_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "system_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          mentions: string[] | null
          task_id: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          task_id: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          mentions?: string[] | null
          task_id?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          child_task_template: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          parent_task_id: string
          tenant_id: string
        }
        Insert: {
          child_task_template: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_task_id: string
          tenant_id: string
        }
        Update: {
          child_task_template?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_escalation_rules: {
        Row: {
          auto_increase_priority: boolean | null
          created_at: string | null
          escalate_to_role: string
          id: string
          is_active: boolean | null
          notify_assignee: boolean | null
          notify_escalation_target: boolean | null
          overdue_hours: number
          priority: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_increase_priority?: boolean | null
          created_at?: string | null
          escalate_to_role: string
          id?: string
          is_active?: boolean | null
          notify_assignee?: boolean | null
          notify_escalation_target?: boolean | null
          overdue_hours?: number
          priority: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_increase_priority?: boolean | null
          created_at?: string | null
          escalate_to_role?: string
          id?: string
          is_active?: boolean | null
          notify_assignee?: boolean | null
          notify_escalation_target?: boolean | null
          overdue_hours?: number
          priority?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_reminder_settings: {
        Row: {
          business_hours_end: string | null
          business_hours_start: string | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          push_enabled: boolean | null
          remind_1h_before: boolean | null
          remind_24h_before: boolean | null
          remind_4h_before: boolean | null
          respect_business_hours: boolean | null
          sms_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          remind_1h_before?: boolean | null
          remind_24h_before?: boolean | null
          remind_4h_before?: boolean | null
          respect_business_hours?: boolean | null
          sms_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          remind_1h_before?: boolean | null
          remind_24h_before?: boolean | null
          remind_4h_before?: boolean | null
          respect_business_hours?: boolean | null
          sms_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_settings: {
        Row: {
          auto_create_on_contact_created: boolean | null
          auto_create_on_deal_stage: Json | null
          created_at: string | null
          default_assignee_strategy: string | null
          default_priority: string | null
          id: string
          overdue_alert_enabled: boolean | null
          reminder_before_due_hours: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_create_on_contact_created?: boolean | null
          auto_create_on_deal_stage?: Json | null
          created_at?: string | null
          default_assignee_strategy?: string | null
          default_priority?: string | null
          id?: string
          overdue_alert_enabled?: boolean | null
          reminder_before_due_hours?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_create_on_contact_created?: boolean | null
          auto_create_on_deal_stage?: Json | null
          created_at?: string | null
          default_assignee_strategy?: string | null
          default_priority?: string | null
          id?: string
          overdue_alert_enabled?: boolean | null
          reminder_before_due_hours?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string | null
          default_notes: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
          task_type: string
          tenant_id: string
          trigger_stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_notes?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
          task_type: string
          tenant_id: string
          trigger_stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_notes?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
          task_type?: string
          tenant_id?: string
          trigger_stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_duration_minutes: number | null
          assignee: string | null
          assignee_id: string | null
          assignee_user_id: string | null
          auto_created: boolean | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string
          is_recurring: boolean | null
          location_id: string | null
          notes: string | null
          owner_user_id: string | null
          parent_task_id: string | null
          position: number | null
          priority: string
          recurring_rule_id: string | null
          reminder_at: string | null
          status: string | null
          task_type: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          assignee?: string | null
          assignee_id?: string | null
          assignee_user_id?: string | null
          auto_created?: boolean | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          location_id?: string | null
          notes?: string | null
          owner_user_id?: string | null
          parent_task_id?: string | null
          position?: number | null
          priority?: string
          recurring_rule_id?: string | null
          reminder_at?: string | null
          status?: string | null
          task_type?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          assignee?: string | null
          assignee_id?: string | null
          assignee_user_id?: string | null
          auto_created?: boolean | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          location_id?: string | null
          notes?: string | null
          owner_user_id?: string | null
          parent_task_id?: string | null
          position?: number | null
          priority?: string
          recurring_rule_id?: string | null
          reminder_at?: string | null
          status?: string | null
          task_type?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_admins: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by_user_id: string | null
          deactivation_reason: string | null
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by_user_id?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by_user_id?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_ai_context: {
        Row: {
          additional_instructions: string | null
          brand_voice: string | null
          created_at: string
          escalation_rules: string | null
          faqs: Json
          id: string
          opening_hours: Json
          practice_description: string | null
          pricing: Json
          services_offered: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          additional_instructions?: string | null
          brand_voice?: string | null
          created_at?: string
          escalation_rules?: string | null
          faqs?: Json
          id?: string
          opening_hours?: Json
          practice_description?: string | null
          pricing?: Json
          services_offered?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          additional_instructions?: string | null
          brand_voice?: string | null
          created_at?: string
          escalation_rules?: string | null
          faqs?: Json
          id?: string
          opening_hours?: Json
          practice_description?: string | null
          pricing?: Json
          services_offered?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_ai_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_ai_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_ai_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ai_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_entitlements: {
        Row: {
          created_at: string | null
          expires_at: string | null
          feature_id: string
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          quota_limit: number | null
          quota_reset_at: string | null
          quota_used: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          feature_id: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          quota_limit?: number | null
          quota_reset_at?: string | null
          quota_used?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          feature_id?: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          quota_limit?: number | null
          quota_reset_at?: string | null
          quota_used?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_entitlements_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_feature_flags: {
        Row: {
          created_at: string | null
          disabled_at: string | null
          enabled_at: string | null
          enabled_by_user_id: string | null
          feature_key: string
          id: string
          is_enabled: boolean | null
          is_trial: boolean | null
          notes: string | null
          plan_tier: string | null
          tenant_id: string
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled_at?: string | null
          enabled_at?: string | null
          enabled_by_user_id?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          is_trial?: boolean | null
          notes?: string | null
          plan_tier?: string | null
          tenant_id: string
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled_at?: string | null
          enabled_at?: string | null
          enabled_by_user_id?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          is_trial?: boolean | null
          notes?: string | null
          plan_tier?: string | null
          tenant_id?: string
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_flags_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_definitions"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_rate_limits: {
        Row: {
          blocked_reason: string | null
          blocked_until: string | null
          created_at: string | null
          custom_daily_limit: number | null
          custom_hourly_limit: number | null
          custom_monthly_limit: number | null
          day_reset_at: string | null
          hour_reset_at: string | null
          is_blocked: boolean | null
          month_reset_at: string | null
          plan_id: string
          requests_this_day: number | null
          requests_this_hour: number | null
          requests_this_month: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          blocked_until?: string | null
          created_at?: string | null
          custom_daily_limit?: number | null
          custom_hourly_limit?: number | null
          custom_monthly_limit?: number | null
          day_reset_at?: string | null
          hour_reset_at?: string | null
          is_blocked?: boolean | null
          month_reset_at?: string | null
          plan_id: string
          requests_this_day?: number | null
          requests_this_hour?: number | null
          requests_this_month?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          blocked_until?: string | null
          created_at?: string | null
          custom_daily_limit?: number | null
          custom_hourly_limit?: number | null
          custom_monthly_limit?: number | null
          day_reset_at?: string | null
          hour_reset_at?: string | null
          is_blocked?: boolean | null
          month_reset_at?: string | null
          plan_id?: string
          requests_this_day?: number | null
          requests_this_hour?: number | null
          requests_this_month?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_rate_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_routing_settings: {
        Row: {
          advanced_settings: Json | null
          ai_confidence_threshold: number | null
          ai_keyword_matching_enabled: boolean | null
          ai_routing_enabled: boolean | null
          ai_value_based_routing_enabled: boolean | null
          allow_user_override: boolean | null
          auto_create_unsorted: boolean | null
          auto_route_webhooks: boolean | null
          calculate_tag_conversion_rates: boolean | null
          created_at: string | null
          high_value_threshold_cents: number | null
          id: string
          notify_on_fallback: boolean | null
          notify_on_routing: boolean | null
          require_approval_for_high_value: boolean | null
          routing_enabled: boolean | null
          suggest_pipeline_in_ui: boolean | null
          tenant_id: string
          track_routing_performance: boolean | null
          unsorted_pipeline_id: string | null
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          advanced_settings?: Json | null
          ai_confidence_threshold?: number | null
          ai_keyword_matching_enabled?: boolean | null
          ai_routing_enabled?: boolean | null
          ai_value_based_routing_enabled?: boolean | null
          allow_user_override?: boolean | null
          auto_create_unsorted?: boolean | null
          auto_route_webhooks?: boolean | null
          calculate_tag_conversion_rates?: boolean | null
          created_at?: string | null
          high_value_threshold_cents?: number | null
          id?: string
          notify_on_fallback?: boolean | null
          notify_on_routing?: boolean | null
          require_approval_for_high_value?: boolean | null
          routing_enabled?: boolean | null
          suggest_pipeline_in_ui?: boolean | null
          tenant_id: string
          track_routing_performance?: boolean | null
          unsorted_pipeline_id?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          advanced_settings?: Json | null
          ai_confidence_threshold?: number | null
          ai_keyword_matching_enabled?: boolean | null
          ai_routing_enabled?: boolean | null
          ai_value_based_routing_enabled?: boolean | null
          allow_user_override?: boolean | null
          auto_create_unsorted?: boolean | null
          auto_route_webhooks?: boolean | null
          calculate_tag_conversion_rates?: boolean | null
          created_at?: string | null
          high_value_threshold_cents?: number | null
          id?: string
          notify_on_fallback?: boolean | null
          notify_on_routing?: boolean | null
          require_approval_for_high_value?: boolean | null
          routing_enabled?: boolean | null
          suggest_pipeline_in_ui?: boolean | null
          tenant_id?: string
          track_routing_performance?: boolean | null
          unsorted_pipeline_id?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_routing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_routing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_routing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_routing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_routing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_routing_settings_unsorted_pipeline_id_fkey"
            columns: ["unsorted_pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "tenant_routing_settings_unsorted_pipeline_id_fkey"
            columns: ["unsorted_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          account_type: string | null
          address_line1: string | null
          address_line2: string | null
          auto_delete_enabled: boolean | null
          billing_address: Json | null
          billing_email: string | null
          billing_plan: string | null
          business_days: string[] | null
          business_hours: Json | null
          business_hours_end: string | null
          business_hours_json: Json | null
          business_hours_start: string | null
          city: string | null
          company_description: string | null
          company_size: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          currency_code: string | null
          custom_domain: string | null
          data_retention_days: number | null
          date_format: string | null
          deleted_at: string | null
          dental_group_id: string | null
          email: string | null
          email_main: string | null
          email_support: string | null
          enable_email_notifications: boolean | null
          enable_slack_notifications: boolean | null
          enable_sms_notifications: boolean | null
          favicon_url: string | null
          feature_flags: Json | null
          fiscal_year_start: string | null
          founded_date: string | null
          founded_year: number | null
          gdpr_compliant: boolean | null
          gdpr_enabled: boolean | null
          grace_period_ends_at: string | null
          id: string
          industry: string | null
          is_multi_location: boolean | null
          last_reminder_sent_at: string | null
          legal_address_line1: string | null
          legal_address_line2: string | null
          legal_city: string | null
          legal_country: string | null
          legal_name: string | null
          legal_postal_code: string | null
          legal_state: string | null
          locale: string | null
          location_name: string | null
          logo_url: string | null
          marketing_enabled: boolean
          marketing_enabled_at: string | null
          marketing_plan: string
          max_locations: number | null
          max_users: number | null
          metadata: Json | null
          name: string
          onboarding_step: string | null
          organization_updated_at: string | null
          parent_tenant_id: string | null
          phone: string | null
          phone_main: string | null
          phone_support: string | null
          plan: string | null
          pms_integration_enabled: boolean | null
          primary_color: string | null
          primary_currency: string | null
          profile_completed: boolean | null
          registration_number: string | null
          reminder_count: number | null
          secondary_color: string | null
          settings: Json | null
          slack_webhook_url: string | null
          slug: string | null
          sms_phone_number: string | null
          state: string | null
          stripe_customer_id: string | null
          subdomain: string | null
          subscription_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          tax_id: string | null
          time_format: string | null
          timezone: string
          timezone_offset: number | null
          trial_ends_at: string | null
          updated_at: string | null
          validated_at: string | null
          validation_email: string | null
          validation_status:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          verification_method: string | null
          verified_at: string | null
          verified_by_user_id: string | null
          website: string | null
          website_host: string | null
          website_url: string | null
          week_start: string | null
          whatsapp_phone_number: string | null
          zip: string | null
        }
        Insert: {
          account_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          auto_delete_enabled?: boolean | null
          billing_address?: Json | null
          billing_email?: string | null
          billing_plan?: string | null
          business_days?: string[] | null
          business_hours?: Json | null
          business_hours_end?: string | null
          business_hours_json?: Json | null
          business_hours_start?: string | null
          city?: string | null
          company_description?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_code?: string | null
          custom_domain?: string | null
          data_retention_days?: number | null
          date_format?: string | null
          deleted_at?: string | null
          dental_group_id?: string | null
          email?: string | null
          email_main?: string | null
          email_support?: string | null
          enable_email_notifications?: boolean | null
          enable_slack_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          favicon_url?: string | null
          feature_flags?: Json | null
          fiscal_year_start?: string | null
          founded_date?: string | null
          founded_year?: number | null
          gdpr_compliant?: boolean | null
          gdpr_enabled?: boolean | null
          grace_period_ends_at?: string | null
          id?: string
          industry?: string | null
          is_multi_location?: boolean | null
          last_reminder_sent_at?: string | null
          legal_address_line1?: string | null
          legal_address_line2?: string | null
          legal_city?: string | null
          legal_country?: string | null
          legal_name?: string | null
          legal_postal_code?: string | null
          legal_state?: string | null
          locale?: string | null
          location_name?: string | null
          logo_url?: string | null
          marketing_enabled?: boolean
          marketing_enabled_at?: string | null
          marketing_plan?: string
          max_locations?: number | null
          max_users?: number | null
          metadata?: Json | null
          name: string
          onboarding_step?: string | null
          organization_updated_at?: string | null
          parent_tenant_id?: string | null
          phone?: string | null
          phone_main?: string | null
          phone_support?: string | null
          plan?: string | null
          pms_integration_enabled?: boolean | null
          primary_color?: string | null
          primary_currency?: string | null
          profile_completed?: boolean | null
          registration_number?: string | null
          reminder_count?: number | null
          secondary_color?: string | null
          settings?: Json | null
          slack_webhook_url?: string | null
          slug?: string | null
          sms_phone_number?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          subdomain?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          time_format?: string | null
          timezone?: string
          timezone_offset?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validation_email?: string | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          verification_method?: string | null
          verified_at?: string | null
          verified_by_user_id?: string | null
          website?: string | null
          website_host?: string | null
          website_url?: string | null
          week_start?: string | null
          whatsapp_phone_number?: string | null
          zip?: string | null
        }
        Update: {
          account_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          auto_delete_enabled?: boolean | null
          billing_address?: Json | null
          billing_email?: string | null
          billing_plan?: string | null
          business_days?: string[] | null
          business_hours?: Json | null
          business_hours_end?: string | null
          business_hours_json?: Json | null
          business_hours_start?: string | null
          city?: string | null
          company_description?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_code?: string | null
          custom_domain?: string | null
          data_retention_days?: number | null
          date_format?: string | null
          deleted_at?: string | null
          dental_group_id?: string | null
          email?: string | null
          email_main?: string | null
          email_support?: string | null
          enable_email_notifications?: boolean | null
          enable_slack_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          favicon_url?: string | null
          feature_flags?: Json | null
          fiscal_year_start?: string | null
          founded_date?: string | null
          founded_year?: number | null
          gdpr_compliant?: boolean | null
          gdpr_enabled?: boolean | null
          grace_period_ends_at?: string | null
          id?: string
          industry?: string | null
          is_multi_location?: boolean | null
          last_reminder_sent_at?: string | null
          legal_address_line1?: string | null
          legal_address_line2?: string | null
          legal_city?: string | null
          legal_country?: string | null
          legal_name?: string | null
          legal_postal_code?: string | null
          legal_state?: string | null
          locale?: string | null
          location_name?: string | null
          logo_url?: string | null
          marketing_enabled?: boolean
          marketing_enabled_at?: string | null
          marketing_plan?: string
          max_locations?: number | null
          max_users?: number | null
          metadata?: Json | null
          name?: string
          onboarding_step?: string | null
          organization_updated_at?: string | null
          parent_tenant_id?: string | null
          phone?: string | null
          phone_main?: string | null
          phone_support?: string | null
          plan?: string | null
          pms_integration_enabled?: boolean | null
          primary_color?: string | null
          primary_currency?: string | null
          profile_completed?: boolean | null
          registration_number?: string | null
          reminder_count?: number | null
          secondary_color?: string | null
          settings?: Json | null
          slack_webhook_url?: string | null
          slug?: string | null
          sms_phone_number?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          subdomain?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          time_format?: string | null
          timezone?: string
          timezone_offset?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validation_email?: string | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
          verification_method?: string | null
          verified_at?: string | null
          verified_by_user_id?: string | null
          website?: string | null
          website_host?: string | null
          website_url?: string | null
          week_start?: string | null
          whatsapp_phone_number?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenants_dental_group"
            columns: ["dental_group_id"]
            isOneToOne: false
            referencedRelation: "dental_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          crm_contact_id: string | null
          crm_deal_id: string | null
          id: string
          insurance_claim_id: string | null
          insurance_paid_cents: number | null
          integration_id: string
          notes: string | null
          patient_paid_cents: number | null
          payment_date: string
          payment_method: string | null
          payment_status: string | null
          pms_data: Json | null
          pms_payment_id: string | null
          synced_from_pms: boolean | null
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          id?: string
          insurance_claim_id?: string | null
          insurance_paid_cents?: number | null
          integration_id: string
          notes?: string | null
          patient_paid_cents?: number | null
          payment_date: string
          payment_method?: string | null
          payment_status?: string | null
          pms_data?: Json | null
          pms_payment_id?: string | null
          synced_from_pms?: boolean | null
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          id?: string
          insurance_claim_id?: string | null
          insurance_paid_cents?: number | null
          integration_id?: string
          notes?: string | null
          patient_paid_cents?: number | null
          payment_date?: string
          payment_method?: string | null
          payment_status?: string | null
          pms_data?: Json | null
          pms_payment_id?: string | null
          synced_from_pms?: boolean | null
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_payments_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "treatment_payments_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_payments_crm_deal_id_fkey"
            columns: ["crm_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_payments_crm_deal_id_fkey"
            columns: ["crm_deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_payments_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "pms_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_payments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          accepted_at: string | null
          accepted_cost_cents: number | null
          actual_paid_cents: number | null
          completed_at: string | null
          created_at: string | null
          crm_contact_id: string | null
          crm_deal_id: string | null
          decline_category: string | null
          decline_reason: string | null
          declined_at: string | null
          estimated_cost_cents: number
          id: string
          insurance_coverage_cents: number | null
          integration_id: string
          notes: string | null
          patient_portion_cents: number | null
          pms_data: Json | null
          pms_patient_id: string
          pms_treatment_id: string
          procedure_codes: string[] | null
          proposed_at: string
          provider_name: string | null
          started_at: string | null
          status: string
          synced_from_pms: boolean | null
          tenant_id: string
          tooth_numbers: string[] | null
          treatment_description: string | null
          treatment_type: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_cost_cents?: number | null
          actual_paid_cents?: number | null
          completed_at?: string | null
          created_at?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          decline_category?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          estimated_cost_cents: number
          id?: string
          insurance_coverage_cents?: number | null
          integration_id: string
          notes?: string | null
          patient_portion_cents?: number | null
          pms_data?: Json | null
          pms_patient_id: string
          pms_treatment_id: string
          procedure_codes?: string[] | null
          proposed_at: string
          provider_name?: string | null
          started_at?: string | null
          status?: string
          synced_from_pms?: boolean | null
          tenant_id: string
          tooth_numbers?: string[] | null
          treatment_description?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_cost_cents?: number | null
          actual_paid_cents?: number | null
          completed_at?: string | null
          created_at?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          decline_category?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          estimated_cost_cents?: number
          id?: string
          insurance_coverage_cents?: number | null
          integration_id?: string
          notes?: string | null
          patient_portion_cents?: number | null
          pms_data?: Json | null
          pms_patient_id?: string
          pms_treatment_id?: string
          procedure_codes?: string[] | null
          proposed_at?: string
          provider_name?: string | null
          started_at?: string | null
          status?: string
          synced_from_pms?: boolean | null
          tenant_id?: string
          tooth_numbers?: string[] | null
          treatment_description?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "treatment_plans_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_crm_deal_id_fkey"
            columns: ["crm_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_crm_deal_id_fkey"
            columns: ["crm_deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "pms_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      treatment_routing_logs: {
        Row: {
          confidence_score: number | null
          deal_id: string
          deal_source: string | null
          deal_title: string | null
          deal_treatment_tags: string[] | null
          deal_value_cents: number | null
          id: string
          matched_keywords: string[] | null
          matched_tag_ids: string[] | null
          metadata: Json | null
          routed_at: string | null
          routed_by_user_id: string | null
          routed_from_pipeline_id: string | null
          routed_to_pipeline_id: string
          routed_to_stage_id: string | null
          routing_duration_ms: number | null
          routing_method: string
          routing_reason: string
          tenant_id: string
          was_manual_override: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          deal_id: string
          deal_source?: string | null
          deal_title?: string | null
          deal_treatment_tags?: string[] | null
          deal_value_cents?: number | null
          id?: string
          matched_keywords?: string[] | null
          matched_tag_ids?: string[] | null
          metadata?: Json | null
          routed_at?: string | null
          routed_by_user_id?: string | null
          routed_from_pipeline_id?: string | null
          routed_to_pipeline_id: string
          routed_to_stage_id?: string | null
          routing_duration_ms?: number | null
          routing_method: string
          routing_reason: string
          tenant_id: string
          was_manual_override?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          deal_id?: string
          deal_source?: string | null
          deal_title?: string | null
          deal_treatment_tags?: string[] | null
          deal_value_cents?: number | null
          id?: string
          matched_keywords?: string[] | null
          matched_tag_ids?: string[] | null
          metadata?: Json | null
          routed_at?: string | null
          routed_by_user_id?: string | null
          routed_from_pipeline_id?: string | null
          routed_to_pipeline_id?: string
          routed_to_stage_id?: string | null
          routing_duration_ms?: number | null
          routing_method?: string
          routing_reason?: string
          tenant_id?: string
          was_manual_override?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_routing_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_from_pipeline_id_fkey"
            columns: ["routed_from_pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_from_pipeline_id_fkey"
            columns: ["routed_from_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_to_pipeline_id_fkey"
            columns: ["routed_to_pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_to_pipeline_id_fkey"
            columns: ["routed_to_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_to_stage_id_fkey"
            columns: ["routed_to_stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_to_stage_id_fkey"
            columns: ["routed_to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_routed_to_stage_id_fkey"
            columns: ["routed_to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_routing_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      treatment_tag_pipeline_mappings: {
        Row: {
          assigned_owner_user_id: string | null
          auto_assign_owner: boolean | null
          conditions: Json | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          max_value_cents: number | null
          min_value_cents: number | null
          pipeline_id: string
          priority: number | null
          stage_id: string | null
          tenant_id: string
          treatment_tag_id: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          assigned_owner_user_id?: string | null
          auto_assign_owner?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          max_value_cents?: number | null
          min_value_cents?: number | null
          pipeline_id: string
          priority?: number | null
          stage_id?: string | null
          tenant_id: string
          treatment_tag_id: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          assigned_owner_user_id?: string | null
          auto_assign_owner?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          max_value_cents?: number | null
          min_value_cents?: number | null
          pipeline_id?: string
          priority?: number | null
          stage_id?: string | null
          tenant_id?: string
          treatment_tag_id?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tag_pipeline_mappings_treatment_tag_id_fkey"
            columns: ["treatment_tag_id"]
            isOneToOne: false
            referencedRelation: "treatment_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_tags: {
        Row: {
          avg_deal_value_cents: number | null
          category: string | null
          color: string | null
          conversion_rate: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system_tag: boolean | null
          keywords: string[]
          location_id: string | null
          min_value_cents: number | null
          name: string
          priority: number | null
          scope: string
          tenant_id: string
          updated_at: string | null
          updated_by_user_id: string | null
          usage_count: number | null
        }
        Insert: {
          avg_deal_value_cents?: number | null
          category?: string | null
          color?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_tag?: boolean | null
          keywords?: string[]
          location_id?: string | null
          min_value_cents?: number | null
          name: string
          priority?: number | null
          scope?: string
          tenant_id: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          usage_count?: number | null
        }
        Update: {
          avg_deal_value_cents?: number | null
          category?: string | null
          color?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_tag?: boolean | null
          keywords?: string[]
          location_id?: string | null
          min_value_cents?: number | null
          name?: string
          priority?: number | null
          scope?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      treatment_types: {
        Row: {
          category: string
          created_at: string
          default_lead_value_cents_max: number | null
          default_lead_value_cents_min: number | null
          default_sla_minutes: number
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_system: boolean
          key: string
          metadata: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_lead_value_cents_max?: number | null
          default_lead_value_cents_min?: number | null
          default_sla_minutes?: number
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          key: string
          metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_lead_value_cents_max?: number | null
          default_lead_value_cents_min?: number | null
          default_sla_minutes?: number
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          key?: string
          metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          billed_in_invoice_id: string | null
          id: string
          key: string
          metadata: Json
          occurred_at: string
          quantity: number
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          billed_in_invoice_id?: string | null
          id?: string
          key: string
          metadata?: Json
          occurred_at?: string
          quantity: number
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          billed_in_invoice_id?: string | null
          id?: string
          key?: string
          metadata?: Json
          occurred_at?: string
          quantity?: number
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_billed_in_invoice_id_fkey"
            columns: ["billed_in_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          method: string | null
          phone_number: string | null
          secret_key: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string | null
          phone_number?: string | null
          secret_key?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string | null
          phone_number?: string | null
          secret_key?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[] | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[] | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[] | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_column_preferences: {
        Row: {
          created_at: string
          id: string
          page: string
          updated_at: string
          user_id: string
          visible_columns: Json
        }
        Insert: {
          created_at?: string
          id?: string
          page: string
          updated_at?: string
          user_id: string
          visible_columns?: Json
        }
        Update: {
          created_at?: string
          id?: string
          page?: string
          updated_at?: string
          user_id?: string
          visible_columns?: Json
        }
        Relationships: []
      }
      user_context_history: {
        Row: {
          created_at: string | null
          from_location_id: string | null
          from_tenant_id: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          session_id: string | null
          switch_method: string | null
          to_location_id: string | null
          to_tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          from_location_id?: string | null
          from_tenant_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_id?: string | null
          switch_method?: string | null
          to_location_id?: string | null
          to_tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          from_location_id?: string | null
          from_tenant_id?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_id?: string | null
          switch_method?: string | null
          to_location_id?: string | null
          to_tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_context_history_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_context_history_from_tenant_id_fkey"
            columns: ["from_tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_context_history_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_context_history_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_dashboard_preferences: {
        Row: {
          auto_refresh_enabled: boolean | null
          auto_refresh_interval: number | null
          created_at: string | null
          id: string
          theme_preference: string | null
          time_period_default: string | null
          updated_at: string | null
          user_id: string
          widget_order: Json | null
          widget_settings: Json | null
          widget_visibility: Json | null
        }
        Insert: {
          auto_refresh_enabled?: boolean | null
          auto_refresh_interval?: number | null
          created_at?: string | null
          id?: string
          theme_preference?: string | null
          time_period_default?: string | null
          updated_at?: string | null
          user_id: string
          widget_order?: Json | null
          widget_settings?: Json | null
          widget_visibility?: Json | null
        }
        Update: {
          auto_refresh_enabled?: boolean | null
          auto_refresh_interval?: number | null
          created_at?: string | null
          id?: string
          theme_preference?: string | null
          time_period_default?: string | null
          updated_at?: string | null
          user_id?: string
          widget_order?: Json | null
          widget_settings?: Json | null
          widget_visibility?: Json | null
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          batch_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by_user_id: string
          last_sent_at: string | null
          location_id: string | null
          location_ids: string[] | null
          metadata: Json | null
          resend_count: number | null
          role: string
          status: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          batch_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by_user_id: string
          last_sent_at?: string | null
          location_id?: string | null
          location_ids?: string[] | null
          metadata?: Json | null
          resend_count?: number | null
          role: string
          status?: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          batch_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by_user_id?: string
          last_sent_at?: string | null
          location_id?: string | null
          location_ids?: string[] | null
          metadata?: Json | null
          resend_count?: number | null
          role?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_location_access: {
        Row: {
          created_at: string
          granted_at: string
          granted_by_user_id: string | null
          id: string
          is_active: boolean
          notes: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by_user_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_location_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_location_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_location_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_login_history: {
        Row: {
          created_at: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          login_method: string
          success: boolean | null
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          login_method: string
          success?: boolean | null
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          login_method?: string
          success?: boolean | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_login_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_login_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_login_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_login_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_login_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_org_preferences: {
        Row: {
          color_theme: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          is_pinned: boolean | null
          last_visited_at: string | null
          metadata: Json | null
          nickname: string | null
          notification_preferences: Json | null
          pin_order: number | null
          tenant_id: string
          ui_preferences: Json | null
          updated_at: string | null
          user_id: string
          visit_count: number | null
        }
        Insert: {
          color_theme?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_pinned?: boolean | null
          last_visited_at?: string | null
          metadata?: Json | null
          nickname?: string | null
          notification_preferences?: Json | null
          pin_order?: number | null
          tenant_id: string
          ui_preferences?: Json | null
          updated_at?: string | null
          user_id: string
          visit_count?: number | null
        }
        Update: {
          color_theme?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_pinned?: boolean | null
          last_visited_at?: string | null
          metadata?: Json | null
          nickname?: string | null
          notification_preferences?: Json | null
          pin_order?: number | null
          tenant_id?: string
          ui_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted: boolean | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          reason: string | null
          scope_location_ids: string[] | null
          scope_type: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          reason?: string | null
          scope_location_ids?: string[] | null
          scope_type?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          reason?: string | null
          scope_location_ids?: string[] | null
          scope_type?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_pipeline_preferences: {
        Row: {
          compact_view: boolean | null
          created_at: string | null
          default_view: string | null
          id: string
          last_selected_pipeline_id: string | null
          pipeline_order: Json | null
          show_archived: boolean | null
          updated_at: string | null
          user_id: string
          visible_columns: Json | null
        }
        Insert: {
          compact_view?: boolean | null
          created_at?: string | null
          default_view?: string | null
          id?: string
          last_selected_pipeline_id?: string | null
          pipeline_order?: Json | null
          show_archived?: boolean | null
          updated_at?: string | null
          user_id: string
          visible_columns?: Json | null
        }
        Update: {
          compact_view?: boolean | null
          created_at?: string | null
          default_view?: string | null
          id?: string
          last_selected_pipeline_id?: string | null
          pipeline_order?: Json | null
          show_archived?: boolean | null
          updated_at?: string | null
          user_id?: string
          visible_columns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_pipeline_preferences_last_selected_pipeline_id_fkey"
            columns: ["last_selected_pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "user_pipeline_preferences_last_selected_pipeline_id_fkey"
            columns: ["last_selected_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferences?: Json
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          role_id: string | null
          settings: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          role_id?: string | null
          settings?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          role_id?: string | null
          settings?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          last_activity_at: string | null
          session_token: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string | null
          session_token: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string | null
          session_token?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_tenant_memberships: {
        Row: {
          all_locations: boolean
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_locations?: boolean
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_locations?: boolean
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          http_status_code: number | null
          id: string
          max_attempts: number | null
          next_retry_at: string | null
          payload: Json
          request_body: string | null
          request_headers: Json | null
          response_body: string | null
          response_headers: Json | null
          sent_at: string | null
          status: string
          tenant_id: string
          webhook_endpoint_id: string
        }
        Insert: {
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          http_status_code?: number | null
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          payload: Json
          request_body?: string | null
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          sent_at?: string | null
          status: string
          tenant_id: string
          webhook_endpoint_id: string
        }
        Update: {
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          http_status_code?: number | null
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json
          request_body?: string | null
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          webhook_endpoint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_statistics"
            referencedColumns: ["endpoint_id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          enabled: boolean | null
          failed_deliveries: number | null
          id: string
          last_delivery_at: string | null
          last_failure_at: string | null
          last_success_at: string | null
          max_retry_attempts: number | null
          metadata: Json | null
          secret_key: string
          subscribed_events: string[]
          successful_deliveries: number | null
          tenant_id: string
          timeout_seconds: number | null
          total_deliveries: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          enabled?: boolean | null
          failed_deliveries?: number | null
          id?: string
          last_delivery_at?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          max_retry_attempts?: number | null
          metadata?: Json | null
          secret_key?: string
          subscribed_events?: string[]
          successful_deliveries?: number | null
          tenant_id: string
          timeout_seconds?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          enabled?: boolean | null
          failed_deliveries?: number | null
          id?: string
          last_delivery_at?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          max_retry_attempts?: number | null
          metadata?: Json | null
          secret_key?: string
          subscribed_events?: string[]
          successful_deliveries?: number | null
          tenant_id?: string
          timeout_seconds?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      webhook_event_types: {
        Row: {
          category: string
          description: string
          event_type: string
          is_active: boolean | null
          payload_schema: Json | null
        }
        Insert: {
          category: string
          description: string
          event_type: string
          is_active?: boolean | null
          payload_schema?: Json | null
        }
        Update: {
          category?: string
          description?: string
          event_type?: string
          is_active?: boolean | null
          payload_schema?: Json | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          received_at: string | null
          result: Json | null
          retry_count: number | null
          signature: string | null
          signature_verified: boolean | null
          source: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id: string
          payload: Json
          processed_at?: string | null
          received_at?: string | null
          result?: Json | null
          retry_count?: number | null
          signature?: string | null
          signature_verified?: boolean | null
          source: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string | null
          result?: Json | null
          retry_count?: number | null
          signature?: string | null
          signature_verified?: boolean | null
          source?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Views: {
      activities_with_associations: {
        Row: {
          agent_name: string | null
          agent_user_id: string | null
          artifact_count: number | null
          attendees: Json | null
          call_from: string | null
          call_sid: string | null
          call_to: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          deal_id: string | null
          deal_title: string | null
          description: string | null
          direction: string | null
          duration_seconds: number | null
          edited_at: string | null
          edited_by_user_id: string | null
          email_bcc: string[] | null
          email_cc: string[] | null
          email_from: string | null
          email_reply_to: string | null
          email_to: string[] | null
          external_id: string | null
          file_count: number | null
          from_number: string | null
          has_attachments: boolean | null
          id: string | null
          integration_metadata: Json | null
          integration_provider: string | null
          is_edited: boolean | null
          marketing_campaign_id: string | null
          marketing_event_type: string | null
          mentions: string[] | null
          message_status: string | null
          metadata: Json | null
          occurred_at: string | null
          outcome: string | null
          parent_activity_id: string | null
          raw: Json | null
          recording_url: string | null
          rich_content: string | null
          snippet: string | null
          subject: string | null
          tenant_id: string | null
          thread_id: string | null
          title: string | null
          to_number: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      activities_with_integrations: {
        Row: {
          agent_name: string | null
          agent_user_id: string | null
          ai_artifact_count: number | null
          attachment_count: number | null
          attendees: Json | null
          call_from: string | null
          call_sid: string | null
          call_to: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          deal_id: string | null
          deal_pipeline: string | null
          deal_stage: string | null
          deal_title: string | null
          deal_value: number | null
          description: string | null
          direction: string | null
          duration_seconds: number | null
          edited_at: string | null
          edited_by_user_id: string | null
          email_bcc: string[] | null
          email_cc: string[] | null
          email_from: string | null
          email_reply_to: string | null
          email_to: string[] | null
          external_id: string | null
          from_number: string | null
          has_attachments: boolean | null
          id: string | null
          integration_metadata: Json | null
          integration_provider: string | null
          is_edited: boolean | null
          is_integrated: boolean | null
          marketing_campaign_id: string | null
          marketing_event_type: string | null
          mentions: string[] | null
          message_status: string | null
          metadata: Json | null
          occurred_at: string | null
          outcome: string | null
          parent_activity_id: string | null
          raw: Json | null
          recording_url: string | null
          rich_content: string | null
          snippet: string | null
          subject: string | null
          tenant_id: string | null
          thread_id: string | null
          title: string | null
          to_number: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_edited_by_user_id_fkey"
            columns: ["edited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities_with_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      activity_effectiveness_metrics: {
        Row: {
          activity_type: string | null
          agent_name: string | null
          agent_user_id: string | null
          deals_won_after_activity: number | null
          revenue_influenced_cents: number | null
          tenant_id: string | null
          total_activities: number | null
          unique_contacts: number | null
          unique_deals: number | null
          win_rate_after_activity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_agent_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      actual_ltv_by_source: {
        Row: {
          avg_actual_ltv_cents: number | null
          avg_treatments_per_customer: number | null
          source: string | null
          tenant_id: string | null
          total_actual_ltv_cents: number | null
          total_customers: number | null
          total_payments_cents: number | null
          total_treatments: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      backup_statistics: {
        Row: {
          backup_enabled: boolean | null
          backup_frequency: string | null
          backups_last_30d: number | null
          last_backup_at: string | null
          last_backup_status: string | null
          latest_backup_id: string | null
          next_backup_at: string | null
          retention_days: number | null
          successful_restores: number | null
          tenant_id: string | null
          tenant_name: string | null
          total_backup_size_bytes: number | null
          total_backups: number | null
          total_compressed_size_bytes: number | null
          total_restore_requests: number | null
        }
        Relationships: []
      }
      cohort_retention_analysis: {
        Row: {
          active_month_1: number | null
          active_month_12: number | null
          active_month_2: number | null
          active_month_3: number | null
          active_month_6: number | null
          cohort_month: string | null
          cohort_size: number | null
          retention_rate_12m: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      common_dental_procedure_codes: {
        Row: {
          procedure_category: string | null
          procedure_code: string | null
          procedure_name: string | null
        }
        Relationships: []
      }
      contact_engagement_scores: {
        Row: {
          contact_id: string | null
          email_opens: number | null
          engagement_events_30d: number | null
          engagement_level: string | null
          form_submits: number | null
          full_name: string | null
          last_engagement_at: string | null
          link_clicks: number | null
          primary_email: string | null
          source: string | null
          tenant_id: string | null
          total_engagement_events: number | null
          total_engagement_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      conversion_funnel_metrics: {
        Row: {
          conversion_rate_from_previous: number | null
          deals_in_stage: number | null
          pipeline_id: string | null
          pipeline_name: string | null
          previous_stage_count: number | null
          stage_id: string | null
          stage_name: string | null
          stage_position: number | null
          tenant_id: string | null
          total_value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      crm_lead_source_analytics: {
        Row: {
          avg_deal_value_cents: number | null
          contact_to_deal_conversion_rate: number | null
          deal_win_rate: number | null
          deals_created: number | null
          deals_won: number | null
          lead_source: string | null
          revenue_generated_cents: number | null
          tenant_id: string | null
          total_contacts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      crm_pipeline_stage_analytics: {
        Row: {
          avg_days_in_stage: number | null
          avg_deal_value_cents: number | null
          current_deals: number | null
          deals_last_30_days: number | null
          pipeline_id: string | null
          pipeline_name: string | null
          stage_id: string | null
          stage_name: string | null
          stage_position: number | null
          tenant_id: string | null
          total_value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      crm_revenue_by_month: {
        Row: {
          avg_deal_value_cents: number | null
          deals_created: number | null
          deals_won: number | null
          month: string | null
          revenue_cents: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      crm_sales_performance_by_user: {
        Row: {
          avg_deal_value_cents: number | null
          deals_lost: number | null
          deals_won: number | null
          owner_user_id: string | null
          revenue_generated_cents: number | null
          tenant_id: string | null
          total_activities: number | null
          total_calls: number | null
          total_deals: number | null
          total_emails: number | null
          total_pipeline_value_cents: number | null
          user_name: string | null
          user_role: string | null
          win_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      customer_ltv_by_source: {
        Row: {
          avg_customer_age_days: number | null
          avg_ltv_cents: number | null
          deals_per_customer: number | null
          deals_won: number | null
          source: string | null
          tenant_id: string | null
          total_customers: number | null
          total_revenue_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      daily_active_users: {
        Row: {
          active_users: number | null
          date: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deal_analytics_summary: {
        Row: {
          avg_value: number | null
          deal_count: number | null
          deals_updated_this_week: number | null
          newest_update: string | null
          oldest_deal: string | null
          owner_user_id: string | null
          pipeline_id: string | null
          stage_id: string | null
          stuck_deals: number | null
          tenant_id: string | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deal_size_distribution: {
        Row: {
          avg_value_cents: number | null
          deal_count: number | null
          deal_size_range: string | null
          tenant_id: string | null
          total_value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      deals_with_contacts: {
        Row: {
          actual_revenue_cents: number | null
          consultation_date: string | null
          consultation_scheduled: boolean | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_source: string | null
          contact_tags: string[] | null
          conversion_probability: number | null
          created_at: string | null
          currency: string | null
          deal_type: string | null
          deleted_at: string | null
          dental_service_id: string | null
          deposit_amount_cents: number | null
          description: string | null
          estimated_duration_weeks: number | null
          expected_close_date: string | null
          follow_up_required: boolean | null
          id: string | null
          insurance_authorization_number: string | null
          insurance_coverage: boolean | null
          insurance_coverage_percentage: number | null
          insurance_provider: string | null
          internal_notes: string | null
          last_activity_at: string | null
          lead_score: number | null
          location_id: string | null
          location_name: string | null
          marketing_source_id: string | null
          marketing_source_name: string | null
          marketing_source_type: string | null
          marketing_touchpoints: Json | null
          next_follow_up_date: string | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          owner_user_id: string | null
          patient_concerns: string | null
          payment_plan: string | null
          pipeline_id: string | null
          pipeline_name: string | null
          pms_patient_id: string | null
          pms_sync_status: string | null
          pms_treatment_id: string | null
          pms_treatment_plan_id: string | null
          procedure_codes: string[] | null
          social_media_source_interaction_id: string | null
          social_media_source_platform: string | null
          social_media_source_post_id: string | null
          source: string | null
          stage_id: string | null
          stage_name: string | null
          stage_position: number | null
          status: string | null
          tenant_id: string | null
          title: string | null
          treatment_category: string | null
          treatment_end_date: string | null
          treatment_start_date: string | null
          treatment_tags: string[] | null
          treatment_type: string | null
          treatment_urgency: string | null
          updated_at: string | null
          value_estimate_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_dental_service_id_fkey"
            columns: ["dental_service_id"]
            isOneToOne: false
            referencedRelation: "dental_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_social_media_source_interaction_id_fkey"
            columns: ["social_media_source_interaction_id"]
            isOneToOne: false
            referencedRelation: "social_media_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_social_media_source_post_id_fkey"
            columns: ["social_media_source_post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "conversion_funnel_metrics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stage_analytics"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      executive_dashboard_kpis: {
        Row: {
          active_pipeline_deals: number | null
          active_pipeline_value_cents: number | null
          campaigns_sent_30d: number | null
          deals_won_30d: number | null
          marketing_messages_sent_30d: number | null
          new_contacts_30d: number | null
          new_deals_30d: number | null
          owner_count: number | null
          practice_name: string | null
          revenue_30d_cents: number | null
          staff_count: number | null
          team_size: number | null
          tenant_id: string | null
          total_activities_30d: number | null
          total_contacts: number | null
        }
        Relationships: []
      }
      feature_adoption: {
        Row: {
          adoption_rate_percent: number | null
          feature_name: string | null
          practices_using: number | null
          total_uses: number | null
          users_using: number | null
        }
        Relationships: []
      }
      journey_analytics: {
        Row: {
          avg_completion_time_hours: number | null
          completion_rate: number | null
          currently_active: number | null
          goal_conversion_rate: number | null
          goals_achieved: number | null
          journey_id: string | null
          journey_name: string | null
          journey_status: string | null
          tenant_id: string | null
          total_completed: number | null
          total_entered: number | null
          total_failed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      journey_step_analytics: {
        Row: {
          avg_execution_time_ms: number | null
          failed_executions: number | null
          journey_id: string | null
          max_execution_time_ms: number | null
          skipped_executions: number | null
          step_index: number | null
          step_name: string | null
          step_type: string | null
          success_rate: number | null
          successful_executions: number | null
          total_executions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journey_step_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journey_analytics"
            referencedColumns: ["journey_id"]
          },
          {
            foreignKeyName: "marketing_journey_step_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      latest_audit_runs: {
        Row: {
          analytics_score: number | null
          api_calls: Json | null
          api_costs_usd: number | null
          completed_at: string | null
          composite_score: number | null
          content_score: number | null
          conversion_score: number | null
          created_at: string | null
          created_by: string | null
          domain: string | null
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          gap_to_median: number | null
          gap_to_top_3_avg: number | null
          id: string | null
          local_score: number | null
          peer_count: number | null
          peer_group_id: string | null
          percentile_rank: number | null
          phase: number | null
          practice_id: string | null
          run_type: string | null
          started_at: string | null
          status: string | null
          technical_score: number | null
          tenant_id: string | null
          updated_at: string | null
          your_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_peer_group"
            columns: ["peer_group_id"]
            isOneToOne: false
            referencedRelation: "audit_peer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_cac_analysis: {
        Row: {
          cost_per_lead_cents: number | null
          customer_acquisition_cost_cents: number | null
          deals_won: number | null
          lead_to_customer_conversion_rate: number | null
          month: string | null
          revenue_generated_cents: number | null
          roi_multiplier: number | null
          tenant_id: string | null
          total_deals: number | null
          total_leads: number | null
          total_marketing_spend_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_campaign_attribution: {
        Row: {
          campaign_date: string | null
          campaign_id: string | null
          campaign_name: string | null
          channel: string | null
          clicked_count: number | null
          deals_won: number | null
          first_touch_leads: number | null
          last_touch_leads: number | null
          opened_count: number | null
          revenue_generated_cents: number | null
          sent_count: number | null
          status: string | null
          tenant_id: string | null
          total_deals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      marketing_roi_summary: {
        Row: {
          avg_click_rate: number | null
          avg_open_rate: number | null
          channel: string | null
          deals_created: number | null
          deals_won: number | null
          leads_generated: number | null
          revenue_generated_cents: number | null
          tenant_id: string | null
          total_campaigns: number | null
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pipeline_velocity_detailed: {
        Row: {
          avg_days_in_stage: number | null
          avg_deal_value_cents: number | null
          from_stage_name: string | null
          max_days: number | null
          median_days_in_stage: number | null
          min_days: number | null
          stuck_deals_count: number | null
          tenant_id: string | null
          to_stage_name: string | null
          total_transitions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pms_integration_health: {
        Row: {
          accepted_treatments: number | null
          connection_status: string | null
          failed_syncs_24h: number | null
          last_sync_at: string | null
          mapped_patients: number | null
          provider: string | null
          provider_name: string | null
          tenant_id: string | null
          total_payment_amount_cents: number | null
          total_payments: number | null
          total_treatments: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      practice_growth: {
        Row: {
          cumulative_total: number | null
          new_signups: number | null
          signup_date: string | null
        }
        Relationships: []
      }
      rate_limit_usage: {
        Row: {
          blocked_reason: string | null
          blocked_until: string | null
          daily_limit: number | null
          daily_usage_pct: number | null
          day_reset_at: string | null
          hour_reset_at: string | null
          hourly_limit: number | null
          hourly_usage_pct: number | null
          is_blocked: boolean | null
          month_reset_at: string | null
          monthly_limit: number | null
          monthly_usage_pct: number | null
          plan_description: string | null
          plan_name: string | null
          requests_this_day: number | null
          requests_this_hour: number | null
          requests_this_month: number | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: []
      }
      revenue_accuracy_metrics: {
        Row: {
          accuracy_percentage: number | null
          avg_actual_cents: number | null
          avg_estimated_cents: number | null
          tenant_id: string | null
          total_actual_cents: number | null
          total_deals: number | null
          total_estimated_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      revenue_forecast_base: {
        Row: {
          deal_count: number | null
          deal_month: string | null
          stage_name: string | null
          stage_probability: number | null
          tenant_id: string | null
          total_value_cents: number | null
          weighted_value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      social_media_performance: {
        Row: {
          account_name: string | null
          deals_generated: number | null
          follower_count: number | null
          platform: string | null
          posts_last_30_days: number | null
          revenue_generated_cents: number | null
          tenant_id: string | null
          total_clicks: number | null
          total_comments: number | null
          total_likes: number | null
          total_posts: number | null
          total_reach: number | null
          total_shares: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      soft_deleted_records: {
        Row: {
          deleted_at: string | null
          id: string | null
          record_created_at: string | null
          table_name: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      tasks_with_associations: {
        Row: {
          actual_duration_minutes: number | null
          assignee: string | null
          assignee_email: string | null
          assignee_id: string | null
          assignee_name: string | null
          assignee_user_id: string | null
          auto_created: boolean | null
          comment_count: number | null
          completed_at: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          deal_id: string | null
          deal_title: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string | null
          is_recurring: boolean | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          owner_user_id: string | null
          parent_task_id: string | null
          position: number | null
          priority: string | null
          recurring_rule_id: string | null
          reminder_at: string | null
          status: string | null
          subtask_count: number | null
          task_type: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_engagement_scores"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_with_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      treatment_type_analytics: {
        Row: {
          acceptance_rate: number | null
          avg_accepted_cost_cents: number | null
          avg_estimated_cost_cents: number | null
          avg_revenue_per_treatment_cents: number | null
          tenant_id: string | null
          total_accepted: number | null
          total_completed: number | null
          total_declined: number | null
          total_proposed: number | null
          total_revenue_cents: number | null
          treatment_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_accessible_locations: {
        Row: {
          is_multi_location: boolean | null
          is_primary_location: boolean | null
          location_name: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_engagement_summary: {
        Row: {
          days_active_last_30: number | null
          email: string | null
          events_last_7_days: number | null
          full_name: string | null
          last_active_at: string | null
          practice_name: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_recent_orgs: {
        Row: {
          color_theme: string | null
          is_pinned: boolean | null
          last_visited_at: string | null
          nickname: string | null
          pin_order: number | null
          recency_rank: number | null
          role: Database["public"]["Enums"]["membership_role"] | null
          tenant_id: string | null
          tenant_name: string | null
          user_id: string | null
          visit_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_org_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_routing_permissions: {
        Row: {
          category: string | null
          description: string | null
          display_order: number | null
          key: string | null
          label: string | null
          subcategory: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          display_order?: number | null
          key?: string | null
          label?: string | null
          subcategory?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          display_order?: number | null
          key?: string | null
          label?: string | null
          subcategory?: string | null
        }
        Relationships: []
      }
      webhook_statistics: {
        Row: {
          avg_response_time_ms: number | null
          deliveries_24h: number | null
          enabled: boolean | null
          endpoint_id: string | null
          failed_deliveries: number | null
          last_delivery_at: string | null
          last_failure_at: string | null
          last_success_at: string | null
          pending_deliveries: number | null
          success_rate_pct: number | null
          successful_deliveries: number | null
          tenant_id: string | null
          total_deliveries: number | null
          url: string | null
        }
        Insert: {
          avg_response_time_ms?: never
          deliveries_24h?: never
          enabled?: boolean | null
          endpoint_id?: string | null
          failed_deliveries?: number | null
          last_delivery_at?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          pending_deliveries?: never
          success_rate_pct?: never
          successful_deliveries?: number | null
          tenant_id?: string | null
          total_deliveries?: number | null
          url?: string | null
        }
        Update: {
          avg_response_time_ms?: never
          deliveries_24h?: never
          enabled?: boolean | null
          endpoint_id?: string | null
          failed_deliveries?: number | null
          last_delivery_at?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          pending_deliveries?: never
          success_rate_pct?: never
          successful_deliveries?: number | null
          tenant_id?: string | null
          total_deliveries?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      webhook_stats: {
        Row: {
          avg_processing_seconds: number | null
          completed: number | null
          date: string | null
          duplicates: number | null
          event_type: string | null
          failed: number | null
          source: string | null
          tenant_id: string | null
          total_events: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      win_loss_analysis: {
        Row: {
          avg_deal_value_cents: number | null
          competitor: string | null
          count: number | null
          outcome: string | null
          percentage_of_outcome: number | null
          primary_reason: string | null
          tenant_id: string | null
          total_value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "backup_statistics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_locations"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Functions: {
      _map_utm_role_to_org_role: { Args: { p_role: string }; Returns: string }
      _map_utm_status_to_org_status: {
        Args: { p_status: string }
        Returns: string
      }
      acquire_automation_lease: {
        Args: {
          p_lease_duration_seconds?: number
          p_lease_key: string
          p_worker_id: string
        }
        Returns: boolean
      }
      add_to_dlq: {
        Args: {
          p_context?: Json
          p_error_code?: string
          p_error_message: string
          p_integration_type: string
          p_operation: string
          p_payload: Json
          p_tenant_id: string
        }
        Returns: string
      }
      analyze_rls_performance: {
        Args: { user_email: string }
        Returns: {
          accessible_tenant_count: number
          expected_performance: string
          is_multi_location: boolean
          query_path: string
          user_id: string
        }[]
      }
      anonymize_contact_data: {
        Args: {
          p_contact_id: string
          p_requested_by: string
          p_tenant_id: string
        }
        Returns: Json
      }
      apply_audit_retention_policies: { Args: never; Returns: number }
      approve_join_request: {
        Args: {
          p_approved_by: string
          p_assigned_role?: string
          p_request_id: string
        }
        Returns: Json
      }
      archive_notification: {
        Args: { p_notification_id: string; p_user_id: string }
        Returns: boolean
      }
      auto_delete_old_notifications: { Args: never; Returns: number }
      build_automation_idempotency_key: {
        Args: {
          p_automation_id: string
          p_entity_id?: string
          p_event_id: string
        }
        Returns: string
      }
      bulk_import_pms_procedure_mappings: {
        Args: { p_created_by?: string; p_mappings: Json; p_tenant_id: string }
        Returns: {
          errors: Json
          imported_count: number
          skipped_count: number
        }[]
      }
      calculate_actual_ltv: { Args: { p_contact_id: string }; Returns: number }
      calculate_business_health_score: {
        Args: { p_tenant_id: string }
        Returns: {
          activity_score: number
          overall_score: number
          pipeline_health_score: number
          recommendations: string[]
          revenue_growth_score: number
          win_rate_score: number
        }[]
      }
      calculate_cac: {
        Args: {
          end_date?: string
          start_date?: string
          tenant_id_param: string
        }
        Returns: {
          avg_ltv_cents: number
          cac_cents: number
          ltv_to_cac_ratio: number
          total_customers_acquired: number
          total_marketing_spend_cents: number
        }[]
      }
      calculate_composite_score: {
        Args: {
          analytics: number
          content: number
          conversion: number
          local: number
          technical: number
        }
        Returns: number
      }
      calculate_marketing_engagement: {
        Args: { p_contact_id: string }
        Returns: number
      }
      calculate_pipeline_velocity: {
        Args: { pipeline_id_param?: string; tenant_id_param: string }
        Returns: {
          avg_days_to_close: number
          fastest_deal_days: number
          median_days_to_close: number
          slowest_deal_days: number
        }[]
      }
      calculate_post_engagement_rate: {
        Args: { post_id: string }
        Returns: number
      }
      calculate_priority_score: {
        Args: { confidence: string; effort: string; impact: string }
        Returns: number
      }
      cancel_invitation: {
        Args: { p_cancelled_by: string; p_invite_id: string }
        Returns: Json
      }
      cancel_stale_batches: { Args: never; Returns: number }
      check_automation_eligible: {
        Args: {
          p_automation_id: string
          p_idempotency_key: string
          p_origin_tag?: string
        }
        Returns: {
          existing_execution_id: string
          is_eligible: boolean
          reason: string
        }[]
      }
      check_bulk_invite_collisions: {
        Args: {
          p_emails: string[]
          p_invited_by_user_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      check_entitlement: {
        Args: { fail_on_missing?: boolean; feature_key: string }
        Returns: boolean
      }
      check_entitlements: {
        Args: { p_feature_codes: string[]; p_require_all?: boolean }
        Returns: boolean
      }
      check_feature_flag: { Args: { flag_key: string }; Returns: boolean }
      check_feature_flag_for_tenant: {
        Args: { flag_key: string; tenant_uuid: string }
        Returns: boolean
      }
      check_invite_collision: {
        Args: {
          p_email: string
          p_invited_by_user_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      check_quota_status: {
        Args: { p_feature_code: string }
        Returns: {
          is_exceeded: boolean
          is_near_limit: boolean
          quota_limit: number
          quota_remaining: number
          quota_reset_at: string
          quota_used: number
        }[]
      }
      check_rate_limit: {
        Args: { p_tenant_id: string }
        Returns: {
          allowed: boolean
          current_usage: number
          limit_type: string
          limit_value: number
          reason: string
          reset_at: string
        }[]
      }
      check_seat_availability: {
        Args: { p_seats_needed?: number; p_tenant_id: string }
        Returns: Json
      }
      check_step_completion: {
        Args: { p_step_id: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      check_threshold_alerts: {
        Args: never
        Returns: {
          alert_id: string
          alert_name: string
          current_value: number
          is_triggered: boolean
          metric: string
          threshold: number
        }[]
      }
      clean_expired_sessions: { Args: never; Returns: number }
      clean_expired_tokens: { Args: never; Returns: number }
      cleanup_expired_audit_shares: { Args: never; Returns: number }
      cleanup_expired_backups: { Args: never; Returns: number }
      cleanup_expired_tokens: { Args: never; Returns: number }
      cleanup_old_automation_event_logs: { Args: never; Returns: undefined }
      cleanup_old_invitations: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_old_webhook_deliveries: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_old_webhook_events: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_webhook_logs: { Args: never; Returns: number }
      compare_automation_test_runs: {
        Args: { p_test_run_1: string; p_test_run_2: string }
        Returns: Json
      }
      copy_default_onboarding_config: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      count_tenant_locations: {
        Args: { p_active_only?: boolean; p_tenant_id: string }
        Returns: number
      }
      count_user_memberships: { Args: { p_user_id: string }; Returns: number }
      create_audit_export_request: {
        Args: {
          p_actions?: string[]
          p_categories?: string[]
          p_compliance_tags?: string[]
          p_date_from?: string
          p_date_to?: string
          p_export_format: string
          p_requested_by: string
          p_requested_reason?: string
          p_search_query?: string
          p_severities?: string[]
          p_tenant_id: string
          p_user_ids?: string[]
        }
        Returns: Json
      }
      create_backup: {
        Args: {
          p_backup_type?: string
          p_requested_by?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_bulk_invites: {
        Args: {
          p_auto_resolve_collisions?: boolean
          p_batch_mode?: string
          p_invited_by_user_id: string
          p_invites: Json
          p_tenant_id: string
        }
        Returns: Json
      }
      create_dsr_request: {
        Args: {
          p_request_details?: string
          p_request_type: string
          p_requester_email: string
          p_requester_name?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_join_request: {
        Args: {
          p_message?: string
          p_requested_role?: string
          p_requester_email: string
          p_requester_name?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_webhook_delivery: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload: Json
          p_tenant_id: string
        }
        Returns: string
      }
      current_role_name: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      decrement_active_seats: {
        Args: { p_count?: number; p_tenant_id: string }
        Returns: Json
      }
      disable_feature_for_tenant: {
        Args: { flag_key: string; tenant_uuid: string }
        Returns: boolean
      }
      enable_feature_for_tenant: {
        Args: { flag_key: string; tenant_uuid: string }
        Returns: boolean
      }
      enforce_quota_and_increment: {
        Args: { p_amount?: number; p_feature_code: string }
        Returns: undefined
      }
      erase_contact_pii: {
        Args: {
          p_contact_id: string
          p_dsr_id?: string
          p_erased_by_user_id?: string
          p_legal_basis?: string
        }
        Returns: string
      }
      expire_invitation: { Args: { p_invite_id: string }; Returns: boolean }
      expire_old_join_requests: { Args: never; Returns: number }
      expire_organization: { Args: { p_tenant_id: string }; Returns: boolean }
      expire_pending_invitations: { Args: never; Returns: number }
      expire_unvalidated_orgs: { Args: never; Returns: number }
      export_contact_data: { Args: { p_contact_id: string }; Returns: Json }
      extend_invitation_expiry: {
        Args: { p_additional_days?: number; p_invite_id: string }
        Returns: Json
      }
      filter_audit_logs: {
        Args: {
          p_actions?: string[]
          p_categories?: string[]
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_severities?: string[]
          p_tenant_id: string
          p_user_ids?: string[]
        }
        Returns: {
          action: string
          category: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json
          old_values: Json
          resource_id: string
          resource_type: string
          severity: string
          tags: string[]
          tenant_id: string
          user_agent: string
          user_id: string
        }[]
      }
      find_duplicate_contacts: {
        Args: {
          p_email?: string
          p_exclude_contact_id?: string
          p_phone?: string
          p_tenant_id: string
        }
        Returns: {
          contact_id: string
          created_at: string
          full_name: string
          match_reason: string
          primary_email: string
          primary_phone: string
        }[]
      }
      generate_audit_csv: {
        Args: {
          p_actions?: string[]
          p_categories?: string[]
          p_date_from?: string
          p_date_to?: string
          p_search_query?: string
          p_severities?: string[]
          p_tenant_id: string
          p_user_ids?: string[]
        }
        Returns: string
      }
      generate_audit_json: {
        Args: {
          p_actions?: string[]
          p_categories?: string[]
          p_date_from?: string
          p_date_to?: string
          p_search_query?: string
          p_severities?: string[]
          p_tenant_id: string
          p_user_ids?: string[]
        }
        Returns: Json
      }
      generate_gdpr_export_for_contact: {
        Args: { p_contact_id: string; p_tenant_id: string }
        Returns: Json
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_verification_token: {
        Args: { p_email: string; p_user_id: string }
        Returns: string
      }
      generate_webhook_signature: {
        Args: { p_payload: string; p_secret_key: string }
        Returns: string
      }
      get_accessible_tenants: { Args: never; Returns: string[] }
      get_active_org_id: { Args: never; Returns: string }
      get_admin_tenants: {
        Args: { p_user_id: string }
        Returns: {
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_audit_export_status: { Args: { p_request_id: string }; Returns: Json }
      get_audit_statistics: {
        Args: { p_days?: number; p_tenant_id: string }
        Returns: Json
      }
      get_automation_stats_by_category: {
        Args: { p_tenant_id: string }
        Returns: {
          active_automations: number
          category: string
          success_rate: number
          total_automations: number
          total_runs: number
        }[]
      }
      get_automation_test_history: {
        Args: { p_automation_id: string; p_limit?: number }
        Returns: {
          created_at: string
          execution_time_ms: number
          id: string
          preview_messages: Json
          success: boolean
          test_type: string
        }[]
      }
      get_automation_triggers_by_category: {
        Args: { p_category?: string }
        Returns: {
          category: string
          description: string
          display_name: string
          icon: string
          optional_fields: Json
          required_fields: Json
          trigger_type: string
        }[]
      }
      get_automations_by_category: {
        Args: { p_category?: string; p_status?: string; p_tenant_id: string }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          status: string
          successful_runs: number
          total_runs: number
          trigger_type: string
        }[]
      }
      get_contact_active_journeys: {
        Args: { contact_id_param: string }
        Returns: number
      }
      get_conversion_funnel: {
        Args: {
          end_date?: string
          start_date?: string
          tenant_id_param: string
        }
        Returns: {
          contact_to_deal_rate: number
          contacts_with_deals: number
          deal_win_rate: number
          deals_created: number
          deals_won: number
          overall_conversion_rate: number
          total_contacts: number
        }[]
      }
      get_current_user_tenant_id: { Args: never; Returns: string }
      get_invite_metrics: {
        Args: { p_days?: number; p_tenant_id: string }
        Returns: Json
      }
      get_journey_completion_rate: {
        Args: { journey_id_param: string }
        Returns: number
      }
      get_onboarding_config: {
        Args: { p_account_type: string; p_tenant_id: string }
        Returns: {
          fields: Json
          is_skippable: boolean
          step_category: string
          step_description: string
          step_icon: string
          step_id: string
          step_name: string
          step_order: number
        }[]
      }
      get_or_create_column_preferences: {
        Args: { p_default_columns: Json; p_page: string; p_user_id: string }
        Returns: Json
      }
      get_or_create_practice_branding: {
        Args: { p_practice_id: string }
        Returns: {
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          practice_id: string
          primary_color: string
          secondary_color: string
          tagline: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "practice_branding"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_unsorted_pipeline: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_pending_interactions_count: {
        Args: { tenant_id_param: string }
        Returns: number
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_primary_location: { Args: { p_tenant_id: string }; Returns: string }
      get_recent_automation_events: {
        Args: { p_event_type?: string; p_limit?: number; p_tenant_id: string }
        Returns: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          triggered_automation_ids: string[]
        }[]
      }
      get_setting_value: {
        Args: {
          p_location_id?: string
          p_setting_key: string
          p_tenant_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_tenant_locations: {
        Args: { p_active_only?: boolean; p_tenant_id: string }
        Returns: {
          address: string
          city: string
          code: string
          display_name: string
          is_active: boolean
          is_primary: boolean
          location_id: string
          name: string
        }[]
      }
      get_tenant_plan_tier: { Args: { p_tenant_id: string }; Returns: string }
      get_treatment_tags_from_procedure_codes: {
        Args: {
          p_location_id?: string
          p_procedure_codes: string[]
          p_tenant_id: string
        }
        Returns: {
          mapping_priority: number
          procedure_codes_matched: string[]
          treatment_tag_id: string
          treatment_tag_name: string
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_accessible_locations: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          is_primary: boolean
          name: string
          tenant_id: string
        }[]
      }
      get_user_context: { Args: { p_user_id: string }; Returns: Json }
      get_user_dental_groups: {
        Args: { user_id: string }
        Returns: {
          group_id: string
          group_name: string
          location_count: number
          total_users: number
        }[]
      }
      get_user_entitlements: {
        Args: never
        Returns: {
          expires_at: string
          feature_code: string
          feature_name: string
          is_enabled: boolean
          quota_limit: number
          quota_used: number
        }[]
      }
      get_user_location_scope: {
        Args: { p_location_id: string; p_tenant_id: string; p_user_id: string }
        Returns: string
      }
      get_user_locations: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: {
          base_role: Database["public"]["Enums"]["membership_role"]
          effective_role: Database["public"]["Enums"]["membership_role"]
          is_active: boolean
          location_id: string
          location_name: string
          scope: string
        }[]
      }
      get_user_locations_in_org: {
        Args: { target_org_id: string }
        Returns: string[]
      }
      get_user_memberships: {
        Args: { p_user_id: string }
        Returns: {
          joined_at: string
          membership_id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      get_user_org_preferences: { Args: { p_user_id: string }; Returns: Json }
      get_user_permissions:
        | {
            Args: { p_user_id: string }
            Returns: {
              category: string
              description: string
              label: string
              permission_key: string
            }[]
          }
        | {
            Args: { p_tenant_id: string; p_user_id: string }
            Returns: {
              granted_via: string
              permission_code: string
              permission_module: string
              permission_name: string
            }[]
          }
      get_user_role_at_location: {
        Args: { p_location_id: string; p_tenant_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["membership_role"]
      }
      get_user_role_in_org: { Args: { target_org_id: string }; Returns: string }
      get_user_role_in_tenant: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["membership_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      grant_location_access: {
        Args: {
          p_granted_by: string
          p_notes?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      has_entitlement: { Args: { feature_key: string }; Returns: boolean }
      has_permission: { Args: { perm: string }; Returns: boolean }
      has_role: { Args: { role_name: string }; Returns: boolean }
      increment_active_seats: {
        Args: { p_count?: number; p_tenant_id: string }
        Returns: Json
      }
      increment_form_submissions: {
        Args: { form_id: string }
        Returns: undefined
      }
      increment_form_views: { Args: { form_id: string }; Returns: undefined }
      increment_rate_limit:
        | { Args: { p_tenant_id: string }; Returns: undefined }
        | {
            Args: {
              p_integration_type: string
              p_limit: number
              p_tenant_id: string
              p_window_duration_ms: number
            }
            Returns: Json
          }
      initialize_tenant_routing_settings: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      integration_load_credentials: {
        Args: { p_encryption_key: string; p_tenant_id: string }
        Returns: Json
      }
      integration_store_credentials: {
        Args: {
          p_encryption_key: string
          p_plain_credentials: Json
          p_tenant_id: string
          p_updated_by?: string
        }
        Returns: undefined
      }
      is_active_admin_for_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      is_active_owner_for_location: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_feature_enabled: {
        Args: { p_feature_key: string; p_tenant_id: string }
        Returns: boolean
      }
      is_marketing_enabled: { Args: { p_tenant_id: string }; Returns: boolean }
      is_multi_location_tenant: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      is_multi_location_user: { Args: { user_id: string }; Returns: boolean }
      is_not_deleted: { Args: { row_deleted_at: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_member_of_tenant: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      is_webhook_processed: {
        Args: {
          p_external_id: string
          p_integration_type: string
          p_payload_hash: string
        }
        Returns: boolean
      }
      log_audit_event:
        | {
            Args: {
              p_action: string
              p_changes?: Json
              p_resource_id: string
              p_resource_type: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_action: string
              p_metadata?: Json
              p_new_values?: Json
              p_old_values?: Json
              p_resource_id?: string
              p_resource_type: string
              p_tenant_id: string
              p_user_id: string
            }
            Returns: string
          }
      log_data_access: {
        Args: {
          p_access_type?: string
          p_record_count?: number
          p_record_id?: string
          p_table: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { p_notification_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_webhook_processed: {
        Args: {
          p_error_message?: string
          p_event_id: string
          p_result?: Json
          p_status: string
        }
        Returns: undefined
      }
      merge_contacts: {
        Args: {
          p_merged_by_user_id?: string
          p_source_contact_id: string
          p_target_contact_id: string
        }
        Returns: Json
      }
      normalize_email: { Args: { p_email: string }; Returns: string }
      normalize_phone: {
        Args: { p_default_country?: string; p_phone: string }
        Returns: string
      }
      org_days_until_expiry: { Args: { p_tenant_id: string }; Returns: number }
      org_is_restricted: { Args: { p_tenant_id: string }; Returns: boolean }
      org_needs_validation: { Args: { p_tenant_id: string }; Returns: boolean }
      process_audit_export_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      process_email_verification_reminders: { Args: never; Returns: number }
      process_org_validation_reminders: { Args: never; Returns: number }
      process_webhook_deliveries: {
        Args: never
        Returns: {
          delivery_id: string
          endpoint_url: string
          event_type: string
          status: string
        }[]
      }
      recompute_sales_script_version_stats: {
        Args: { p_script_version_id: string }
        Returns: undefined
      }
      record_org_visit: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: undefined
      }
      refresh_deal_analytics: { Args: never; Returns: undefined }
      register_webhook_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload: Json
          p_signature: string
          p_source: string
          p_tenant_id: string
        }
        Returns: {
          event_record: Database["public"]["Tables"]["webhook_events"]["Row"]
          is_new: boolean
        }[]
      }
      reject_join_request: {
        Args: { p_reason?: string; p_rejected_by: string; p_request_id: string }
        Returns: boolean
      }
      release_automation_lease: {
        Args: { p_lease_key: string; p_worker_id: string }
        Returns: boolean
      }
      replay_automation_event: {
        Args: { p_event_log_id: string }
        Returns: string
      }
      replay_from_dlq: {
        Args: { p_dlq_id: string; p_user_id?: string }
        Returns: string
      }
      request_restore: {
        Args: {
          p_backup_id: string
          p_requested_by?: string
          p_restore_type?: string
          p_target_tables?: string[]
          p_tenant_id: string
        }
        Returns: string
      }
      resend_invitation: {
        Args: { p_invite_id: string; p_resent_by: string }
        Returns: Json
      }
      resend_verification_email: {
        Args: { p_user_id: string }
        Returns: string
      }
      reset_automation_rate_limits: { Args: never; Returns: undefined }
      resume_waiting_journeys: { Args: never; Returns: number }
      revoke_location_access: {
        Args: {
          p_reason?: string
          p_revoked_by: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      rollback_form_to_version: {
        Args: { p_form_id: string; p_version_number: number }
        Returns: boolean
      }
      rollback_setting: {
        Args: {
          p_rollback_reason: string
          p_rolled_back_by: string
          p_version_id: string
        }
        Returns: boolean
      }
      save_setting: {
        Args: {
          p_change_reason?: string
          p_changed_by: string
          p_location_id?: string
          p_new_value: Json
          p_scope?: string
          p_setting_key: string
          p_tenant_id: string
        }
        Returns: string
      }
      seed_default_booking_widget: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      seed_default_treatment_offerings: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      send_invite_expiry_reminders: { Args: never; Returns: number }
      send_org_validation_reminder: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      send_to_automation_dlq: {
        Args: {
          p_error_details?: Json
          p_error_message: string
          p_execution_log_id: string
        }
        Returns: string
      }
      set_active_tenant:
        | { Args: { p_tenant_id: string }; Returns: boolean }
        | { Args: { p_tenant_id: string; p_user_id: string }; Returns: boolean }
      set_default_org: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      should_send_notification: {
        Args: { p_channel: string; p_event_key: string; p_user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      snooze_notification: {
        Args: { p_notification_id: string; p_until: string; p_user_id: string }
        Returns: boolean
      }
      start_grace_period: {
        Args: { p_days?: number; p_tenant_id: string }
        Returns: boolean
      }
      switch_location_context: {
        Args: { p_location_id: string; p_remember?: boolean; p_user_id: string }
        Returns: Json
      }
      switch_tenant_context: {
        Args: {
          p_metadata?: Json
          p_session_id?: string
          p_switch_method?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: Json
      }
      sync_all_subscription_seat_counts: {
        Args: never
        Returns: {
          actual_seats: number
          difference: number
          recorded_seats: number
          synced: boolean
          tenant_id: string
        }[]
      }
      sync_subscription_seat_count: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      toggle_org_pin: {
        Args: { p_pin?: boolean; p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      unmerge_contact: { Args: { p_contact_id: string }; Returns: boolean }
      update_onboarding_progress: {
        Args: {
          p_field_data: Json
          p_is_complete?: boolean
          p_step_id: string
          p_user_id: string
        }
        Returns: Json
      }
      update_org_nickname: {
        Args: { p_nickname: string; p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      update_tenant_plan: {
        Args: { p_plan_name: string; p_tenant_id: string }
        Returns: undefined
      }
      update_webhook_delivery_status: {
        Args: {
          p_delivery_id: string
          p_error_message?: string
          p_http_status_code?: number
          p_response_body?: string
          p_status: string
        }
        Returns: undefined
      }
      user_email_verified: { Args: { p_user_id: string }; Returns: boolean }
      user_has_location_access: {
        Args: { p_location_id: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_location_access_rls: {
        Args: { p_location_id: string; p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_org_access: { Args: { target_org_id: string }; Returns: boolean }
      user_has_permission:
        | {
            Args: { p_permission_key: string; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_permission_code: string
              p_tenant_id: string
              p_user_id: string
            }
            Returns: boolean
          }
      user_has_role: { Args: { required_roles: string[] }; Returns: boolean }
      validate_invite_code: {
        Args: { p_code: string; p_email: string }
        Returns: {
          assigned_role: string
          error_message: string
          expires_at: string
          invite_id: string
          invited_by_name: string
          is_valid: boolean
          tenant_id: string
          tenant_name: string
        }[]
      }
      validate_invite_request: {
        Args: {
          p_email: string
          p_invited_by_user_id: string
          p_role: string
          p_tenant_id: string
        }
        Returns: Json
      }
      validate_organization: {
        Args: { p_tenant_id: string; p_validated_by?: string }
        Returns: boolean
      }
      validate_same_tenant: {
        Args: {
          p_expected_tenant_id: string
          p_record_id: string
          p_table_name: string
        }
        Returns: boolean
      }
      verify_email_with_token: { Args: { p_token: string }; Returns: boolean }
      verify_rls_dual_path: {
        Args: never
        Returns: {
          has_rls_enabled: boolean
          policy_count: number
          table_name: string
          uses_dual_path: boolean
        }[]
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      invite_status: "pending" | "accepted" | "expired" | "cancelled"
      membership_role: "owner" | "admin" | "manager" | "staff" | "viewer"
      membership_status: "active" | "inactive" | "suspended"
      org_validation_event_type:
        | "CREATED"
        | "VALIDATED"
        | "REMINDER_SENT"
        | "GRACE_PERIOD_ENTERED"
        | "EXPIRED"
        | "SUSPENDED"
        | "REACTIVATED"
      source_channel_enum:
        | "form_embedded"
        | "form_hosted_landing"
        | "booking_widget_calendar"
        | "booking_widget_webform"
        | "booking_widget_whatsapp"
        | "meta_lead_ad"
        | "meta_messenger_ad"
        | "google_lead_form"
        | "google_search_ad"
        | "google_display_ad"
        | "whatsapp_website_button"
        | "whatsapp_meta_ad"
        | "whatsapp_qr"
        | "instagram_dm"
        | "fb_messenger"
        | "sms_inbound"
        | "phone_call_inbound"
        | "phone_call_voicemail"
        | "online_booking_completed"
        | "online_booking_abandoned"
        | "manual_entry"
        | "csv_import"
        | "api_partner"
        | "referral"
        | "other"
        | "whatsapp_inbound"
      validation_status_type:
        | "UNVALIDATED"
        | "VALIDATED"
        | "GRACE_PERIOD"
        | "EXPIRED"
        | "SUSPENDED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      invite_status: ["pending", "accepted", "expired", "cancelled"],
      membership_role: ["owner", "admin", "manager", "staff", "viewer"],
      membership_status: ["active", "inactive", "suspended"],
      org_validation_event_type: [
        "CREATED",
        "VALIDATED",
        "REMINDER_SENT",
        "GRACE_PERIOD_ENTERED",
        "EXPIRED",
        "SUSPENDED",
        "REACTIVATED",
      ],
      source_channel_enum: [
        "form_embedded",
        "form_hosted_landing",
        "booking_widget_calendar",
        "booking_widget_webform",
        "booking_widget_whatsapp",
        "meta_lead_ad",
        "meta_messenger_ad",
        "google_lead_form",
        "google_search_ad",
        "google_display_ad",
        "whatsapp_website_button",
        "whatsapp_meta_ad",
        "whatsapp_qr",
        "instagram_dm",
        "fb_messenger",
        "sms_inbound",
        "phone_call_inbound",
        "phone_call_voicemail",
        "online_booking_completed",
        "online_booking_abandoned",
        "manual_entry",
        "csv_import",
        "api_partner",
        "referral",
        "other",
        "whatsapp_inbound",
      ],
      validation_status_type: [
        "UNVALIDATED",
        "VALIDATED",
        "GRACE_PERIOD",
        "EXPIRED",
        "SUSPENDED",
      ],
    },
  },
} as const
