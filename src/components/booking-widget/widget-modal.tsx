import * as React from 'react'
import { widgetStyles, type ThemeTokens } from './styles'

interface Props {
  title: string
  subtitle?: string | null
  theme: ThemeTokens
  inline?: boolean
  onClose: () => void
  children: React.ReactNode
  /** ID of the heading element so screen readers can label the modal. */
  labelledBy?: string
}

export function WidgetModal({
  title,
  subtitle,
  theme,
  inline = false,
  onClose,
  children,
  labelledBy = 'dcrm-widget-title',
}: Props): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (inline) return undefined
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    containerRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, inline])

  const containerStyle = inline
    ? widgetStyles.inlineContainer(theme)
    : widgetStyles.modalContainer(theme)

  const Wrapper: React.ElementType = inline ? 'div' : 'div'
  const wrapperProps = inline
    ? {}
    : {
        style: widgetStyles.modalBackdrop,
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': labelledBy,
        onClick: (e: React.MouseEvent) => {
          if (e.target === e.currentTarget) onClose()
        },
      }

  return (
    <Wrapper {...wrapperProps} data-component="dcrm-widget-modal">
      <div
        ref={containerRef}
        tabIndex={-1}
        style={containerStyle}
        role={inline ? undefined : 'document'}
      >
        <header style={widgetStyles.header(theme)}>
          <div>
            <h2 id={labelledBy} style={widgetStyles.headerTitle}>
              {title}
            </h2>
            {subtitle ? <p style={widgetStyles.headerSubtitle}>{subtitle}</p> : null}
          </div>
          {!inline && (
            <button
              type="button"
              style={widgetStyles.closeButton}
              onClick={onClose}
              aria-label="Close booking widget"
            >
              ✕
            </button>
          )}
        </header>
        <div style={widgetStyles.body}>{children}</div>
      </div>
    </Wrapper>
  )
}
