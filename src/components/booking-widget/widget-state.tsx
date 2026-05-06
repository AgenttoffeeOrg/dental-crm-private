'use client'

/**
 * Phase 2a.3 — Booking widget state machine.
 *
 * A compact useReducer-based machine. Linear, with explicit "back" for
 * every step. The widget composes well-known transitions; we don't need
 * a full xstate setup yet.
 */

import { useReducer } from 'react'
import type { PublicTreatmentOption, WidgetPath } from './types'

export type WidgetStep =
  | 'closed'
  | 'greeting'
  | 'treatment_select'
  | 'path_choose'
  | 'webform_fill'
  | 'calendar_handoff'
  | 'whatsapp_handoff'
  | 'submitting'
  | 'success'
  | 'error'

export interface WidgetState {
  step: WidgetStep
  treatment: PublicTreatmentOption | null
  path: WidgetPath | null
  errorMessage: string | null
  successMessage: string | null
  redirectUrl: string | null
}

export type WidgetAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'NEXT_FROM_GREETING' }
  | { type: 'PICK_TREATMENT'; treatment: PublicTreatmentOption }
  | { type: 'BACK_TO_GREETING' }
  | { type: 'BACK_TO_TREATMENT' }
  | { type: 'BACK_TO_PATH' }
  | { type: 'PICK_PATH'; path: WidgetPath }
  | { type: 'SUBMITTING' }
  | { type: 'SUCCESS'; message: string | null; redirectUrl?: string | null }
  | { type: 'ERROR'; message: string }

const INITIAL: WidgetState = {
  step: 'closed',
  treatment: null,
  path: null,
  errorMessage: null,
  successMessage: null,
  redirectUrl: null,
}

export function widgetReducer(state: WidgetState, action: WidgetAction): WidgetState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, step: 'greeting', errorMessage: null }
    case 'CLOSE':
      return { ...INITIAL, step: 'closed' }
    case 'NEXT_FROM_GREETING':
      return { ...state, step: 'treatment_select' }
    case 'PICK_TREATMENT':
      return { ...state, step: 'path_choose', treatment: action.treatment }
    case 'BACK_TO_GREETING':
      return { ...state, step: 'greeting' }
    case 'BACK_TO_TREATMENT':
      return { ...state, step: 'treatment_select' }
    case 'BACK_TO_PATH':
      return { ...state, step: 'path_choose' }
    case 'PICK_PATH': {
      const next: WidgetStep =
        action.path === 'webform'
          ? 'webform_fill'
          : action.path === 'calendar'
            ? 'calendar_handoff'
            : 'whatsapp_handoff'
      return { ...state, path: action.path, step: next }
    }
    case 'SUBMITTING':
      return { ...state, step: 'submitting', errorMessage: null }
    case 'SUCCESS':
      return {
        ...state,
        step: 'success',
        successMessage: action.message,
        redirectUrl: action.redirectUrl ?? null,
        errorMessage: null,
      }
    case 'ERROR':
      return { ...state, step: 'error', errorMessage: action.message }
    default:
      return state
  }
}

export function useWidgetState(initialStep: WidgetStep = 'closed'): {
  state: WidgetState
  dispatch: React.Dispatch<WidgetAction>
} {
  const [state, dispatch] = useReducer(widgetReducer, { ...INITIAL, step: initialStep })
  return { state, dispatch }
}
