'use client'

/**
 * Phase 2a.3 — <BookingWidget /> entry component.
 *
 * Self-contained, mountable into a Shadow DOM (embed loader) or directly
 * into the React tree (CRM-hosted /w/[slug] landing page, settings preview).
 *
 * Props:
 *   config:        a PublicWidgetConfig (exactly what /api/widget/config returns)
 *   apiBase:       origin of the CRM API (empty string = same origin)
 *   onSubmitted?:  optional callback for parent (used by the settings preview)
 */

import * as React from 'react'
import {
  WidgetApiClient,
  readAttributionFromUrl,
  type StartSessionResponse,
} from './widget-api-client'
import { useWidgetState, type WidgetState } from './widget-state'
import { WidgetLauncher } from './widget-launcher'
import { WidgetModal } from './widget-modal'
import { GreetingStep } from './steps/greeting-step'
import { TreatmentStep } from './steps/treatment-step'
import { PathStep } from './steps/path-step'
import { WebformStep } from './steps/webform-step'
import { CalendarStep } from './steps/calendar-step'
import { WhatsappStep } from './steps/whatsapp-step'
import { ConfirmationStep } from './steps/confirmation-step'
import { buildTheme, KEYFRAMES_CSS, widgetStyles } from './styles'
import type { PublicWidgetConfig, WidgetPath } from './types'

interface Props {
  config: PublicWidgetConfig
  apiBase?: string
  /** Hook for parent (settings preview, tests). Called after a successful submit. */
  onSubmitted?: (info: {
    path: WidgetPath
    contact_id: string | null | undefined
    redirectUrl: string | null
  }) => void
  /** Disable the network calls. Used by the live admin preview. */
  previewMode?: boolean
}

const ABANDON_KEY: Record<string, string> = {
  greeting: 'greeting',
  treatment_select: 'treatment_select',
  path_choose: 'path_choose',
  webform_fill: 'webform_fill',
  calendar_handoff: 'calendar_handoff',
  whatsapp_handoff: 'whatsapp_handoff',
}

export function BookingWidget({
  config,
  apiBase = '',
  onSubmitted,
  previewMode = false,
}: Props): React.ReactElement | null {
  const initialStep =
    config.trigger.mode === 'auto'
      ? 'greeting'
      : config.trigger.mode === 'inline'
        ? 'greeting'
        : 'closed'
  const { state, dispatch } = useWidgetState(initialStep)

  const theme = React.useMemo(
    () =>
      buildTheme({
        primary: config.theme.primary_color,
        primaryText: config.theme.text_color,
        font: config.theme.font_family ?? null,
      }),
    [config.theme.primary_color, config.theme.text_color, config.theme.font_family]
  )

  const apiRef = React.useRef<WidgetApiClient | null>(null)
  if (!apiRef.current) apiRef.current = new WidgetApiClient({ apiBase })

  const sessionRef = React.useRef<StartSessionResponse | null>(null)
  const startedRef = React.useRef(false)

  const ensureSession = React.useCallback(async () => {
    if (previewMode) return null
    if (sessionRef.current) return sessionRef.current
    if (startedRef.current) return sessionRef.current
    startedRef.current = true
    try {
      const attribution = readAttributionFromUrl(
        typeof window !== 'undefined' ? window.location.href : 'about:blank'
      )
      const session = await apiRef.current!.startSession({
        widget_slug: config.slug,
        ...attribution,
      })
      sessionRef.current = session
      return session
    } catch (err) {
      console.warn('[BookingWidget] startSession failed; degrading gracefully:', err)
      return null
    }
  }, [config.slug, previewMode])

  // Open behaviour: ensure a session exists once the user shows intent
  React.useEffect(() => {
    if (state.step !== 'closed') {
      void ensureSession()
    }
  }, [state.step, ensureSession])

  const reportAbandon = React.useCallback(
    (currentStep: string) => {
      const session = sessionRef.current
      if (!session || previewMode) return
      const key = ABANDON_KEY[currentStep]
      if (!key || key === 'greeting') return
      void apiRef.current!.patchSession(session.session_id, {
        abandoned_step: key,
      })
    },
    [previewMode]
  )

  const handleClose = () => {
    reportAbandon(state.step)
    dispatch({ type: 'CLOSE' })
  }

  const handlePickTreatment = (t: PublicWidgetConfig['treatments'][number]) => {
    dispatch({ type: 'PICK_TREATMENT', treatment: t })
    const session = sessionRef.current
    if (session && !previewMode) {
      void apiRef.current!.patchSession(session.session_id, {
        treatment_offering_id: t.offering_id,
      })
    }
  }

  const handlePickPath = (path: WidgetPath) => {
    dispatch({ type: 'PICK_PATH', path })
    const session = sessionRef.current
    if (session && !previewMode) {
      void apiRef.current!.patchSession(session.session_id, { path_chosen: path })
    }
  }

  const submitWith = async (
    path: WidgetPath,
    contact: { full_name: string; email?: string; phone?: string },
    consents?: { marketing_consent?: boolean; email_consent?: boolean; sms_consent?: boolean },
    extraFields?: Record<string, string>
  ) => {
    if (previewMode) {
      dispatch({
        type: 'SUCCESS',
        message: config.success_message,
        redirectUrl: null,
      })
      onSubmitted?.({ path, contact_id: null, redirectUrl: null })
      return
    }

    dispatch({ type: 'SUBMITTING' })
    try {
      const session = await ensureSession()
      if (!session) throw new Error('Could not start session')
      const result = await apiRef.current!.submit(session.session_id, {
        path,
        treatment_offering_id: state.treatment?.offering_id,
        contact: {
          full_name: contact.full_name,
          email: contact.email,
          phone: contact.phone,
          consents,
          extra_fields: extraFields,
        },
      })

      const redirectUrl =
        result.whatsapp_redirect ?? result.calendar_redirect ?? null
      const message = result.success_message ?? config.success_message

      dispatch({ type: 'SUCCESS', message, redirectUrl })
      onSubmitted?.({ path, contact_id: result.contact_id, redirectUrl })

      // Auto-redirect for WhatsApp / Calendar paths after a brief moment
      if (redirectUrl && typeof window !== 'undefined') {
        const newWindow = window.open(redirectUrl, '_blank', 'noopener,noreferrer')
        if (!newWindow) {
          // Popup blocked — leave the success step's CTA button as the fallback.
          console.warn('[BookingWidget] popup blocked; user can click the manual redirect button')
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      dispatch({ type: 'ERROR', message: msg })
    }
  }

  // --- Render ---

  if (state.step === 'closed') {
    if (config.trigger.mode === 'manual') return null
    return (
      <WidgetLauncher
        label={config.trigger.button_label}
        position={config.trigger.position}
        theme={theme}
        onClick={() => dispatch({ type: 'OPEN' })}
      />
    )
  }

  const inline = config.trigger.mode === 'inline'

  const treatmentLabel = state.treatment?.label ?? 'your enquiry'
  const submitting = state.step === 'submitting'

  const stepContent = renderStep({
    state,
    config,
    theme,
    submitting,
    treatmentLabel,
    onClose: handleClose,
    onNext: () => dispatch({ type: 'NEXT_FROM_GREETING' }),
    onPickTreatment: handlePickTreatment,
    onPickPath: handlePickPath,
    onBackTo: (target) => {
      switch (target) {
        case 'greeting':
          dispatch({ type: 'BACK_TO_GREETING' })
          break
        case 'treatment_select':
          dispatch({ type: 'BACK_TO_TREATMENT' })
          break
        case 'path_choose':
          dispatch({ type: 'BACK_TO_PATH' })
          break
      }
    },
    onWebformSubmit: (values, consent) => {
      const { full_name, email, phone, ...extra } = values
      void submitWith(
        'webform',
        { full_name: full_name || extra['name'] || 'Web lead', email, phone },
        config.webform.consent_required ? { marketing_consent: consent } : undefined,
        Object.fromEntries(Object.entries(extra).filter(([k]) => !['full_name', 'email', 'phone'].includes(k)))
      )
    },
    onCalendarConfirm: (contact) => {
      void submitWith('calendar', contact)
    },
    onWhatsappConfirm: (contact) => {
      void submitWith('whatsapp', contact)
    },
    onRetry: () =>
      dispatch({
        type: state.path === 'webform' ? 'PICK_PATH' : 'PICK_PATH',
        path: state.path ?? 'webform',
      }),
  })

  return (
    <>
      <style>{KEYFRAMES_CSS}</style>
      <WidgetModal
        title={config.greeting_title}
        subtitle={
          state.step === 'greeting'
            ? config.greeting_subtitle ?? null
            : state.treatment?.label ?? null
        }
        theme={theme}
        inline={inline}
        onClose={handleClose}
      >
        {stepContent}
      </WidgetModal>
    </>
  )
}

interface RenderStepArgs {
  state: WidgetState
  config: PublicWidgetConfig
  theme: ReturnType<typeof buildTheme>
  submitting: boolean
  treatmentLabel: string
  onClose: () => void
  onNext: () => void
  onPickTreatment: (t: PublicWidgetConfig['treatments'][number]) => void
  onPickPath: (p: WidgetPath) => void
  onBackTo: (target: 'greeting' | 'treatment_select' | 'path_choose') => void
  onWebformSubmit: (values: Record<string, string>, consent: boolean) => void
  onCalendarConfirm: (c: { full_name: string; email?: string; phone?: string }) => void
  onWhatsappConfirm: (c: { full_name: string; phone?: string }) => void
  onRetry: () => void
}

function renderStep(args: RenderStepArgs): React.ReactNode {
  const {
    state,
    config,
    theme,
    submitting,
    treatmentLabel,
    onClose,
    onNext,
    onPickTreatment,
    onPickPath,
    onBackTo,
    onWebformSubmit,
    onCalendarConfirm,
    onWhatsappConfirm,
    onRetry,
  } = args

  switch (state.step) {
    case 'greeting':
      return <GreetingStep config={config} theme={theme} onNext={onNext} />
    case 'treatment_select':
      return (
        <TreatmentStep
          treatments={config.treatments}
          onPick={onPickTreatment}
          onBack={() => onBackTo('greeting')}
        />
      )
    case 'path_choose':
      return (
        <PathStep
          config={config}
          theme={theme}
          treatmentLabel={treatmentLabel}
          onPick={onPickPath}
          onBack={() => onBackTo('treatment_select')}
        />
      )
    case 'webform_fill':
      return (
        <WebformStep
          config={config}
          theme={theme}
          submitting={submitting}
          onSubmit={onWebformSubmit}
          onBack={() => onBackTo('path_choose')}
        />
      )
    case 'calendar_handoff':
      return (
        <CalendarStep
          config={config}
          theme={theme}
          treatmentLabel={treatmentLabel}
          submitting={submitting}
          onConfirm={onCalendarConfirm}
          onBack={() => onBackTo('path_choose')}
        />
      )
    case 'whatsapp_handoff':
      return (
        <WhatsappStep
          config={config}
          theme={theme}
          treatmentLabel={treatmentLabel}
          submitting={submitting}
          onConfirm={onWhatsappConfirm}
          onBack={() => onBackTo('path_choose')}
        />
      )
    case 'submitting':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div aria-label="Sending" style={widgetStyles.spinner(theme)} />
        </div>
      )
    case 'success':
      return (
        <ConfirmationStep
          theme={theme}
          message={state.successMessage}
          redirectUrl={state.redirectUrl}
          redirectLabel={
            state.path === 'whatsapp'
              ? 'Open WhatsApp'
              : state.path === 'calendar'
                ? 'Open calendar'
                : 'Continue'
          }
          onClose={onClose}
        />
      )
    case 'error':
      return (
        <div data-step="error">
          <p style={{ ...widgetStyles.greeting, color: '#b91c1c' }}>
            {state.errorMessage ?? 'Something went wrong.'}
          </p>
          <button
            type="button"
            style={widgetStyles.primaryButton(theme)}
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      )
    default:
      return null
  }
}
