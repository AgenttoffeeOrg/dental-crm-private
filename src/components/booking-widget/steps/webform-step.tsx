import * as React from 'react'
import { widgetStyles, type ThemeTokens } from '../styles'
import type { PublicWidgetConfig, WebformField } from '../types'

interface Props {
  config: PublicWidgetConfig
  theme: ThemeTokens
  onSubmit: (values: Record<string, string>, consent: boolean) => void
  onBack: () => void
  submitting?: boolean
}

interface FieldErrors {
  [fieldName: string]: string | undefined
}

function defaultInputType(field: WebformField): string {
  if (field.type === 'textarea') return 'textarea'
  if (field.type) return field.type
  if (field.name.includes('email')) return 'email'
  if (field.name.includes('phone')) return 'tel'
  return 'text'
}

function validate(fields: WebformField[], values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {}
  for (const f of fields) {
    const v = (values[f.name] ?? '').trim()
    if (f.required && !v) {
      errors[f.name] = `${f.label} is required`
      continue
    }
    if (!v) continue
    const type = defaultInputType(f)
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      errors[f.name] = 'Please enter a valid email address'
    }
    if (type === 'tel' && v.replace(/[^0-9]/g, '').length < 7) {
      errors[f.name] = 'Please enter a valid phone number'
    }
  }
  return errors
}

export function WebformStep({
  config,
  theme,
  onSubmit,
  onBack,
  submitting = false,
}: Props): React.ReactElement {
  const fields = config.webform.fields
  const consentRequired = Boolean(config.webform.consent_required && config.webform.consent_text)
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, '']))
  )
  const [consent, setConsent] = React.useState(false)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [consentError, setConsentError] = React.useState<string | null>(null)

  const updateValue = (name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fieldErrors = validate(fields, values)
    let ok = Object.keys(fieldErrors).length === 0
    if (consentRequired && !consent) {
      setConsentError('Please accept to continue.')
      ok = false
    } else {
      setConsentError(null)
    }
    setErrors(fieldErrors)
    if (!ok) return
    onSubmit(values, consent || !consentRequired)
  }

  return (
    <form data-step="webform_fill" onSubmit={handleSubmit} noValidate>
      {fields.map((f) => {
        const type = defaultInputType(f)
        const id = `dcrm-field-${f.name}`
        const errorMsg = errors[f.name]
        return (
          <div key={f.name} style={widgetStyles.formField}>
            <label htmlFor={id} style={widgetStyles.label}>
              {f.label}
              {f.required ? ' *' : ''}
            </label>
            {type === 'textarea' ? (
              <textarea
                id={id}
                name={f.name}
                placeholder={f.placeholder}
                value={values[f.name] ?? ''}
                onChange={(e) => updateValue(f.name, e.target.value)}
                style={{
                  ...widgetStyles.input,
                  minHeight: 80,
                  resize: 'vertical',
                  ...(errorMsg ? widgetStyles.inputError : {}),
                }}
                aria-invalid={Boolean(errorMsg)}
              />
            ) : (
              <input
                id={id}
                type={type}
                name={f.name}
                placeholder={f.placeholder}
                value={values[f.name] ?? ''}
                onChange={(e) => updateValue(f.name, e.target.value)}
                style={{
                  ...widgetStyles.input,
                  ...(errorMsg ? widgetStyles.inputError : {}),
                }}
                aria-invalid={Boolean(errorMsg)}
              />
            )}
            {errorMsg && (
              <span role="alert" style={widgetStyles.errorText}>
                {errorMsg}
              </span>
            )}
          </div>
        )
      })}

      {consentRequired && (
        <label style={widgetStyles.consentRow}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              if (e.target.checked) setConsentError(null)
            }}
            aria-invalid={Boolean(consentError)}
          />
          <span>{config.webform.consent_text}</span>
        </label>
      )}
      {consentError && (
        <div role="alert" style={widgetStyles.errorText}>
          {consentError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          ...widgetStyles.primaryButton(theme),
          opacity: submitting ? 0.7 : 1,
          cursor: submitting ? 'progress' : 'pointer',
        }}
        aria-label={config.webform.button_label}
      >
        {submitting ? 'Sending…' : config.webform.button_label}
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
