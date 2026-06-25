# Data Capture and Context

## Overview
Patient context is the currency of the CRM; data capture spans web forms, PMS feeds, manual updates, and AI-derived artifacts, all normalized into Supabase tables.

## Digital Front Doors & Form Submissions
The form builder lets marketing teams spin up high-converting landing forms that automatically tag leads and record submission history.

```1:114:src/components/forms/form-builder.tsx
export function FormBuilder() {
  const { forms, loading, deleteForm, duplicateForm, loadForms, createForm } = useMarketingForms()
  const handleSelectTemplate = async (template: any) => {
    const newForm = await createForm({
      name: template.name,
      description: template.description,
      status: 'draft',
      fields_json: template.fields,
      theme: 'light',
      button_text: 'Submit',
      success_message: 'Thank you! We\'ll be in touch soon.',
      redirect_url: '',
      auto_add_tags: [],
      enable_recaptcha: true,
      enable_honeypot: true,
      is_published: false,
      public_url_slug: '',
    })
    if (newForm) {
      toast.success('Form created from template!')
      loadForms()
    }
  }
  const handleViewSubmissions = (form: MarketingForm) => {
    setSelectedForm(form)
    setSubmissionsModalOpen(true)
  }
}
```

## CRM Contact Capture & Enrichment
Contact creation enforces tenant and location scoping, validates inputs, and attaches metadata like source, tags, and idempotency keys.

```196:314:src/app/api/contacts/route.ts
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = await supabase
    .from('app_users')
    .select('active_tenant_id, active_location_id')
    .eq('id', user.id)
    .single()
  const contactData = {
    ...validation.data,
    tenant_id: appUser.active_tenant_id,
    location_id: appUser.active_location_id,
    created_by: user.id,
  }
  if (contactData.email) {
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', appUser.active_tenant_id)
      .eq('email', contactData.email)
      .single()
    if (existing) {
      return NextResponse.json(
        {
          error: 'Duplicate contact',
          message: 'A contact with this email already exists',
          existingId: existing.id
        },
        { status: 409 }
      )
    }
  }
  // ... existing code ...
}
```

## Practice Management System (PMS) Synchronization
Webhook endpoints reconcile patients coming from external PMS systems, linking or creating contacts and mapping external IDs.

```4:132:src/app/api/integrations/pms/webhooks/patient-sync/route.ts
export async function POST(request: NextRequest) {
  const {
    tenant_id,
    integration_id,
    pms_patient_id,
    first_name,
    last_name,
    email,
    phone
  } = await request.json()
  const supabase = createServiceClient()
  const { data: existingMapping } = await supabase
    .from('pms_patient_mappings')
    .select('crm_contact_id')
    .eq('pms_patient_id', pms_patient_id)
    .eq('tenant_id', tenant_id)
    .single()
  if (existingMapping) {
    await supabase
      .from('contacts')
      .update({
        full_name: `${first_name} ${last_name}`,
        primary_email: email,
        primary_phone: phone,
        pms_patient_id,
        pms_provider: 'generic'
      })
      .eq('id', existingMapping.crm_contact_id)
    return NextResponse.json({
      success: true,
      message: 'Contact updated',
      contact_id: existingMapping.crm_contact_id,
      is_new: false
    })
  }
  // ... existing code ...
}
```

## Multi-location Context & Compliance
Location tables enforce tenant isolation and track metadata like timezone, operating hours, and primary location status.

```48:150:supabase/migrations/20251025_003a_locations_table.sql
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'Europe/London' NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_tenant_primary_unique
  ON locations(tenant_id) WHERE is_primary = true;
```

## Activity, Call, and Note Capture
All actions are logged to support audit history and AI training signals.

```42:68:src/lib/activity-tracker.ts
export async function logActivity(
  userId: string,
  tenantId: string,
  entry: ActivityLogEntry
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_activity_log')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        details: entry.details || {},
        created_at: new Date().toISOString()
      })
    if (error) {
      console.error('Error logging activity:', error)
    }
  } catch (error) {
    console.error('Error in logActivity:', error)
  }
}
```

When a receptionist requests transcription or AI analysis, the CRM routes the activity to Supabase Edge Functions and stores the resulting artifacts.

```4:72:src/app/api/process-call-activity/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { activity_id } = await request.json()
  const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-call-activity`
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ activity_id })
  })
  // ... existing code ...
}
```

## AI-Derived Contextual Signals
Analyzed transcripts and activity metadata feed into AI context builder to augment contact records with sentiment, urgency, and recommended actions.

```209:366:src/lib/conversation-analyzer.ts
const keywords = analyzeText(text)
allKeywords.urgency.push(...keywords.urgencyKeywords)
allKeywords.value.push(...keywords.valueKeywords)
const sentimentScore = totalSentiment === 0 ? 0 : (positiveCount - negativeCount) / totalSentiment
let recommendedAction: string | undefined
if (urgencyScore > 70) {
  recommendedAction = 'Call immediately - High urgency detected'
} else if (budgetConcerns) {
  recommendedAction = 'Discuss payment options'
}
// ... existing code ...
return {
  treatmentCategories,
  urgencyScore,
  sentimentScore,
  engagementScore,
  recommendedAction,
  lastActivityDate: sortedActivities[0]?.occurred_at,
  daysSinceLastActivity
}
```

```93:271:src/lib/ai-context-builder.ts
const context: AIContext = {
  contextType: 'deal',
  timestamp: new Date().toISOString(),
  deal: {
    title: deal.title,
    tags: deal.treatment_tags || [],
    intelligence: {
      likelihoodScore,
      healthStatus: likelihoodScore > 70 ? 'good' : likelihoodScore > 40 ? 'fair' : 'poor',
      sentiment,
      urgency: lastContactDays < 3 ? 'high' : 'medium'
    }
  },
  contact: {
    fullName: deal.contact.full_name,
    medicalHistory: deal.contact.medical_history || '',
    dentalHistory: deal.contact.dental_history || ''
  },
  activities: activities?.map(activity => ({
    type: activity.type,
    snippet: activity.snippet || '',
    aiAnalysis
  })) || [],
  tasks: tasks?.map(task => ({
    title: task.title,
    priority: task.priority,
    status: task.status
  })) || [],
  userPreferences: await loadUserPreferences(tenantId)
}
```

## Unified Patient Timeline
The contact view brings captured data together so receptionists can act instantly.

```188:375:src/components/contacts/contact-detail-view.tsx
<div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
  <div className="grid grid-cols-2 gap-4">
    <div>
      <div className="text-xs text-gray-600 mb-1">Total Value</div>
      <div className="text-lg font-bold text-green-700">
        {deals.length > 0
          ? formatCurrency(deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))
          : '£0.00'}
      </div>
    </div>
    <div>
      <div className="text-xs text-gray-600 mb-1">Active Deals</div>
      <div className="text-lg font-bold text-blue-700">
        {deals.filter(deal => !['closed_won', 'closed_lost'].includes(deal.stage?.name?.toLowerCase() || '')).length}
      </div>
    </div>
  </div>
  <div className="mt-3 pt-3 border-t border-green-200/50">
    <div className="flex justify-between text-xs">
      <span className="text-gray-600">Won: {deals.filter(deal => deal.stage?.name?.toLowerCase() === 'closed_won').length}</span>
      <span className="text-gray-600">Lost: {deals.filter(deal => deal.stage?.name?.toLowerCase() === 'closed_lost').length}</span>
      <span className="text-gray-600">Total: {deals.length}</span>
    </div>
  </div>
</div>
```

## Summary
Digital forms, PMS feeds, manual notes, voice transcriptions, and AI analytics all converge into a single, permissioned context object. The CRM ensures that every receptionist sees the full story—including patient preferences, urgency, and financial context—so they can convert inquiries into treatment plans with confidence while honoring compliance requirements.
