import * as React from 'react'
import { widgetStyles, type ThemeTokens } from './styles'

interface Props {
  label: string
  position: 'bottom-right' | 'bottom-left'
  theme: ThemeTokens
  onClick: () => void
}

export function WidgetLauncher({ label, position, theme, onClick }: Props): React.ReactElement {
  return (
    <button
      type="button"
      style={widgetStyles.launcher(theme, position)}
      onClick={onClick}
      aria-label={label}
      data-component="dcrm-widget-launcher"
    >
      💬 {label}
    </button>
  )
}
