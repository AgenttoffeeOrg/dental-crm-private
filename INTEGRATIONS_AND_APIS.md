# Integrations and APIs

## Integration Philosophy
The CRM exposes opinionated APIs that normalize external systems—telephony, email, PMS, payments, AI—into the Supabase domain model while enforcing tenant isolation.

## Practice Management Systems (PMS)
Webhook endpoints receive patient, treatment, and payment events, then hydrate CRM contacts and mappings.

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

```17:198:src/lib/integrations/pms/providers/generic-adapter.ts
export class GenericPMSAdapter extends PMSProviderBase {
  async processWebhook(eventType: string, payload: any): Promise<{ success: boolean; message: string }> {
    switch (eventType) {
      case 'patient.created':
      case 'patient.updated':
        return await this.handlePatientWebhook(payload)
      case 'treatment_plan.proposed':
        return await this.handleTreatmentProposedWebhook(payload)
      case 'treatment_plan.accepted':
        return await this.handleTreatmentAcceptedWebhook(payload)
      case 'payment.received':
        return await this.handlePaymentWebhook(payload)
      case 'appointment.scheduled':
      case 'appointment.completed':
        return await this.handleAppointmentWebhook(payload)
      default:
        return {
          success: false,
          message: `Unknown event type: ${eventType}`
        }
    }
  }
}
```

## Telephony and Messaging
Twilio backs SMS sending, while click-to-call and voicemail processing route through Supabase Edge Functions.

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

```4:72:src/app/api/process-call-activity/route.ts
const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-call-activity`
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ activity_id })
})
```

## Email Delivery
Resend powers transactional and onboarding emails with helper methods for invitations, welcome flows, and password resets.

```1:172:src/lib/email-service.ts
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
  async sendInvitation(to: string, inviterName: string, practiceName: string, inviteLink: string, role: string) {
    const html = `<!DOCTYPE html> ...`
    return this.send({
      to,
      subject: `You're invited to join ${practiceName}`,
      html
    })
  }
}
```

## Subscription and Payments
Billing APIs expose plan metadata and seat usage for Stripe-backed subscriptions.

```1:40:src/app/api/billing/plans/route.ts
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const interval = url.searchParams.get('interval') as 'monthly' | 'yearly' | undefined
  const plans = await getAvailablePlans(interval)
  const plansWithEntitlements = await Promise.all(
    plans.map(async (plan) => {
      const entitlements = await getPlanEntitlements(plan.id)
      return {
        ...plan,
        entitlements,
      }
    })
  )
  return NextResponse.json({
    plans: plansWithEntitlements,
  })
}
```

```12:157:src/lib/services/billing-service.ts
export async function getSubscription(tenantId: string): Promise<SubscriptionInfo | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tenant_id,
      dental_group_id,
      status,
      seat_limit,
      active_seats,
      current_period_start,
      current_period_end,
      trial_end,
      cancel_at_period_end,
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
  // ... existing code ...
}
```

## AI & Automation Endpoints
The AI assistant endpoint wraps OpenAI usage, while automation listeners expose an internal API for event-to-workflow translation.

```6:92:src/app/api/ai-assistant/chat/route.ts
const systemPrompt = buildSystemPrompt(aiContext)
const contextSummary = buildContextSummary(aiContext)
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: aiMessages,
  temperature: 0.7,
  max_tokens: 1000
})
return NextResponse.json({
  response: aiResponse,
  suggestedActions,
  tokensUsed: completion.usage?.total_tokens,
  model: completion.model
})
```

```23:199:src/lib/automations/automation-event-listener.ts
const EVENT_TO_TRIGGER_MAP: Partial<Record<keyof EventMap, string>> = {
  'DEAL.CREATED': 'deal_created',
  'DEAL.AGING': 'deal_aging',
  'CONTACT.INACTIVE': 'contact_inactive',
  'AI.SUGGESTION_GENERATED': 'ai_suggestion',
  // ... existing code ...
}
const unsubscribe = eventService.on(
  eventType as keyof EventMap,
  async (data) => {
    await this.handleEvent(eventType as keyof EventMap, data)
  }
)
```

## Analytics & Alerts Integrations
Analytics threshold tables and anomaly detection functions power alerts that can be sent via email, in-app, or Slack webhooks.

```117:147:APPLY_ALL_MIGRATIONS.sql
CREATE TABLE IF NOT EXISTS analytics_threshold_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL,
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('above', 'below', 'between')),
  threshold_value DECIMAL(15, 2) NOT NULL,
  threshold_value_2 DECIMAL(15, 2),
  notification_channels TEXT[] DEFAULT ARRAY['email', 'in_app'],
  recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  slack_webhook_url TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_triggered_value DECIMAL(15, 2)
);
```

```44:195:src/lib/analytics/anomaly-detection.ts
export function detectAnomaliesZScore(data: DataPoint[]): Anomaly[] {
  if (absZScore > 1.5) {
    anomalies.push({
      date: point.date,
      value: point.value,
      expectedValue: mean,
      deviationPercentage,
      severity,
      method: 'z_score',
      explanation: zScore > 0
        ? `Value is ${absZScore.toFixed(1)} standard deviations ABOVE average (${severity} anomaly)`
        : `Value is ${absZScore.toFixed(1)} standard deviations BELOW average (${severity} anomaly)`
    })
  }
}

export function detectRateOfChangeAnomalies(data: DataPoint[]): Anomaly[] {
  if (Math.abs(changePercentage) > 50 || changePercentage < -30) {
    anomalies.push({
      date: current.date,
      value: current.value,
      expectedValue: previous.value,
      deviationPercentage: changePercentage,
      severity,
      method: 'rate_of_change',
      explanation: changePercentage > 0
        ? `Sudden ${changePercentage.toFixed(1)}% INCREASE from previous period`
        : `Sudden ${Math.abs(changePercentage).toFixed(1)}% DROP from previous period`
    })
  }
}
```

## Deployment Interfaces
Shell scripts provide CLI automation for Railway deployments, encapsulating environment setup and build pipelines.

```1:118:deploy-to-railway.sh
railway login
railway variables set NEXT_PUBLIC_SUPABASE_URL="$supabase_url"
railway up
echo -e "${GREEN}✅ Deployment initiated${NC}"
```

## Summary
By standardizing integrations around Supabase and Next.js route handlers, Dental CRM turns disparate systems—PMS, communications, billing, AI—into cohesive workflows. The carefully scoped APIs keep protected health information secure while giving receptionists the context they need to convert patients confidently.
