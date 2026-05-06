import * as React from 'react'
import { widgetStyles, type ThemeTokens } from '../styles'
import type { PublicWidgetConfig, WidgetPath } from '../types'

interface Props {
  config: PublicWidgetConfig
  theme: ThemeTokens
  treatmentLabel: string
  onPick: (path: WidgetPath) => void
  onBack: () => void
}

const ICONS: Record<WidgetPath, string> = {
  calendar: '📅',
  webform: '✉️',
  whatsapp: '💬',
}

export function PathStep({
  config,
  theme,
  treatmentLabel,
  onPick,
  onBack,
}: Props): React.ReactElement {
  const enabled = config.paths_enabled
  return (
    <div data-step="path_choose">
      <p style={widgetStyles.greeting}>
        How would you like to continue with <strong>{treatmentLabel}</strong>?
      </p>
      <div style={widgetStyles.pathButtonGroup}>
        {enabled.includes('calendar') && (
          <button
            type="button"
            style={widgetStyles.pathButton(theme)}
            onClick={() => onPick('calendar')}
            aria-label={config.calendar.button_label}
          >
            <span aria-hidden="true">{ICONS.calendar}</span>
            <span>{config.calendar.button_label}</span>
          </button>
        )}
        {enabled.includes('webform') && (
          <button
            type="button"
            style={widgetStyles.pathButton(theme)}
            onClick={() => onPick('webform')}
            aria-label={config.webform.button_label}
          >
            <span aria-hidden="true">{ICONS.webform}</span>
            <span>{config.webform.button_label}</span>
          </button>
        )}
        {enabled.includes('whatsapp') && (
          <button
            type="button"
            style={widgetStyles.pathButton(theme)}
            onClick={() => onPick('whatsapp')}
            aria-label={config.whatsapp.button_label}
          >
            <span aria-hidden="true">{ICONS.whatsapp}</span>
            <span>{config.whatsapp.button_label}</span>
          </button>
        )}
      </div>
      <button
        type="button"
        style={{ ...widgetStyles.secondaryButton, marginTop: 16 }}
        onClick={onBack}
      >
        Back
      </button>
    </div>
  )
}
