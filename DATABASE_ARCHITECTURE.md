# 🏗️ **DentalCRM Database Architecture**

## 📊 **Entity Relationship Diagram**

```mermaid
erDiagram
    %% Core System Tables
    TENANTS {
        uuid id PK
        text name
        text timezone
        timestamptz created_at
    }
    
    APP_USERS {
        uuid id PK "FK: auth.users(id)"
        uuid tenant_id FK
        text full_name
        text role "owner|manager|staff"
        timestamptz created_at
    }
    
    %% Contact Management
    CONTACTS {
        uuid id PK
        uuid tenant_id FK
        text full_name
        text primary_phone
        text primary_email
        text source
        text[] tags
        uuid lead_source_id FK
        integer lead_score "0-100"
        timestamptz created_at
        timestamptz updated_at
    }
    
    %% Pipeline Management
    PIPELINES {
        uuid id PK
        uuid tenant_id FK
        text name
        timestamptz created_at
    }
    
    PIPELINE_STAGES {
        uuid id PK
        uuid tenant_id FK
        uuid pipeline_id FK
        text name
        integer position
        timestamptz created_at
    }
    
    %% Deal Management (Enhanced)
    DEALS {
        uuid id PK
        uuid tenant_id FK
        uuid contact_id FK
        uuid pipeline_id FK
        uuid stage_id FK
        uuid dental_service_id FK
        uuid lead_intake_id FK
        text title
        integer value_estimate_cents
        text currency
        text[] treatment_tags
        uuid owner_user_id FK
        text source
        
        %% Enhanced Deal Fields
        varchar deal_type "new_lead|existing_patient|pms_import|referral"
        bigint deposit_amount_cents
        varchar payment_plan "full_payment|installments|insurance|finance"
        varchar treatment_category "preventive|restorative|cosmetic|orthodontic|surgical|emergency"
        varchar treatment_urgency "low|medium|high|emergency"
        integer estimated_duration_weeks
        varchar pms_treatment_plan_id
        varchar pms_patient_id
        varchar pms_sync_status "not_synced|synced|sync_pending|sync_failed"
        boolean consultation_scheduled
        timestamptz consultation_date
        timestamptz treatment_start_date
        timestamptz treatment_end_date
        boolean insurance_coverage
        varchar insurance_provider
        varchar insurance_authorization_number
        integer insurance_coverage_percentage
        boolean follow_up_required
        timestamptz next_follow_up_date
        text internal_notes
        text patient_concerns
        integer lead_score "0-100"
        integer conversion_probability "0-100"
        
        timestamptz last_activity_at
        timestamptz created_at
        timestamptz updated_at
    }
    
    %% Task Management
    TASKS {
        uuid id PK
        uuid tenant_id FK
        text title
        text description
        text status "open|in_progress|done|cancelled"
        text priority "low|normal|high|urgent"
        uuid assignee_user_id FK
        timestamptz due_at
        uuid contact_id FK
        uuid deal_id FK
        boolean auto_created
        timestamptz created_at
        timestamptz updated_at
    }
    
    %% Activity Tracking
    ACTIVITIES {
        uuid id PK
        uuid tenant_id FK
        text type "call|email|whatsapp|note"
        text direction "inbound|outbound"
        uuid contact_id FK
        uuid deal_id FK
        timestamptz occurred_at
        uuid agent_user_id FK
        text subject
        text snippet
        jsonb raw
        timestamptz created_at
    }
    
    %% File Management
    FILES {
        uuid id PK
        uuid tenant_id FK
        text kind "audio|attachment|image|other"
        text storage_path
        text mime_type
        bigint size_bytes
        text file_name
        text original_name
        timestamptz created_at
    }
    
    ACTIVITY_FILES {
        uuid activity_id PK,FK
        uuid file_id PK,FK
    }
    
    %% AI Processing
    AI_ARTIFACTS {
        uuid id PK
        uuid tenant_id FK
        uuid activity_id FK
        text kind "transcript|summary|intent|treatments|actions"
        jsonb data
        numeric confidence "0.0-1.0"
        timestamptz created_at
    }
    
    %% Lead Management System
    DENTAL_SERVICES {
        uuid id PK
        uuid tenant_id FK
        text name
        text category "treatment|preventive|cosmetic|emergency"
        text description
        integer average_value_cents
        integer typical_duration_days
        text[] keywords
        text color
        boolean active
        timestamptz created_at
    }
    
    LEAD_SOURCES {
        uuid id PK
        uuid tenant_id FK
        text name
        text source_type "facebook_ads|instagram|google_ads|whatsapp|website|referral|walk_in|phone|email|other"
        jsonb integration_config
        jsonb auto_categorization_rules
        boolean active
        timestamptz created_at
    }
    
    LEAD_INTAKES {
        uuid id PK
        uuid tenant_id FK
        uuid lead_source_id FK
        uuid contact_id FK
        uuid deal_id FK
        uuid dental_service_id FK
        text original_message
        integer lead_score "0-100"
        text qualification_status "unqualified|qualified|disqualified"
        boolean auto_categorized
        decimal categorization_confidence
        uuid[] suggested_services
        text external_id
        jsonb raw_data
        timestamptz processed_at
        timestamptz created_at
    }
    
    %% Audit System
    AUDITS {
        bigserial id PK
        uuid tenant_id FK
        uuid user_id FK
        text entity_type
        uuid entity_id
        text action
        jsonb before
        jsonb after
        timestamptz created_at
    }

    %% Relationships
    TENANTS ||--o{ APP_USERS : "has"
    TENANTS ||--o{ CONTACTS : "owns"
    TENANTS ||--o{ PIPELINES : "owns"
    TENANTS ||--o{ DEALS : "owns"
    TENANTS ||--o{ TASKS : "owns"
    TENANTS ||--o{ ACTIVITIES : "owns"
    TENANTS ||--o{ FILES : "owns"
    TENANTS ||--o{ AI_ARTIFACTS : "owns"
    TENANTS ||--o{ DENTAL_SERVICES : "owns"
    TENANTS ||--o{ LEAD_SOURCES : "owns"
    TENANTS ||--o{ LEAD_INTAKES : "owns"
    TENANTS ||--o{ AUDITS : "owns"
    
    PIPELINES ||--o{ PIPELINE_STAGES : "contains"
    PIPELINES ||--o{ DEALS : "manages"
    PIPELINE_STAGES ||--o{ DEALS : "stages"
    
    CONTACTS ||--o{ DEALS : "generates"
    CONTACTS ||--o{ TASKS : "assigned"
    CONTACTS ||--o{ ACTIVITIES : "involved"
    CONTACTS ||--o{ LEAD_INTAKES : "creates"
    
    DEALS ||--o{ TASKS : "generates"
    DEALS ||--o{ ACTIVITIES : "tracks"
    
    APP_USERS ||--o{ DEALS : "owns"
    APP_USERS ||--o{ TASKS : "assigned"
    APP_USERS ||--o{ ACTIVITIES : "handles"
    APP_USERS ||--o{ AUDITS : "performs"
    
    ACTIVITIES ||--o{ ACTIVITY_FILES : "attachments"
    FILES ||--o{ ACTIVITY_FILES : "linked"
    ACTIVITIES ||--o{ AI_ARTIFACTS : "analyzed"
    
    DENTAL_SERVICES ||--o{ DEALS : "categorizes"
    DENTAL_SERVICES ||--o{ LEAD_INTAKES : "matches"
    LEAD_SOURCES ||--o{ CONTACTS : "originates"
    LEAD_SOURCES ||--o{ LEAD_INTAKES : "captures"
    LEAD_INTAKES ||--o{ DEALS : "converts"
```

## 🎯 **Key Architecture Features**

### 🏢 **Multi-Tenancy**
- **Tenant Isolation**: Every table includes `tenant_id` for complete data separation
- **Scalable**: Supports multiple dental practices on single database
- **Secure**: Row-level security (RLS) ready for production

### 📞 **Contact & Deal Management**
- **360° Contact View**: Links contacts to deals, tasks, and activities
- **Pipeline Management**: Flexible stage-based deal progression
- **Enhanced Deal Tracking**: Treatment categories, PMS integration, insurance handling

### 🤖 **AI-Powered Insights**
- **Audio Processing**: Stores audio files with automatic transcription
- **Comprehensive Analysis**: AI artifacts for transcript, summary, treatments, actions
- **Smart Task Generation**: Auto-creates follow-up tasks from call analysis

### 📊 **Lead Management System**
- **Multi-Source Capture**: Facebook, Instagram, Google Ads, WhatsApp, website
- **Auto-Categorization**: AI-powered service matching based on keywords
- **Lead Scoring**: 0-100 scoring system for qualification
- **Conversion Tracking**: Full funnel from lead intake to deal closure

### 📁 **File Management**
- **Flexible Storage**: Audio, attachments, images with metadata
- **Activity Linking**: Files attached to specific activities
- **Supabase Storage**: Secure cloud storage with signed URLs

### 📈 **Analytics & Reporting**
- **Lead Pipeline Analytics**: Built-in view for conversion tracking
- **Performance Metrics**: Lead scores, conversion rates, pipeline values
- **Audit Trail**: Complete change tracking for compliance

## 🔧 **Technical Specifications**

### **Database Engine**: PostgreSQL (Supabase)
### **Key Extensions**: 
- `uuid-ossp` for UUID generation
- JSONB for flexible data storage
- Full-text search capabilities

### **Performance Optimizations**:
- Strategic indexes on high-query columns
- Optimized for tenant-based queries
- Efficient relationship traversal

### **Data Types**:
- **UUIDs**: Primary keys and foreign keys
- **JSONB**: Flexible metadata and configuration storage
- **Arrays**: Tags, keywords, suggested services
- **Timestamps**: Full timezone support
- **Constraints**: Data integrity and validation

This architecture supports a production-ready dental CRM with sophisticated lead management, AI-powered call analysis, and comprehensive patient/deal tracking! 🦷✨

