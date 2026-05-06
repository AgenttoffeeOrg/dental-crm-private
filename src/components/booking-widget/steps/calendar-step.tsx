import * as React from 'react'
import { widgetStyles, type ThemeTokens } from '../styles'
import type { PublicWidgetConfig } from '../types'

interface Props {
  config: PublicWidgetConfig
  theme: ThemeTokens
  treatmentLabel: string
  onConfirm: (contact: { full_name: string; email?: string; phone?: string }) => void
  onBack: () => void
  submitting?: boolean
}

const FIELD_DEFS = [
  { name: 'full_name', label: 'Your name', type: 'text' as const },
  { name: 'email', label: 'Email', type: 'email' as const },
  { name: 'phone', label: 'Phone', type: 'tel' as const },
]

export function CalendarStep({
  config,
  theme,
  treatmentLabel,
  onConfirm,
  onBack,
  submitting = false,
}: Props): React.ReactElement {
  const capture = config.calendar.capture
  const fieldsRequired = {
    full_name: capture.full_name,
    email: capture.email,
    phone: capture.phone,
  }
  const [values, setValues] = React.useState<Record<string, string>>({
    full_name: '',
    email: '',
    phone: '',
  })
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})

  const update = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string | undefined> = {}
    if (fieldsRequired.full_name && !values.full_name.trim()) errs.full_name = 'Required'
    if (fieldsRequired.email && !values.email.trim()) errs.email = 'Required'
    if (fieldsRequired.phone && !values.phone.trim()) errs.phone = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onConfirm({
      full_name: values.full_name.trim() || 'Calendar lead',
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
    })
  }

  return (
    <form data-step="calendar_handoff" onSubmit={submit} noValidate>
      <p style={widgetStyles.greeting}>
        Just a few details before we take you to the calendar for{' '}
        <strong>{treatmentLabel}</strong>:
      </p>
      {FIELD_DEFS.map((f) => {
        const required = fieldsRequired[f.name as keyof typeof fieldsRequired]
        if (!required && f.name !== 'full_name') return null
        const errorMsg = errors[f.name]
        return (
          <div key={f.name} style={widgetStyles.formField}>
            <label style={widgetStyles.label} htmlFor={`dcrm-cal-${f.name}`}>
              {f.label}
              {required ? ' *' : ''}
            </label>
            <input
              id={`dcrm-cal-${f.name}`}
              type={f.type}
              value={values[f.name]}
              onChange={(e) => update(f.name, e.target.value)}
              style={{ ...widgetStyles.input, ...(errorMsg ? widgetStyles.inputError : {}) }}
              aria-invalid={Boolean(errorMsg)}
            />
            {errorMsg && (
              <span role="alert" style={widgetStyles.errorText}>
                {errorMsg}
              </span>
            )}
          </div>
        )
      })}
      {config.calendar.consent_text && (
        <p style={{ ...widgetStyles.consentRow, marginBottom: 12 }}>
          {config.calendar.consent_text}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        style={{
          ...widgetStyles.primaryButton(theme),
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'Opening calendar…' : config.calendar.button_label}
      </button>
      <button
        type="button"
        style={{ ...widgetStyles.secondaryButton, marginTop: 12, width: '100%' }}
        onClick={onBack}
        disabled={submitting}
      >
        Back
      </button>
    </form>
  )
}
