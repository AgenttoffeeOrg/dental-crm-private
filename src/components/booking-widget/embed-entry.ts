/**
 * Vite widget bundle entry. Builds to public/widget-bundle.js as a UMD bundle
 * exposing `window.DentalCRMWidget.mount(container, config, apiBase)`.
 *
 * Bundle includes React + ReactDOM (no externals) so practices' websites
 * don't need to provide them.
 */

import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BookingWidget } from './booking-widget'
import type { PublicWidgetConfig } from './types'

const ROOTS = new WeakMap<Element | ShadowRoot, Root>()

function mount(target: ShadowRoot | Element, config: PublicWidgetConfig, apiBase: string): void {
  // The widget renders into a host element inside the shadow root so the
  // mounted React tree has its own container element (createRoot doesn't
  // accept a ShadowRoot directly in some legacy code paths).
  let mountPoint: Element
  if (target instanceof ShadowRoot) {
    let existing = target.querySelector('div[data-dcrm-mount]') as HTMLDivElement | null
    if (!existing) {
      existing = document.createElement('div')
      existing.setAttribute('data-dcrm-mount', '')
      target.appendChild(existing)
    }
    mountPoint = existing
  } else {
    mountPoint = target
  }

  let root = ROOTS.get(mountPoint)
  if (!root) {
    root = createRoot(mountPoint)
    ROOTS.set(mountPoint, root)
  }
  root.render(React.createElement(BookingWidget, { config, apiBase }))
}

function unmount(target: ShadowRoot | Element): void {
  const mountPoint =
    target instanceof ShadowRoot
      ? (target.querySelector('div[data-dcrm-mount]') as HTMLDivElement | null) ?? null
      : (target as Element)
  if (!mountPoint) return
  const root = ROOTS.get(mountPoint)
  if (root) {
    root.unmount()
    ROOTS.delete(mountPoint)
  }
}

declare global {
  interface Window {
    DentalCRMWidget?: {
      mount: typeof mount
      unmount: typeof unmount
    }
  }
}

if (typeof window !== 'undefined') {
  window.DentalCRMWidget = { mount, unmount }
}

export { mount, unmount }
