import { createServiceClient } from '@/lib/supabase-server'
import { dispatchEmail, dispatchSms, dispatchWhatsApp } from '@/lib/communications/dispatcher'
import { getOpenAIClient, isOpenAIConfigured } from '@/lib/openai-client'
import type {
  EngagementEnrollment,
  EngagementCampaign,
  EngagementStep,
  EngagementEnrollmentStatus,
  EngagementStepType,
} from '@/types/database'

type EnqueueFn = (enrollmentId: string, delayMs?: number) => Promise<void>

interface EnrollmentBundle {
  enrollment: EngagementEnrollment
  campaign: EngagementCampaign
  steps: EngagementStep[]
  contact: {
    id: string
    full_name?: string
    primary_email?: string
    primary_phone?: string
    tags?: string[]
  } | null
  deal: {
    id: string
    title?: string
    value_estimate_cents?: number
    stage_id?: string
  } | null
}

function sortSteps(steps: EngagementStep[]): EngagementStep[] {
  return [...steps].sort((a, b) => a.step_order - b.step_order)
}

function nextStep(current: EngagementStep | undefined, orderedSteps: EngagementStep[]): EngagementStep | undefined {
  if (!current) return orderedSteps[0]
  const currentIndex = orderedSteps.findIndex((step) => step.id === current.id)
  return orderedSteps[currentIndex + 1]
}

export class CampaignEngine {
  constructor(private readonly enqueueFn: EnqueueFn) {}

  async processEnrollment(enrollmentId: string): Promise<void> {
    const bundle = await this.loadEnrollmentBundle(enrollmentId)
    if (!bundle) {
      return
    }

    const { enrollment, steps } = bundle
    if (this.isTerminalStatus(enrollment.status)) {
      return
    }

    const orderedSteps = sortSteps(steps)
    const stepToExecute = this.resolveCurrentStep(enrollment, orderedSteps)

    if (!stepToExecute) {
      await this.completeEnrollment(enrollmentId)
      await this.logEvent(bundle, null, 'campaign.completed', 'completed', { reason: 'no_steps_remaining' })
      return
    }

    try {
      await this.executeStep(bundle, stepToExecute, orderedSteps)
    } catch (error) {
      const supabase = createServiceClient()
      await supabase
        .from('engagement_enrollments')
        .update({
          status: 'failed',
          last_error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId)

      await this.logEvent(bundle, stepToExecute, 'step.failed', 'failed', {
        message: error instanceof Error ? error.message : error,
      })

      throw error
    }
  }

  private async loadEnrollmentBundle(enrollmentId: string): Promise<EnrollmentBundle | null> {
    const supabase = createServiceClient()

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('engagement_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      console.error('[ENGAGEMENT] Enrollment not found', enrollmentError)
      return null
    }

    const [{ data: campaign }, { data: steps }, { data: contact }, { data: deal }] = await Promise.all([
      supabase.from('engagement_campaigns').select('*').eq('id', enrollment.campaign_id).single(),
      supabase.from('engagement_steps').select('*').eq('campaign_id', enrollment.campaign_id),
      enrollment.contact_id
        ? supabase
            .from('contacts')
            .select('id, full_name, primary_email, primary_phone, tags')
            .eq('id', enrollment.contact_id)
            .single()
        : Promise.resolve({ data: null } as any),
      enrollment.deal_id
        ? supabase
            .from('deals')
            .select('id, title, value_estimate_cents, stage_id')
            .eq('id', enrollment.deal_id)
            .single()
        : Promise.resolve({ data: null } as any),
    ])

    if (!campaign) {
      console.error('[ENGAGEMENT] Campaign not found for enrollment', enrollmentId)
      return null
    }

    return { enrollment, campaign, steps: steps || [], contact, deal }
  }

  private resolveCurrentStep(enrollment: EngagementEnrollment, steps: EngagementStep[]): EngagementStep | undefined {
    if (steps.length === 0) {
      return undefined
    }

    if (!enrollment.current_step_order || enrollment.current_step_order === 0) {
      return steps[0]
    }

    const current = steps.find((step) => step.step_order === enrollment.current_step_order)
    if (current) {
      return current
    }

    return steps.find((step) => step.step_order > enrollment.current_step_order)
  }

  private async executeStep(
    bundle: EnrollmentBundle,
    step: EngagementStep,
    orderedSteps: EngagementStep[]
  ): Promise<void> {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    let nextStepOrder: number | undefined
    let scheduleDelayMs = 0
    let nextStatus: EngagementEnrollmentStatus = 'active'

    switch (step.step_type) {
      case 'send_email':
        await this.runEmailStep(bundle, step)
        break
      case 'send_sms':
        await this.runSmsStep(bundle, step, false)
        break
      case 'send_whatsapp':
        await this.runSmsStep(bundle, step, true)
        break
      case 'wait': {
        const delaySeconds = step.wait_duration_seconds ?? Number(step.config?.wait_seconds ?? 0)
        scheduleDelayMs = Math.max(0, delaySeconds * 1000)
        nextStatus = 'waiting'
        await this.logEvent(bundle, step, 'step.wait_scheduled', 'queued', {
          wait_seconds: delaySeconds,
        })
        break
      }
      case 'ai_message':
        await this.runAiMessageStep(bundle, step)
        break
      case 'notify_human':
        await this.runNotifyHumanStep(bundle, step)
        break
      case 'webhook':
        await this.runWebhookStep(bundle, step)
        break
      case 'branch': {
        const branchTarget = this.evaluateBranch(bundle, step, orderedSteps)
        if (branchTarget) {
          nextStepOrder = branchTarget.step_order
          await this.logEvent(bundle, step, 'step.branch_routed', 'completed', {
            target_step_order: branchTarget.step_order,
          })
        } else {
          await this.logEvent(bundle, step, 'step.branch_no_match', 'completed', {})
        }
        break
      }
      default:
        await this.logEvent(bundle, step, 'step.unknown', 'failed', { type: step.step_type })
        throw new Error(`Unsupported step type: ${step.step_type}`)
    }

    const followUpStep =
      typeof nextStepOrder === 'number'
        ? orderedSteps.find((candidate) => candidate.step_order === nextStepOrder)
        : nextStep(step, orderedSteps)

    const updatePayload: Partial<EngagementEnrollment> & { updated_at: string; last_run_at: string } = {
      updated_at: now,
      last_run_at: now,
      last_error: null,
      status: nextStatus,
    }

    if (followUpStep) {
      updatePayload.current_step_order = followUpStep.step_order
    } else {
      updatePayload.current_step_order = step.step_order
    }

    if (nextStatus === 'waiting' && scheduleDelayMs > 0) {
      updatePayload.next_run_at = new Date(Date.now() + scheduleDelayMs).toISOString()
    } else {
      updatePayload.next_run_at = null
    }

    if (!followUpStep) {
      updatePayload.status = 'completed'
    }

    await supabase.from('engagement_enrollments').update(updatePayload).eq('id', bundle.enrollment.id)

    if (followUpStep && updatePayload.status !== 'completed') {
      await this.enqueueFn(bundle.enrollment.id, scheduleDelayMs)
    } else if (!followUpStep) {
      await this.logEvent(bundle, step, 'campaign.completed', 'completed', { reason: 'steps_exhausted' })
    }
  }

  private async runEmailStep(bundle: EnrollmentBundle, step: EngagementStep): Promise<void> {
    if (!bundle.contact?.primary_email) {
      await this.logEvent(bundle, step, 'step.email_skipped', 'failed', { reason: 'missing_email' })
      throw new Error('Contact missing email address')
    }

    const subject = step.config?.subject ?? 'Dental Sales Coach Update'
    const html = step.config?.html || step.config?.content || '<p>Hello from Dental Sales Coach</p>'

    const result = await dispatchEmail({
      context: {
        tenantId: bundle.enrollment.tenant_id,
        userId: step.config?.user_id,
        contactId: bundle.contact.id,
        dealId: bundle.deal?.id ?? null,
      },
      to: [bundle.contact.primary_email],
      subject,
      html,
    })

    await this.logEvent(bundle, step, 'step.email_sent', 'completed', {
      external_id: result.externalId,
      status: result.status,
    })
  }

  private async runSmsStep(bundle: EnrollmentBundle, step: EngagementStep, isWhatsApp: boolean): Promise<void> {
    const phone = bundle.contact?.primary_phone
    if (!phone) {
      await this.logEvent(bundle, step, 'step.message_skipped', 'failed', { reason: 'missing_phone' })
      throw new Error('Contact missing phone number')
    }

    const message = step.config?.message || step.config?.content || 'Hello from Dental Sales Coach.'

    if (isWhatsApp) {
      const result = await dispatchWhatsApp({
        context: {
          tenantId: bundle.enrollment.tenant_id,
          userId: step.config?.user_id,
          contactId: bundle.contact?.id ?? null,
          dealId: bundle.deal?.id ?? null,
        },
        to: phone,
        message,
        mediaUrl: step.config?.media_url,
      })
      await this.logEvent(bundle, step, 'step.whatsapp_sent', 'completed', {
        external_id: result.externalId,
        status: result.status,
      })
    } else {
      const result = await dispatchSms({
        context: {
          tenantId: bundle.enrollment.tenant_id,
          userId: step.config?.user_id,
          contactId: bundle.contact?.id ?? null,
          dealId: bundle.deal?.id ?? null,
        },
        to: phone,
        message,
      })
      await this.logEvent(bundle, step, 'step.sms_sent', 'completed', {
        external_id: result.externalId,
        status: result.status,
      })
    }
  }

  private async runAiMessageStep(bundle: EnrollmentBundle, step: EngagementStep): Promise<void> {
    if (!isOpenAIConfigured()) {
      await this.logEvent(bundle, step, 'step.ai_skipped', 'failed', { reason: 'openai_not_configured' })
      throw new Error('OpenAI not configured')
    }

    const openai = getOpenAIClient()
    const prompt =
      step.ai_prompt ||
      step.config?.prompt ||
      `Nurture the lead for campaign ${bundle.campaign.name}. Respond warmly and offer assistance.`

    const contactName = bundle.contact?.full_name || 'there'
    const channel = step.config?.channel || 'sms'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an empathetic dental practice assistant. Keep responses concise (<= 120 words) and actionable.',
        },
        {
          role: 'user',
          content: `${prompt}\nContact name: ${contactName}\nKnown tags: ${(bundle.contact?.tags || []).join(', ')}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 300,
    })

    const aiMessage = completion.choices[0]?.message?.content?.trim()
    if (!aiMessage) {
      throw new Error('AI did not return a message')
    }

    if (channel === 'email') {
      await this.runEmailStep(bundle, {
        ...step,
        step_type: 'send_email' as EngagementStepType,
        config: {
          ...(step.config || {}),
          subject: step.config?.subject || `Regarding ${bundle.campaign.name}`,
          html: `<p>${aiMessage}</p>`,
        },
      })
    } else if (channel === 'whatsapp') {
      await this.runSmsStep(
        bundle,
        { ...step, step_type: 'send_whatsapp' as EngagementStepType, config: { ...(step.config || {}), message: aiMessage } },
        true
      )
    } else {
      await this.runSmsStep(
        bundle,
        { ...step, step_type: 'send_sms' as EngagementStepType, config: { ...(step.config || {}), message: aiMessage } },
        false
      )
    }

    await this.logEvent(bundle, step, 'step.ai_message_generated', 'completed', {
      channel,
      tokens_used: completion.usage?.total_tokens,
    })
  }

  private async runNotifyHumanStep(bundle: EnrollmentBundle, step: EngagementStep): Promise<void> {
    const supabase = createServiceClient()
    const note = step.config?.note || 'Follow up with this contact regarding campaign engagement.'

    await supabase.from('activities').insert({
      tenant_id: bundle.enrollment.tenant_id,
      contact_id: bundle.contact?.id ?? null,
      deal_id: bundle.deal?.id ?? null,
      type: 'note',
      subject: step.config?.subject || `Automation alert: ${bundle.campaign.name}`,
      description: note,
      metadata: {
        source: 'engagement_campaign',
        campaign_id: bundle.campaign.id,
        step_id: step.id,
      },
      created_at: new Date().toISOString(),
    })

    await this.logEvent(bundle, step, 'step.notify_human_created', 'completed', {})
  }

  private async runWebhookStep(bundle: EnrollmentBundle, step: EngagementStep): Promise<void> {
    const endpoint = step.config?.url
    if (!endpoint) {
      await this.logEvent(bundle, step, 'step.webhook_skipped', 'failed', { reason: 'missing_url' })
      throw new Error('Webhook step missing URL')
    }

    const payload = {
      campaignId: bundle.campaign.id,
      enrollmentId: bundle.enrollment.id,
      contactId: bundle.contact?.id,
      dealId: bundle.deal?.id,
      context: bundle.enrollment.context,
      metadata: step.config?.payload || {},
    }

    const response = await fetch(endpoint, {
      method: step.config?.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(step.config?.headers || {}),
      },
      body: JSON.stringify(payload),
    })

    await this.logEvent(bundle, step, 'step.webhook_invoked', response.ok ? 'completed' : 'failed', {
      status: response.status,
    })

    if (!response.ok && step.config?.fail_on_error !== false) {
      throw new Error(`Webhook call failed with status ${response.status}`)
    }
  }

  private evaluateBranch(
    bundle: EnrollmentBundle,
    step: EngagementStep,
    orderedSteps: EngagementStep[]
  ): EngagementStep | undefined {
    const branchConfig = step.branch_conditions || step.config?.branch_conditions
    if (!branchConfig) {
      return undefined
    }

    const context = bundle.enrollment.context || {}

    if (Array.isArray(branchConfig?.rules)) {
      for (const rule of branchConfig.rules) {
        const value = context[rule.field]
        if (this.evaluateCondition(value, rule.operator, rule.value)) {
          return orderedSteps.find((candidate) => candidate.step_order === rule.target_step_order)
        }
      }
    } else if (branchConfig?.condition) {
      const value = context[branchConfig.condition.field]
      const matches = this.evaluateCondition(value, branchConfig.condition.operator, branchConfig.condition.value)
      const targetOrder = matches ? branchConfig.on_true : branchConfig.on_false
      if (typeof targetOrder === 'number') {
        return orderedSteps.find((candidate) => candidate.step_order === targetOrder)
      }
    }

    return undefined
  }

  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expected
      case 'not_equals':
        return value !== expected
      case 'includes':
        return Array.isArray(value) ? value.includes(expected) : String(value ?? '').includes(String(expected ?? ''))
      case 'greater_than':
        return Number(value) > Number(expected)
      case 'less_than':
        return Number(value) < Number(expected)
      case 'exists':
        return value !== null && value !== undefined
      default:
        return false
    }
  }

  private async logEvent(
    bundle: EnrollmentBundle,
    step: EngagementStep | null,
    eventType: string,
    status: 'queued' | 'processing' | 'completed' | 'failed',
    payload: Record<string, any>
  ): Promise<void> {
    const supabase = createServiceClient()
    await supabase.from('engagement_events').insert({
      tenant_id: bundle.enrollment.tenant_id,
      campaign_id: bundle.campaign.id,
      enrollment_id: bundle.enrollment.id,
      step_id: step?.id ?? null,
      event_type: eventType,
      status,
      payload,
      error_message: status === 'failed' && payload?.message ? payload.message : null,
      created_at: new Date().toISOString(),
    })
  }

  private async completeEnrollment(enrollmentId: string): Promise<void> {
    const supabase = createServiceClient()
    await supabase
      .from('engagement_enrollments')
      .update({
        status: 'completed',
        next_run_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
  }

  private isTerminalStatus(status: EngagementEnrollmentStatus): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled'
  }
}







