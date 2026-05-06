/**
 * Phase 2a.3 — Inline-style helpers for the booking widget.
 *
 * The widget cannot rely on Tailwind or any global CSS because it mounts
 * into a Shadow DOM on third-party websites. Every visual we ship goes
 * through these helpers, which produce theme-aware React style objects.
 */

import type { CSSProperties } from 'react'

const SYSTEM_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export interface ThemeTokens {
  primary: string
  primaryText: string
  font: string
}

export function buildTheme(input: { primary?: string; primaryText?: string; font?: string | null }): ThemeTokens {
  return {
    primary: input.primary || '#0ea5e9',
    primaryText: input.primaryText || '#FFFFFF',
    font: input.font || SYSTEM_FONT,
  }
}

export const widgetStyles = {
  launcher(theme: ThemeTokens, position: 'bottom-right' | 'bottom-left'): CSSProperties {
    return {
      position: 'fixed',
      bottom: 24,
      right: position === 'bottom-right' ? 24 : 'auto',
      left: position === 'bottom-left' ? 24 : 'auto',
      zIndex: 2147483647,
      background: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: 9999,
      padding: '14px 22px',
      fontWeight: 600,
      fontSize: 15,
      fontFamily: theme.font,
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      lineHeight: 1.2,
    }
  },

  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2147483647,
  } as CSSProperties,

  modalContainer(theme: ThemeTokens): CSSProperties {
    return {
      width: '100%',
      maxWidth: 480,
      maxHeight: '92vh',
      background: '#fff',
      color: '#0f172a',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: theme.font,
      boxShadow: '0 -8px 32px rgba(15, 23, 42, 0.25)',
    }
  },

  inlineContainer(theme: ThemeTokens): CSSProperties {
    return {
      width: '100%',
      maxWidth: 560,
      margin: '0 auto',
      background: '#fff',
      color: '#0f172a',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: theme.font,
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
      border: '1px solid #e2e8f0',
    }
  },

  header(theme: ThemeTokens): CSSProperties {
    return {
      background: theme.primary,
      color: theme.primaryText,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.3,
  } as CSSProperties,

  headerSubtitle: {
    fontSize: 13,
    fontWeight: 400,
    margin: '4px 0 0 0',
    opacity: 0.9,
  } as CSSProperties,

  closeButton: {
    background: 'transparent',
    color: 'inherit',
    border: 'none',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 4,
    opacity: 0.8,
  } as CSSProperties,

  body: {
    padding: 24,
    overflowY: 'auto',
    flex: 1,
    background: '#fff',
  } as CSSProperties,

  greeting: {
    fontSize: 15,
    color: '#475569',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  } as CSSProperties,

  primaryButton(theme: ThemeTokens, fullWidth = true): CSSProperties {
    return {
      background: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: 10,
      padding: '12px 18px',
      fontWeight: 600,
      fontSize: 15,
      cursor: 'pointer',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'inherit',
      lineHeight: 1.3,
    }
  },

  secondaryButton: {
    background: 'transparent',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 16px',
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  treatmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  } as CSSProperties,

  treatmentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 14,
    color: '#0f172a',
    textAlign: 'left',
    fontFamily: 'inherit',
  } as CSSProperties,

  treatmentItemHover: {
    borderColor: '#94a3b8',
  } as CSSProperties,

  pathButtonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  } as CSSProperties,

  pathButton(theme: ThemeTokens): CSSProperties {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      border: `1.5px solid ${theme.primary}`,
      borderRadius: 12,
      background: '#f8fafc',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: 15,
      fontWeight: 600,
      color: '#0f172a',
      width: '100%',
      textAlign: 'left',
    }
  },

  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
  } as CSSProperties,

  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
  } as CSSProperties,

  input: {
    fontFamily: 'inherit',
    fontSize: 14,
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    width: '100%',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: '#fff',
  } as CSSProperties,

  inputError: {
    borderColor: '#ef4444',
  } as CSSProperties,

  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 4,
  } as CSSProperties,

  consentRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    margin: '4px 0 16px 0',
    fontSize: 13,
    color: '#475569',
  } as CSSProperties,

  footer: {
    padding: '12px 24px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#64748b',
  } as CSSProperties,

  successWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '16px 0',
  } as CSSProperties,

  spinner(theme: ThemeTokens): CSSProperties {
    return {
      width: 28,
      height: 28,
      border: `3px solid ${theme.primary}33`,
      borderTopColor: theme.primary,
      borderRadius: '50%',
      animation: 'dcrm-spin 0.8s linear infinite',
    }
  },
}

/** A tiny snippet of CSS we inject once (shadow-DOM safe) to drive the spinner animation. */
export const KEYFRAMES_CSS = `@keyframes dcrm-spin { to { transform: rotate(360deg); } }`
