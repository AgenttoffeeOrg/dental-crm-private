import * as React from 'react'
import { widgetStyles, type ThemeTokens } from '../styles'
import type { PublicWidgetConfig } from '../types'

interface Props {
  config: PublicWidgetConfig
  theme: ThemeTokens
  treatmentLabel: string
  onConfirm: (contact: { full_name: string; phone?: string }) => void
  onBack: () => void
  submitting?: boolean
}

export function WhatsappStep({
  config,
  theme,
  treatmentLabel,
  onConfirm,
  onBack,
  submitting = false,
}: Props): React.ReactElement {
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please tell us your name first.')
      return
    }
    setError(null)
    onConfirm({
      full_name: name.trim(),
      phone: phone.trim() || undefined,
    })
  }

  return (
    <form data-step="whatsapp_handoff" onSubmit={submit} noValidate>
      <p style={widgetStyles.greeting}>
        We’ll open WhatsApp with a message about <strong>{treatmentLabel}</strong> ready to send.
      </p>
      <div style={widgetStyles.formField}>
        <label style={widgetStyles.label} htmlFor="dcrm-wa-name">
          Your name *
        </label>
        <input
          id="dcrm-wa-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...widgetStyles.input, ...(error ? widgetStyles.inputError : {}) }}
        />
      </div>
      <div style={widgetStyles.formField}>
        <label style={widgetStyles.label} htmlFor="dcrm-wa-phone">
          Your phone (optional, helps us call you back)
        </label>
        <input
          id="dcrm-wa-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={widgetStyles.input}
        />
      </div>
      {error && (
        <div role="alert" style={widgetStyles.errorText}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        style={{ ...widgetStyles.primaryButton(theme), opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? 'Opening WhatsApp…' : config.whatsapp.button_label}
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
