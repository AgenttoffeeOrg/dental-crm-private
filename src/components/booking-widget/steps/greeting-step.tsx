import * as React from 'react'
import { widgetStyles, type ThemeTokens } from '../styles'
import type { PublicWidgetConfig } from '../types'

interface Props {
  config: PublicWidgetConfig
  theme: ThemeTokens
  onNext: () => void
}

export function GreetingStep({ config, theme, onNext }: Props): React.ReactElement {
  const hasTreatments = config.treatments.length > 0
  const hasPaths = config.paths_enabled.length > 0
  return (
    <div data-step="greeting">
      <p style={widgetStyles.greeting}>
        {config.greeting_subtitle ||
          'Tell us a little about what you need and we’ll point you in the right direction.'}
      </p>
      {!hasTreatments && (
        <p style={{ ...widgetStyles.greeting, color: '#b91c1c' }}>
          This practice hasn’t configured any treatments yet.
        </p>
      )}
      {!hasPaths && (
        <p style={{ ...widgetStyles.greeting, color: '#b91c1c' }}>
          This widget hasn’t got any contact paths enabled.
        </p>
      )}
      <button
        type="button"
        style={widgetStyles.primaryButton(theme)}
        onClick={onNext}
        disabled={!hasTreatments || !hasPaths}
        aria-label="Get started"
      >
        Get started
      </button>
    </div>
  )
}
