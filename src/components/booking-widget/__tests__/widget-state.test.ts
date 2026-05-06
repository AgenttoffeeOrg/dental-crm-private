import { widgetReducer, type WidgetState } from '../widget-state'
import type { PublicTreatmentOption } from '../types'

const initial: WidgetState = {
  step: 'closed',
  treatment: null,
  path: null,
  errorMessage: null,
  successMessage: null,
  redirectUrl: null,
}

const treatment: PublicTreatmentOption = {
  offering_id: 'off-1',
  label: 'Whitening',
  category: 'cosmetic',
  treatment_key: 'whitening',
}

describe('widgetReducer', () => {
  it('OPEN moves to greeting and clears any prior error', () => {
    const next = widgetReducer(
      { ...initial, errorMessage: 'oops' },
      { type: 'OPEN' }
    )
    expect(next.step).toBe('greeting')
    expect(next.errorMessage).toBeNull()
  })

  it('CLOSE returns to closed and clears state', () => {
    const next = widgetReducer(
      { ...initial, step: 'webform_fill', treatment, path: 'webform' },
      { type: 'CLOSE' }
    )
    expect(next.step).toBe('closed')
    expect(next.treatment).toBeNull()
    expect(next.path).toBeNull()
  })

  it('PICK_TREATMENT advances to path_choose', () => {
    const next = widgetReducer(
      { ...initial, step: 'treatment_select' },
      { type: 'PICK_TREATMENT', treatment }
    )
    expect(next.step).toBe('path_choose')
    expect(next.treatment).toBe(treatment)
  })

  it('PICK_PATH webform → webform_fill', () => {
    const next = widgetReducer(
      { ...initial, step: 'path_choose' },
      { type: 'PICK_PATH', path: 'webform' }
    )
    expect(next.step).toBe('webform_fill')
    expect(next.path).toBe('webform')
  })

  it('PICK_PATH calendar → calendar_handoff', () => {
    const next = widgetReducer(
      { ...initial, step: 'path_choose' },
      { type: 'PICK_PATH', path: 'calendar' }
    )
    expect(next.step).toBe('calendar_handoff')
    expect(next.path).toBe('calendar')
  })

  it('PICK_PATH whatsapp → whatsapp_handoff', () => {
    const next = widgetReducer(
      { ...initial, step: 'path_choose' },
      { type: 'PICK_PATH', path: 'whatsapp' }
    )
    expect(next.step).toBe('whatsapp_handoff')
  })

  it('SUCCESS records the message and clears errors', () => {
    const next = widgetReducer(
      { ...initial, step: 'submitting', errorMessage: 'old' },
      { type: 'SUCCESS', message: 'Thanks!', redirectUrl: 'https://wa.me/1' }
    )
    expect(next.step).toBe('success')
    expect(next.successMessage).toBe('Thanks!')
    expect(next.redirectUrl).toBe('https://wa.me/1')
    expect(next.errorMessage).toBeNull()
  })

  it('ERROR captures the message', () => {
    const next = widgetReducer(initial, { type: 'ERROR', message: 'boom' })
    expect(next.step).toBe('error')
    expect(next.errorMessage).toBe('boom')
  })

  it('back transitions from each step are reversible', () => {
    let s: WidgetState = { ...initial, step: 'webform_fill' }
    s = widgetReducer(s, { type: 'BACK_TO_PATH' })
    expect(s.step).toBe('path_choose')
    s = widgetReducer(s, { type: 'BACK_TO_TREATMENT' })
    expect(s.step).toBe('treatment_select')
    s = widgetReducer(s, { type: 'BACK_TO_GREETING' })
    expect(s.step).toBe('greeting')
  })
})
