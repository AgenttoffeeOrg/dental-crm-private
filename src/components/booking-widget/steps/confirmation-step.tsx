import * as React from 'react'
import { widgetStyles, type ThemeTokens } from '../styles'

interface Props {
  theme: ThemeTokens
  message: string | null
  redirectUrl?: string | null
  redirectLabel?: string
  onClose: () => void
}

export function ConfirmationStep({
  theme,
  message,
  redirectUrl,
  redirectLabel,
  onClose,
}: Props): React.ReactElement {
  return (
    <div data-step="success" style={widgetStyles.successWrap}>
      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: theme.primary,
          color: theme.primaryText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        ✓
      </div>
      <p style={{ ...widgetStyles.greeting, textAlign: 'center', margin: 0 }}>
        {message || 'Thanks — we’ll be in touch shortly.'}
      </p>
      {redirectUrl && (
        <a
          href={redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...widgetStyles.primaryButton(theme),
            display: 'inline-block',
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          {redirectLabel ?? 'Continue'}
        </a>
      )}
      <button
        type="button"
        style={{ ...widgetStyles.secondaryButton, marginTop: 8 }}
        onClick={onClose}
      >
        Close
      </button>
    </div>
  )
}
