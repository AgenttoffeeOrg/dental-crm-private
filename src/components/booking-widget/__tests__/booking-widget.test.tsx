/**
 * Phase 2a.3 — React Testing Library scenarios for the booking widget.
 *
 * The widget API client is mocked (we don't want fetch in unit tests).
 * Each scenario corresponds to one of the planner's required cases.
 */

import * as React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BookingWidget } from '../booking-widget'
import type { PublicWidgetConfig } from '../types'

// --- Mock the API client so tests don't hit fetch ---
const startSession = jest.fn().mockResolvedValue({
  session_id: '00000000-0000-0000-0000-000000000001',
  session_token: 'tok',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  intent_path: 'webform',
})
const patchSession = jest.fn().mockResolvedValue(undefined)
const submit = jest.fn()

jest.mock('../widget-api-client', () => {
  const actual = jest.requireActual('../widget-api-client')
  return {
    ...actual,
    WidgetApiClient: jest.fn().mockImplementation(() => ({
      startSession,
      patchSession,
      submit,
    })),
  }
})

beforeEach(() => {
  startSession.mockClear()
  patchSession.mockClear()
  submit.mockReset()
  submit.mockResolvedValue({
    ok: true,
    contact_id: 'c-1',
    success_message: "Thanks — we'll be in touch shortly.",
  })
})

const baseConfig: PublicWidgetConfig = {
  widget_id: 'w-1',
  slug: 'acme-dental',
  practice_name: 'Acme Dental',
  greeting_title: 'How can we help?',
  greeting_subtitle: null,
  success_message: "Thanks — we'll be in touch shortly.",
  treatments: [
    { offering_id: 'off-1', label: 'Whitening', category: 'cosmetic', treatment_key: 'whitening' },
    { offering_id: 'off-2', label: 'Implants', category: 'restorative', treatment_key: 'implants' },
  ],
  paths_enabled: ['calendar', 'webform', 'whatsapp'],
  webform: {
    kind: 'inline',
    redirect_url: null,
    open_in_new_tab: false,
    button_label: 'Send',
    fields: [
      { name: 'full_name', label: 'Your name', required: true, type: 'text' },
      { name: 'email', label: 'Email', required: true, type: 'email' },
      { name: 'phone', label: 'Phone', required: true, type: 'tel' },
    ],
    consent_text: 'I agree',
    consent_required: true,
  },
  calendar: {
    redirect_url: 'https://calendly.example/acme',
    button_label: 'Book a slot',
    interstitial_message: null,
    interstitial_duration_ms: 1500,
    capture: { full_name: true, email: false, phone: true },
    consent_text: null,
  },
  whatsapp: {
    phone_e164: '447700900900',
    button_label: 'WhatsApp us',
    prefill_template: 'Hi, I want {treatment}.',
  },
  theme: {
    primary_color: '#0ea5e9',
    text_color: '#FFFFFF',
    logo_url: null,
    hero_image_url: null,
    font_family: null,
  },
  trigger: { mode: 'button', position: 'bottom-right', button_label: 'Book now' },
}

const renderWidget = (overrides?: Partial<PublicWidgetConfig>) => {
  const config = { ...baseConfig, ...overrides }
  return render(<BookingWidget config={config} apiBase="" />)
}

const openModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: /book now/i }))
  await waitFor(() => screen.getByRole('dialog'))
}

describe('<BookingWidget>', () => {
  it('renders the launcher button by default (closed state)', () => {
    renderWidget()
    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument()
  })

  it('opens the modal on launcher click and shows the greeting step', async () => {
    renderWidget()
    await openModal()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('walks through greeting → treatments → path choices', async () => {
    renderWidget()
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    expect(screen.getByText('Whitening')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    // path-choose step shows all three buttons
    expect(screen.getByRole('button', { name: /book a slot/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /whatsapp us/i })).toBeInTheDocument()
  })

  it('only renders enabled paths in path_choose', async () => {
    renderWidget({ paths_enabled: ['webform'] })
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /book a slot/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /whatsapp us/i })).not.toBeInTheDocument()
  })

  it('webform: validates required fields before submitting', async () => {
    renderWidget()
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    // Hit submit without filling
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(submit).not.toHaveBeenCalled()
  })

  it('webform: submit calls the API and shows success', async () => {
    renderWidget()
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Joe Bloggs' } })
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'joe@example.com' } })
    fireEvent.change(screen.getByLabelText(/^phone/i), { target: { value: '07700900900' } })
    fireEvent.click(screen.getByRole('checkbox'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    })

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit.mock.calls[0][1]).toMatchObject({
      path: 'webform',
      contact: { full_name: 'Joe Bloggs', email: 'joe@example.com', phone: '07700900900' },
      treatment_offering_id: 'off-1',
    })
    await waitFor(() =>
      expect(screen.getByText(/we'll be in touch shortly/i)).toBeInTheDocument()
    )
  })

  it('whatsapp path: returns wa.me redirect URL and shows the open button', async () => {
    submit.mockResolvedValueOnce({
      ok: true,
      contact_id: 'c-1',
      whatsapp_redirect: 'https://wa.me/447700900900?text=Hi',
      success_message: null,
    })
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

    renderWidget()
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    fireEvent.click(screen.getByRole('button', { name: /whatsapp us/i }))

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Jane' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /whatsapp us/i }))
    })

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit.mock.calls[0][1]).toMatchObject({
      path: 'whatsapp',
      contact: { full_name: 'Jane' },
    })
    expect(openSpy).toHaveBeenCalledWith(
      'https://wa.me/447700900900?text=Hi',
      '_blank',
      'noopener,noreferrer'
    )
    openSpy.mockRestore()
  })

  it('calendar path: returns calendar redirect and opens it', async () => {
    submit.mockResolvedValueOnce({
      ok: true,
      contact_id: 'c-1',
      calendar_redirect: 'https://calendly.example/acme',
      success_message: null,
    })
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

    renderWidget()
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    fireEvent.click(screen.getByRole('button', { name: /book a slot/i }))

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^phone/i), { target: { value: '07700900900' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /book a slot/i }))
    })

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit.mock.calls[0][1]).toMatchObject({ path: 'calendar' })
    expect(openSpy).toHaveBeenCalledWith(
      'https://calendly.example/acme',
      '_blank',
      'noopener,noreferrer'
    )
    openSpy.mockRestore()
  })

  it('ESC key closes the modal', async () => {
    renderWidget()
    await openModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('API failure on submit transitions to the error step', async () => {
    submit.mockRejectedValueOnce(new Error('network down'))
    renderWidget()
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('listitem', { name: /choose whitening/i }))
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Joe' } })
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'joe@example.com' } })
    fireEvent.change(screen.getByLabelText(/^phone/i), { target: { value: '07700900900' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    })
    await waitFor(() => expect(screen.getByText(/network down/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('trigger.mode = "auto" opens immediately on mount', () => {
    renderWidget({ trigger: { ...baseConfig.trigger, mode: 'auto' } })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('trigger.mode = "inline" renders inline (no dialog role)', () => {
    renderWidget({ trigger: { ...baseConfig.trigger, mode: 'inline' } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })
})
