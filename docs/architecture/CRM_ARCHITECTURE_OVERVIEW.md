# CRM Architecture Overview

## Vision and System Context
Dental CRM positions dental receptionists as treatment coordinators by surrounding them with the same patient intelligence that elite sales teams enjoy. The system is built as a multi-tenant, location-aware Next.js platform with Supabase as its operational store and automation engine. Every layer—from API guards to AI assistants—is designed to surface patient context quickly while protecting PHI and tenant boundaries.

## Tech Stack & Runtime
- Next.js 14 App Router running on Node 20 with React 19 drives the web client and API routes.
- Supabase (Postgres + auth + storage) is the system of record, with Supabase Edge Functions handling heavy workloads like transcription.
- First-party service abstractions integrate OpenAI, Twilio, Resend, Stripe, and analytics tooling.

```6:114:package.json
  "scripts": {
    "dev": "next dev",
    "build": "NEXT_DISABLE_SWC_WASM=1 next build",
    "start": "next start -p ${PORT:-3000}",
    // ... existing code ...
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.1",
    "next": "^14.2.18",
    "react": "19.1.0",
    "openai": "^6.3.0",
    "twilio": "^5.10.3",
    "stripe": "^19.1.0"
    // ... existing code ...
```

## Frontend Composition
- Uses the App Router with authenticated layouts and guard components for tenant gating.
- Dashboard and workspace pages stream Supabase data and coordinate keyboard shortcuts, real-time updates, and AI widgets.

```5:142:src/app/dashboard/page.tsx
export default function DashboardRedesigned() {
  // ... existing code ...
  useDashboardRealtime(appUser?.active_tenant_id || appUser?.tenant_id, () => loadData(), true)
  useKeyboardShortcuts({
    onCreateContact: () => {
      setCurrentAction('create this contact')
      requireOrg(() => setShowCreateContact(true))()
    },
    // ... existing code ...
```

## API & Server Layer
- Route handlers wrap Supabase queries with tenant/location filters, schema validation, and idempotency.
- RLS-aware endpoints translate receptionist actions into audit-ready SQL operations.

```36:177:src/app/api/contacts/route.ts
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ... existing code ...
  dbQuery = dbQuery.eq('tenant_id', appUser.active_tenant_id)
  if (!membership.all_locations) {
    const { data: accessibleLocations } = await supabase.rpc(
      'get_user_accessible_locations',
      { p_user_id: user.id, p_tenant_id: appUser.active_tenant_id }
    )
    dbQuery = dbQuery.in('location_id', locationIds)
  }
  // ... existing code ...
}
```

- Edge-facing handlers proxy to Supabase functions for long-running tasks.

```4:72:src/app/api/process-call-activity/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  // ... existing code ...
  const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-call-activity`
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ activity_id }),
  })
```

## Domain Model & Storage
- `types/database.ts` mirrors Supabase tables, clarifying relationships (contact ↔ deal ↔ activities) and AI artifacts.
- Multi-location design ensures every entity carries tenant and optional location IDs.

```154:205:src/types/database.ts
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
export interface Deal {
  id: string;
  tenant_id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  value_estimate_cents: number;
  treatment_tags: string[];
  owner_user_id?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  marketing_source_type?: string;
  marketing_touchpoints?: any[];
}
```

- Locations, feature flags, and helper functions are codified to support multi-clinic rollouts.

```48:150:supabase/migrations/20251025_003a_locations_table.sql
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  // ... existing code ...
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_tenant_primary_unique
  ON locations(tenant_id) WHERE is_primary = true;
```

## Eventing & Automation Spine
- A unified event bus normalizes CRM, marketing, analytics, and AI signals so automation listeners can react deterministically.

```20:205:src/lib/events-unified.ts
export interface EventMap {
  'DEAL.CREATED': {
    dealId: string
    contactId: string
    tenantId: string
    pipelineId: string
    stageId: string
    // ... existing code ...
  }
  'TASK.OVERDUE': {
    taskId: string
    tenantId: string
    hoursOverdue: number
  }
  'AI.SUGGESTION_GENERATED': {
    suggestionId: string
    suggestionType: string
    tenantId: string
    priority: string
  }
  // ... existing code ...
}
```

## Authentication & Authorization
- Client provider syncs Supabase sessions, fetches enriched `app_users` rows, and exposes sign-in/out helpers.
- Middleware applies tenant guards before hitting the App Router.
- Permission enforcer checks role-based grants before mutating protected resources.

```27:186:src/lib/auth.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  // ... existing code ...
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    const appUserData = await fetchAppUser(session.user.id, session.user)
    setAppUser(appUserData)
    void syncSessionWithServer('INITIAL_SESSION', session)
  }
  // ... existing code ...
}
```

```32:61:src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, supabaseResponse } = createMiddlewareClient(request)
  // ... existing code ...
  if (!membership && ORG_REQUIRED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/organization-setup', request.url))
  }
  return supabaseResponse
}
```

```20:118:src/lib/permission-enforcer.ts
export async function hasPermission(
  context: UserPermissionContext,
  permissionKey: string
): Promise<boolean> {
  if (!context.roleId) {
    return permissionKey.includes('.view_own') || permissionKey.includes('.edit_own_profile')
  }
  const supabase = createClient()
  // ... existing code ...
  const { data: permission } = await supabase
    .from('role_permissions')
    .select('granted')
    .eq('role_id', context.roleId)
    .eq('permission_key', permissionKey)
    .single()
  return permission?.granted || false
}
```

## Intelligence Fabric
- AI context builder composes patient, deal, activity, task, and preference state for OpenAI prompts.
- Conversation analyzer distills urgency, sentiment, and treatment intent.
- Proactive monitor emits automation events when deals age or high-value opportunities emerge.

```93:271:src/lib/ai-context-builder.ts
export async function buildDealContext(dealId: string, tenantId: string): Promise<AIContext> {
  const supabase = createServiceClient()
  const { data: deal } = await supabase
    .from('deals')
    .select(`
      *,
      contact:contacts(*),
      stage:pipeline_stages(*),
      pipeline:pipelines(*),
      owner:app_users(*)
    `)
    .eq('id', dealId)
    .single()
  // ... existing code ...
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
      lifetimeValue: lifetimeValue / 100,
      totalDeals: deals?.length || 0
    },
    activities: activities?.map(activity => ({
      type: activity.type,
      snippet: activity.snippet || '',
      aiAnalysis
    })) || [],
    tasks: tasks?.map(task => ({
      title: task.title,
      priority: task.priority
    })) || [],
    userPreferences: await loadUserPreferences(tenantId)
  }
}
```

```19:366:src/lib/conversation-analyzer.ts
export async function analyzeConversations(
  activities: Activity[],
  tenantId: string,
  aiArtifacts?: AIArtifact[]
): Promise<ConversationAnalysis> {
  const text = extractActivityText(activity, aiArtifacts)
  const keywords = analyzeText(text)
  allKeywords.urgency.push(...keywords.urgencyKeywords)
  allKeywords.positive.push(...keywords.positiveKeywords)
  // ... existing code ...
  const sentimentScore = totalSentiment === 0 ? 0 : (positiveCount - negativeCount) / totalSentiment
  const { score: engagementScore, daysSinceLastActivity } = calculateEngagementScore(activities)
  return {
    treatmentCategories,
    urgencyScore,
    sentimentScore,
    engagementScore,
    recommendedAction,
    lastActivityDate: sortedActivities[0]?.occurred_at,
    daysSinceLastActivity
  }
}
```

```12:128:src/lib/ai-proactive-monitor.ts
export async function monitorDealsForSuggestions(tenantId: string) {
  const { data: deals } = await supabase
    .from('deals')
    .select(`
      *,
      contact:contacts(*),
      stage:pipeline_stages(*),
      pipeline:pipelines(*)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
  // ... existing code ...
  if (daysSince > 7) {
    suggestions.push({
      suggestion_type: 'cold_lead',
      suggestion_text: `Deal "${deal.title}" hasn't been contacted in ${daysSince} days.`,
      priority: daysSince > 14 ? 'urgent' : 'high'
    })
    await events.dealAging({ dealId: deal.id, tenantId, daysSinceLastActivity: daysSince })
  }
}
```

## Integration Layer
- Email via Resend, SMS via Twilio, billing via Stripe, and PMS webhooks normalize third-party data into CRM objects.

```1:120:src/lib/email-service.ts
export class EmailService {
  async send(options: EmailOptions) {
    const client = getResendClient()
    const { data, error } = await client.emails.send({
      from: options.from || this.defaultFrom,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments
    })
  }
}
```

```1:49:src/lib/sms-service.ts
export class SMSService {
  async initialize(accountSid: string, authToken: string, fromNumber: string) {
    this.client = twilio(accountSid, authToken)
    this.fromNumber = fromNumber
  }
  async send(options: SMSOptions) {
    const result = await this.client.messages.create({
      body: options.message,
      from: options.from || this.fromNumber,
      to: options.to
    })
    return { success: true, messageId: result.sid }
  }
}
```

```12:156:src/lib/services/billing-service.ts
export async function getSubscription(tenantId: string): Promise<SubscriptionInfo | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tenant_id,
      status,
      seat_limit,
      active_seats,
      plan:plans (
        id,
        name,
        display_name,
        tier,
        default_seat_limit,
        max_seat_limit
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()
}
```

## Deployment & Operations
- Shell scripts reference Railway as the primary deployment target and guide operators through environment configuration, CLI logins, and builds.

```1:118:deploy-to-railway.sh
echo "🚀 Railway Deployment Script"
# ... existing code ...
railway login
# ... existing code ...
railway up
echo -e "${GREEN}✅ Deployment initiated${NC}"
```

## Patterns & Configuration
- Feature-flag harness gates emerging functionality such as treatment routing and AI suggestions across environments and per-tenant overrides.

```26:188:src/lib/feature-flags.ts
export interface FeatureFlags {
  ENABLE_TREATMENT_ROUTING: boolean
  ENABLE_ROUTING_UI: boolean
  ENABLE_ROUTING_ANALYTICS: boolean
  ENABLE_AUTO_TAG_EXTRACTION: boolean
  // ... existing code ...
}
function getEnvironmentFlags(): FeatureFlags {
  switch (env) {
    case 'development':
      return {
        ENABLE_TREATMENT_ROUTING: true,
        ENABLE_ROUTING_UI: true,
        ENABLE_ROUTING_ANALYTICS: true,
        ENABLE_AUTO_TAG_EXTRACTION: true,
        // ... existing code ...
      }
```

## Summary
By combining a strict tenant-aware Next.js API tier, a normalized Supabase schema, and an event-driven AI automation layer, the platform streams the right patient context to the right receptionist workflow without sacrificing compliance. The architecture keeps sales enablement logic close to the data, allowing dental practices to democratize high-touch treatment coordination while remaining deployable on commodity infrastructure.
